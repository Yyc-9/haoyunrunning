-- One leave has one outcome. Self-training cannot be reused as an in-person credit.
alter table public.course_makeup_requests drop constraint course_makeup_requests_status_check;
alter table public.course_makeup_requests add constraint course_makeup_requests_status_check
  check (status in ('leave_requested','scheduled','completed','forfeited','cancelled','needs_reselection','self_training'));
alter table public.course_makeup_requests add constraint self_training_without_target
  check (status <> 'self_training' or target_course_season_course_id is null);

create or replace function public.guard_self_training_leave() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.status = 'self_training' then
    if tg_op = 'DELETE' or new.status <> 'self_training'
      or new.enrollment_id is distinct from old.enrollment_id
      or new.original_course_season_course_id is distinct from old.original_course_season_course_id
      or new.original_session_date is distinct from old.original_session_date then
      raise exception '本次請假已選擇自主訓練，不可再安排線下補課或取消請假。';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function public.guard_self_training_leave() from public,anon,authenticated;
create trigger guard_self_training_leave before update or delete on public.course_makeup_requests
for each row execute function public.guard_self_training_leave();

create or replace function public.guard_self_training_attendance() returns trigger
language plpgsql set search_path='' as $$
declare v_row public.course_attendance_records;
begin
  v_row := case when tg_op='DELETE' then old else new end;
  -- A whole-session cancellation can remove its attendance records; it does not restore the credit.
  if (tg_op='DELETE' or new.status <> 'excused')
    and exists(select 1 from public.course_makeup_requests where enrollment_id=v_row.enrollment_id
      and original_course_season_course_id=v_row.course_season_course_id
      and original_session_date=v_row.session_date and status='self_training')
    and not exists(select 1 from public.course_session_cancellations where course_season_course_id=v_row.course_season_course_id and session_date=v_row.session_date) then
    raise exception '本堂已登記自主訓練，不能改為到課或清除請假。';
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function public.guard_self_training_attendance() from public,anon,authenticated;
create trigger guard_self_training_attendance before insert or update or delete on public.course_attendance_records
for each row execute function public.guard_self_training_attendance();

create or replace function public.resolve_coach_course_leave(
  p_enrollment_id uuid, p_course_id uuid, p_session_date date, p_actor_id uuid,
  p_mode text, p_target_course_id uuid default null, p_target_date date default null
) returns public.course_makeup_requests
language plpgsql security invoker set search_path='' as $$
declare
  v_lead public.signup_leads;
  v_home public.course_season_courses;
  v_target public.course_season_courses;
  v_request public.course_makeup_requests;
  v_season public.course_seasons;
  v_start timestamptz;
begin
  if p_mode is null or p_mode not in ('in_person','self_training') then raise exception '請選擇請假處理方式。'; end if;
  if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') and not (
    exists(select 1 from public.profiles where id=p_actor_id and role='coach')
    and exists(select 1 from public.coach_session_assignments where course_season_course_id=p_course_id and session_date=p_session_date
      and (actual_coach_id=p_actor_id or (scheduled_coach_id=p_actor_id and leave_status <> 'approved')))
  ) then raise exception '沒有這堂課的請假管理權限。'; end if;
  select * into v_lead from public.signup_leads where id=p_enrollment_id for update;
  if not found or v_lead.source<>'course_payment' or v_lead.registration_status<>'active' or v_lead.course_season_course_id is distinct from p_course_id
    then raise exception '只能替本班有效報名的學員安排請假。'; end if;
  select * into v_home from public.course_season_courses where id=p_course_id for update;
  if not found or v_home.season_id is distinct from v_lead.season_id or not coalesce(v_home.billing_config->'sessionDates' ? p_session_date::text,false)
    then raise exception '請假課次不在本班課表內。'; end if;
  select * into v_season from public.course_seasons where id=v_home.season_id;
  if v_season.status not in ('active','enrolling') then raise exception '本季度已封存，不能更改請假。'; end if;
  if exists(select 1 from public.course_session_cancellations where course_season_course_id=p_course_id and session_date=p_session_date)
    then raise exception '本堂已停課，不需要另行請假。'; end if;
  if v_lead.billing_start_session_date is not null and p_session_date<v_lead.billing_start_session_date
    then raise exception '計費起點之前的課次沒有補課資格。'; end if;
  select * into v_request from public.course_makeup_requests where enrollment_id=p_enrollment_id
    and original_course_season_course_id=p_course_id and original_session_date=p_session_date for update;
  if found and v_request.status='self_training' and p_mode='self_training' then return v_request; end if;
  if found and v_request.status in ('self_training','completed','forfeited')
    then raise exception '本次請假已完成處理，不能再更改或安排線下補課。'; end if;
  if v_request.status='scheduled' then
    select * into v_target from public.course_season_courses where id=v_request.target_course_season_course_id;
    if (v_request.target_session_date+coalesce(v_target.start_time,'23:59'::time)) at time zone coalesce(v_target.time_zone,'Asia/Taipei') <= now()
      then raise exception '原補課課次已開始，不能更改處理方式。'; end if;
  end if;

  if p_mode='in_person' then
    select * into v_target from public.course_season_courses where id=p_target_course_id for update;
    if not found or v_target.season_id<>v_home.season_id or v_target.id=p_course_id
      then raise exception '補課只能選擇本季度的其他班級。'; end if;
    if p_target_date is null or not coalesce(v_target.billing_config->'sessionDates' ? p_target_date::text,false)
      or p_target_date>v_season.ends_on then raise exception '補課課次不在本季度課表內。'; end if;
    v_start := (p_target_date+coalesce(v_target.start_time,'23:59'::time)) at time zone coalesce(v_target.time_zone,'Asia/Taipei');
    if v_start <= now() or v_start <= (p_session_date+coalesce(v_home.start_time,'23:59'::time)) at time zone coalesce(v_home.time_zone,'Asia/Taipei')
      then raise exception '請選擇原請假課次之後、尚未開始的補課課次。'; end if;
    if exists(select 1 from public.course_session_cancellations where course_season_course_id=p_target_course_id and session_date=p_target_date)
      then raise exception '這堂補課已停課，請選擇其他課次。'; end if;
    if exists(select 1 from public.signup_leads where source='course_payment' and registration_status='active'
      and season_id=v_home.season_id and course_season_course_id=p_target_course_id and lower(email)=lower(v_lead.email))
      then raise exception '學員已報名這個班級，請選擇其他班級補課。'; end if;
  end if;

  v_request := public.request_course_leave(v_home.season_id,v_lead.id,v_home.id,v_home.course_slug,p_session_date,p_actor_id,v_lead.email,v_lead.name);
  if p_mode='in_person' then
    v_request := public.schedule_course_makeup(v_request.id,p_target_course_id,p_target_date,p_actor_id);
  else
    update public.course_makeup_requests set status='self_training',target_course_season_course_id=null,
      target_course_slug=null,target_session_date=null,updated_by=p_actor_id,updated_at=now()
      where id=v_request.id returning * into v_request;
  end if;
  update public.course_attendance_records set note=case when p_mode='self_training'
    then '教練已提供課表，自主訓練；本次不可再安排線下補課。' else '教練已登記請假並安排線下補課。' end
    where enrollment_id=p_enrollment_id and course_season_course_id=p_course_id and session_date=p_session_date;
  return v_request;
end $$;
revoke all on function public.resolve_coach_course_leave(uuid,uuid,date,uuid,text,uuid,date) from public,anon,authenticated;
grant execute on function public.resolve_coach_course_leave(uuid,uuid,date,uuid,text,uuid,date) to service_role;
