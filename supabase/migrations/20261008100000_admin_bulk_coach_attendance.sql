create or replace function public.admin_bulk_coach_attendance(
  p_actor_id uuid, p_assignment_ids uuid[], p_state text,
  p_reason text default '', p_fingerprint text default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_row record;
  v_rows jsonb := '[]'::jsonb;
  v_fingerprint text;
  v_skip text;
  v_changed integer := 0;
begin
  if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then
    raise exception '只有超級管理員可以批量修正考勤。';
  end if;
  if p_state is null or p_state not in ('on_time','late','not_checked_in') then
    raise exception '考勤狀態無效。';
  end if;
  if coalesce(cardinality(p_assignment_ids),0) not between 1 and 500
     or cardinality(p_assignment_ids) <> (select count(distinct id) from unnest(p_assignment_ids) id) then
    raise exception '請選擇 1 至 500 筆不重複的考勤。';
  end if;
  -- Serialize in a stable order; the existing single-row transition uses the same locks.
  perform id from public.coach_session_assignments where id=any(p_assignment_ids) order by id for update;
  if (select count(*) from public.coach_session_assignments where id=any(p_assignment_ids)) <> cardinality(p_assignment_ids) then
    raise exception '部分考勤不存在，請重新載入。';
  end if;
  perform id from public.coach_session_checkins where assignment_id=any(p_assignment_ids) order by assignment_id for update;
  for v_row in
    select a.*, c.start_time, c.time_zone, c.course_data, s.status as season_status,
      ci.id as checkin_id, ci.punctuality, ci.updated_at as checkin_updated_at,
      exists(select 1 from public.course_session_cancellations x where x.course_season_course_id=a.course_season_course_id and x.session_date=a.session_date) as cancelled,
      coalesce(p.name,p.email,'未命名教練') as coach_name
    from public.coach_session_assignments a
    join public.course_season_courses c on c.id=a.course_season_course_id
    join public.course_seasons s on s.id=a.season_id
    left join public.coach_session_checkins ci on ci.assignment_id=a.id
    left join public.profiles p on p.id=coalesce(a.actual_coach_id,a.scheduled_coach_id)
    where a.id=any(p_assignment_ids) order by a.id
  loop
    v_skip := case
      when v_row.season_status='archived' then '季度已封存'
      when v_row.cancelled then '課次已停課'
      when v_row.start_time is null then '缺少開課時間'
      when (v_row.session_date + v_row.start_time) at time zone v_row.time_zone > now() then '課次尚未開始'
      when v_row.actual_coach_id is null and p_state <> 'not_checked_in' then '尚未確認實際授課教練'
      when coalesce(v_row.punctuality,'not_checked_in')=p_state then '狀態已相同'
      else null end;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'assignmentId',v_row.id,'assignmentUpdatedAt',v_row.updated_at,'checkinUpdatedAt',v_row.checkin_updated_at,
      'date',v_row.session_date,'coachName',v_row.coach_name,'courseName',coalesce(v_row.course_data->>'name',v_row.course_slug),
      'from',coalesce(v_row.punctuality,'not_checked_in'),'to',p_state,'skip',v_skip,
      'actualCoachId',v_row.actual_coach_id,'seasonStatus',v_row.season_status,'startTime',v_row.start_time,'timeZone',v_row.time_zone
    ));
  end loop;
  v_fingerprint := md5(v_rows::text);
  if p_fingerprint is null then
    return jsonb_build_object('fingerprint',v_fingerprint,'rows',v_rows);
  end if;
  if p_fingerprint <> v_fingerprint then raise exception '考勤已變更，請重新預覽後再提交。'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 800 then raise exception '請填寫 1 至 800 字的修正原因。'; end if;
  for v_row in select value from jsonb_array_elements(v_rows) where value->>'skip' is null loop
    perform public.apply_coach_duty_transition((v_row.value->>'assignmentId')::uuid,'manual_correction',p_actor_id,
      jsonb_build_object('attendanceState',p_state,'reason',p_reason));
    v_changed := v_changed + 1;
  end loop;
  return jsonb_build_object('changed',v_changed,'skipped',jsonb_array_length(v_rows)-v_changed);
end;
$$;
revoke all on function public.admin_bulk_coach_attendance(uuid,uuid[],text,text,text) from public,anon,authenticated;
grant execute on function public.admin_bulk_coach_attendance(uuid,uuid[],text,text,text) to service_role;
