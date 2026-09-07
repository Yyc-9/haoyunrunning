-- Review/deploy separately from the application change.
--
-- Every transition locks the assignment row for the duration of the state
-- change.  This closes the check-in/substitution TOCTOU window that exists
-- when a route reads an assignment and writes it in a later request.
-- The function is intentionally SECURITY INVOKER: the server calls it with
-- the service_role key and the existing table RLS remains enabled.

create or replace function public.apply_coach_duty_transition(
  p_assignment_id uuid,
  p_action text,
  p_actor_profile_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_assignment public.coach_session_assignments%rowtype;
  v_course public.course_season_courses%rowtype;
  v_checkin public.coach_session_checkins%rowtype;
  v_has_checkin boolean := false;
  v_cancelled boolean := false;
  v_actor_role text;
  v_target_role text;
  v_reason text := left(coalesce(p_payload ->> 'reason', ''), 800);
  v_target_coach_id uuid := nullif(p_payload ->> 'substituteCoachId', '')::uuid;
  v_invited_coach_id uuid := nullif(p_payload ->> 'invitedSubstituteId', '')::uuid;
  v_response text := p_payload ->> 'response';
  v_decision text := p_payload ->> 'decision';
  v_state text := p_payload ->> 'attendanceState';
  v_emergency boolean := coalesce((p_payload ->> 'emergency')::boolean, false);
  v_managed_by_admin boolean := false;
  v_start_at timestamptz;
  v_now timestamptz := now();
begin
  select p.role into v_actor_role
  from public.profiles as p
  where p.id = p_actor_profile_id;

  if v_actor_role is null then
    raise exception 'actor profile not found';
  end if;

  select * into v_assignment
  from public.coach_session_assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'coach duty assignment not found';
  end if;

  v_managed_by_admin := v_actor_role = 'admin'
    and (v_assignment.actual_coach_id is null or v_assignment.actual_coach_id <> p_actor_profile_id);

  select * into v_course
  from public.course_season_courses
  where id = v_assignment.course_season_course_id;

  if not found then
    raise exception 'course not found';
  end if;

  select exists (
    select 1
    from public.course_session_cancellations as cancellation
    where cancellation.course_season_course_id = v_assignment.course_season_course_id
      and cancellation.session_date = v_assignment.session_date
  ) into v_cancelled;

  select * into v_checkin
  from public.coach_session_checkins
  where assignment_id = v_assignment.id
  for update;
  v_has_checkin := found;

  if v_course.start_time is not null then
    -- Cast through text so this operation stays compatible with the deployed
    -- time column and a text-backed fixture used during review.
    v_start_at := (v_assignment.session_date + (v_course.start_time::text)::time) at time zone 'Asia/Taipei';
  end if;

  if p_action = 'check_in' then
    if v_cancelled then raise exception 'session is cancelled'; end if;
    if v_has_checkin then raise exception 'session is already checked in'; end if;
    if v_assignment.actual_coach_id is null then raise exception 'actual coach is not assigned'; end if;
    select role into v_target_role from public.profiles where id = v_assignment.actual_coach_id;
    if v_target_role is null or v_target_role not in ('coach', 'admin') then raise exception 'actual coach is not an enabled coach or admin'; end if;
    if v_actor_role not in ('coach', 'admin') then raise exception 'actor is not an enabled coach or admin'; end if;
    if v_actor_role <> 'admin' and v_assignment.actual_coach_id <> p_actor_profile_id then
      raise exception 'only the actual coach may check in';
    end if;
    if v_assignment.leave_status = 'approved'
       and v_assignment.actual_coach_id = v_assignment.scheduled_coach_id then
      raise exception 'approved leave requires a confirmed substitute';
    end if;
    if v_start_at is null then raise exception 'course start time is missing'; end if;
    if v_now < v_start_at - interval '15 minutes' or v_now > v_start_at + interval '15 minutes' then
      raise exception 'check-in window is closed';
    end if;
    if v_managed_by_admin and v_reason = '' then
      raise exception 'admin check-in requires a reason';
    end if;

    insert into public.coach_session_checkins (
      assignment_id,
      actual_coach_id,
      checked_in_at,
      punctuality,
      manual_correction,
      corrected_by,
      corrected_at,
      correction_reason
    ) values (
      v_assignment.id,
      v_assignment.actual_coach_id,
      v_now,
      case when v_now <= v_start_at then 'on_time' else 'late' end,
      v_managed_by_admin,
      case when v_managed_by_admin then p_actor_profile_id else null end,
      case when v_managed_by_admin then v_now else null end,
      case when v_managed_by_admin then v_reason else '' end
    );

    insert into public.coach_session_duty_audit_log (assignment_id, actor_profile_id, action, reason, snapshot)
    values (v_assignment.id, p_actor_profile_id,
      case when v_managed_by_admin then 'admin_recorded_coach_checkin' else 'coach_checked_in' end,
      v_reason,
      jsonb_build_object('actualCoachId', v_assignment.actual_coach_id,
        'checkedInAt', v_now, 'managedByAdmin', v_managed_by_admin));

  elsif p_action = 'request_leave' then
    if v_actor_role not in ('coach', 'admin') then raise exception 'actor is not an enabled coach or admin'; end if;
    if v_actor_role <> 'admin' and v_assignment.scheduled_coach_id <> p_actor_profile_id then
      raise exception 'only the scheduled coach may request leave';
    end if;
    if v_cancelled then raise exception 'session is cancelled'; end if;
    if v_has_checkin then raise exception 'session is already checked in'; end if;
    if v_assignment.leave_status not in ('none', 'requested')
       or (v_assignment.leave_status = 'requested' and v_assignment.substitute_response <> 'rejected') then
      raise exception 'leave or substitution is already in progress';
    end if;
    if (v_start_at is null or v_now > v_start_at + interval '15 minutes') and (v_actor_role <> 'admin' or v_reason = '') then
      raise exception 'late leave requires an administrator reason';
    end if;
    if v_invited_coach_id is not null then
      select role into v_target_role from public.profiles where id = v_invited_coach_id;
      if v_target_role is null or v_target_role not in ('coach', 'admin') then raise exception 'invited account is not an enabled coach or admin'; end if;
      if v_invited_coach_id = v_assignment.scheduled_coach_id then raise exception 'cannot invite the scheduled coach'; end if;
      update public.coach_session_assignments
      set leave_status = 'requested',
          leave_reason = v_reason,
          leave_requested_at = v_now,
          recommended_substitute_id = v_invited_coach_id,
          substitute_coach_id = v_invited_coach_id,
          substitute_response = 'pending',
          substitute_responded_at = null,
          actual_coach_id = v_assignment.scheduled_coach_id,
          admin_status = 'not_required',
          admin_reason = ''
      where id = v_assignment.id;
    else
      update public.coach_session_assignments
      set leave_status = 'requested',
          leave_reason = v_reason,
          leave_requested_at = v_now,
          recommended_substitute_id = null,
          substitute_coach_id = null,
          substitute_response = 'none',
          substitute_responded_at = null,
          actual_coach_id = v_assignment.scheduled_coach_id,
          admin_status = 'pending',
          admin_reason = ''
      where id = v_assignment.id;
    end if;

    insert into public.coach_session_duty_audit_log (assignment_id, actor_profile_id, action, reason, snapshot)
    values (v_assignment.id, p_actor_profile_id,
      case when v_invited_coach_id is null then 'leave_requested_for_admin' else 'direct_substitute_invited' end,
      v_reason,
      jsonb_build_object('invitedSubstituteId', v_invited_coach_id, 'scheduledCoachId', v_assignment.scheduled_coach_id));

  elsif p_action = 'respond_substitute' then
    if v_actor_role not in ('coach', 'admin') then raise exception 'actor is not an enabled coach or admin'; end if;
    if v_assignment.substitute_coach_id is null or v_assignment.substitute_coach_id <> p_actor_profile_id
       or v_assignment.substitute_response <> 'pending' then
      raise exception 'substitution invitation is not pending for this actor';
    end if;
    if v_assignment.leave_status not in ('requested', 'approved') or v_assignment.admin_status = 'rejected' then
      raise exception 'substitution invitation is stale';
    end if;
    if v_cancelled or v_has_checkin then raise exception 'session cannot change substitution now'; end if;
    if v_start_at is null or v_now > v_start_at + interval '15 minutes' then raise exception 'session window is closed'; end if;
    if v_response is null or v_response not in ('accepted', 'rejected') then raise exception 'invalid substitution response'; end if;
    if v_assignment.admin_status = 'not_required' and v_response = 'accepted' then
      update public.coach_session_assignments
      set leave_status = 'approved', substitute_response = 'accepted', substitute_responded_at = v_now,
          actual_coach_id = p_actor_profile_id, coach_role = 'substitute', admin_status = 'not_required', admin_reason = ''
      where id = v_assignment.id;
    elsif v_assignment.admin_status = 'not_required' then
      update public.coach_session_assignments
      set leave_status = 'requested', substitute_response = 'rejected', substitute_responded_at = v_now,
          actual_coach_id = v_assignment.scheduled_coach_id, admin_status = 'not_required', admin_reason = ''
      where id = v_assignment.id;
    else
      update public.coach_session_assignments
      set substitute_response = v_response, substitute_responded_at = v_now
      where id = v_assignment.id;
    end if;

    insert into public.coach_session_duty_audit_log (assignment_id, actor_profile_id, action, reason, snapshot)
    values (v_assignment.id, p_actor_profile_id,
      case when v_assignment.admin_status = 'not_required' then 'direct_substitute_' else 'substitute_' end || v_response,
      '', jsonb_build_object('scheduledCoachId', v_assignment.scheduled_coach_id));

  elsif p_action = 'review_leave' then
    if v_actor_role <> 'admin' then raise exception 'only an admin may review leave'; end if;
    if v_assignment.leave_status <> 'requested' then raise exception 'leave request is not pending'; end if;
    if v_decision is null or v_decision not in ('approved', 'rejected') then raise exception 'invalid leave decision'; end if;
    if v_decision = 'rejected' and v_reason = '' then raise exception 'rejecting leave requires a reason'; end if;
    if v_cancelled or v_has_checkin then raise exception 'session cannot review leave now'; end if;
    if (v_start_at is null or v_now > v_start_at + interval '15 minutes') and v_reason = '' then
      raise exception 'late leave review requires a reason';
    end if;
    update public.coach_session_assignments
    set leave_status = v_decision,
        admin_status = v_decision,
        admin_reviewed_by = p_actor_profile_id,
        admin_reviewed_at = v_now,
        admin_reason = v_reason,
        actual_coach_id = case when v_decision = 'rejected' then scheduled_coach_id else null end,
        substitute_coach_id = case when v_decision = 'rejected' then null else substitute_coach_id end,
        recommended_substitute_id = case when v_decision = 'rejected' then null else recommended_substitute_id end,
        substitute_response = case when v_decision = 'rejected' then 'none' else substitute_response end,
        substitute_responded_at = case when v_decision = 'rejected' then null else substitute_responded_at end
    where id = v_assignment.id;

    insert into public.coach_session_duty_audit_log (assignment_id, actor_profile_id, action, reason, snapshot)
    values (v_assignment.id, p_actor_profile_id, 'leave_' || v_decision, v_reason,
      jsonb_build_object('previous', to_jsonb(v_assignment), 'previousCheckin', case when v_has_checkin then to_jsonb(v_checkin) else null end));

  elsif p_action = 'manual_correction' then
    if v_actor_role <> 'admin' then raise exception 'only an admin may correct attendance'; end if;
    if v_state is null or v_state not in ('on_time', 'late', 'not_checked_in') or v_reason = '' then
      raise exception 'manual correction requires state and reason';
    end if;
    if v_cancelled and v_state <> 'not_checked_in' then
      raise exception 'cancelled session cannot be marked as attended';
    end if;
    if v_state = 'not_checked_in' then
      delete from public.coach_session_checkins where assignment_id = v_assignment.id;
    else
      if v_assignment.actual_coach_id is null then raise exception 'actual coach is not assigned'; end if;
      insert into public.coach_session_checkins (
        assignment_id, actual_coach_id, checked_in_at, punctuality,
        manual_correction, corrected_by, corrected_at, correction_reason
      ) values (
        v_assignment.id, v_assignment.actual_coach_id, v_now, v_state,
        true, p_actor_profile_id, v_now, v_reason
      ) on conflict (assignment_id) do update set
        actual_coach_id = excluded.actual_coach_id,
        checked_in_at = excluded.checked_in_at,
        punctuality = excluded.punctuality,
        manual_correction = true,
        corrected_by = excluded.corrected_by,
        corrected_at = excluded.corrected_at,
        correction_reason = excluded.correction_reason;
    end if;

    insert into public.coach_session_duty_audit_log (assignment_id, actor_profile_id, action, reason, snapshot)
    values (v_assignment.id, p_actor_profile_id, 'attendance_manually_corrected', v_reason,
      jsonb_build_object('previous', to_jsonb(v_assignment),
        'previousCheckin', case when v_has_checkin then to_jsonb(v_checkin) else null end,
        'attendanceState', v_state));

  elsif p_action = 'assign_substitute' then
    if v_actor_role <> 'admin' then raise exception 'only an admin may assign a substitute'; end if;
    if v_target_coach_id is null or v_target_coach_id = v_assignment.scheduled_coach_id then raise exception 'invalid substitute coach'; end if;
    select role into v_target_role from public.profiles where id = v_target_coach_id;
    if v_target_role is null or v_target_role not in ('coach', 'admin') then raise exception 'substitute account is not an enabled coach or admin'; end if;
    if v_cancelled or v_has_checkin then raise exception 'session cannot change substitution now'; end if;
    if (v_start_at is null or v_now > v_start_at + interval '15 minutes') and v_reason = '' then raise exception 'late substitution requires a reason'; end if;
    update public.coach_session_assignments
    set leave_status = case when leave_status in ('none', 'rejected') then 'approved' else leave_status end,
        admin_status = 'pending', substitute_coach_id = v_target_coach_id,
        recommended_substitute_id = v_target_coach_id, substitute_response = 'pending', substitute_responded_at = null,
        actual_coach_id = null, admin_reviewed_by = p_actor_profile_id, admin_reviewed_at = v_now, admin_reason = v_reason
    where id = v_assignment.id;

    insert into public.coach_session_duty_audit_log (assignment_id, actor_profile_id, action, reason, snapshot)
    values (v_assignment.id, p_actor_profile_id, 'substitute_assigned', v_reason,
      jsonb_build_object('substituteCoachId', v_target_coach_id, 'previous', to_jsonb(v_assignment)));

  elsif p_action = 'confirm_substitute' then
    if v_actor_role <> 'admin' then raise exception 'only an admin may confirm a substitute'; end if;
    if v_assignment.leave_status = 'rejected' or v_assignment.admin_status = 'rejected' then
      raise exception 'substitution confirmation is stale';
    end if;
    if v_assignment.admin_status = 'not_required'
       and v_assignment.actual_coach_id = v_assignment.substitute_coach_id
       and v_assignment.substitute_response = 'accepted' then
      raise exception 'substitution is already active';
    end if;
    if v_assignment.substitute_coach_id is null then raise exception 'substitute coach is missing'; end if;
    select role into v_target_role from public.profiles where id = v_assignment.substitute_coach_id;
    if v_target_role is null or v_target_role not in ('coach', 'admin') then raise exception 'substitute account is not an enabled coach or admin'; end if;
    if not v_emergency and v_assignment.substitute_response <> 'accepted' then raise exception 'substitute has not accepted'; end if;
    if v_emergency and v_reason = '' then raise exception 'emergency confirmation requires a reason'; end if;
    if v_cancelled or v_has_checkin then raise exception 'session cannot change substitution now'; end if;
    if v_start_at is null or v_now > v_start_at + interval '15 minutes' then
      if not v_emergency or v_reason = '' then raise exception 'late confirmation requires an emergency reason'; end if;
    end if;
    update public.coach_session_assignments
    set leave_status = 'approved', admin_status = 'approved',
        substitute_response = case when v_emergency then 'accepted' else substitute_response end,
        substitute_responded_at = case when v_emergency then v_now else substitute_responded_at end,
        actual_coach_id = substitute_coach_id, coach_role = 'substitute',
        admin_reviewed_by = p_actor_profile_id, admin_reviewed_at = v_now, admin_reason = v_reason
    where id = v_assignment.id;

    insert into public.coach_session_duty_audit_log (assignment_id, actor_profile_id, action, reason, snapshot)
    values (v_assignment.id, p_actor_profile_id,
      case when v_emergency then 'emergency_substitute_confirmed' else 'substitute_confirmed' end,
      v_reason, jsonb_build_object('actualCoachId', v_assignment.substitute_coach_id, 'previous', to_jsonb(v_assignment)));
  else
    raise exception 'unsupported coach duty transition';
  end if;

  return jsonb_build_object('assignmentId', v_assignment.id, 'action', p_action, 'committedAt', v_now);
end;
$$;

revoke all on function public.apply_coach_duty_transition(uuid, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_coach_duty_transition(uuid, text, uuid, jsonb) to service_role;
