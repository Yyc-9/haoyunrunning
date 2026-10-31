-- Coach-only seven-day backfill; reuse the original leave credit. Student rules are unchanged.
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
  v_existing public.course_makeup_requests;
  v_is_makeup boolean := false;
  v_today date := (now() at time zone 'Asia/Taipei')::date;
begin
  if p_mode is null or p_mode not in ('in_person','self_training') then raise exception '請選擇請假處理方式。'; end if;
  if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') and not (
    exists(select 1 from public.profiles where id=p_actor_id and role='coach')
    and exists(select 1 from public.coach_session_assignments where course_season_course_id=p_course_id and session_date=p_session_date
      and (actual_coach_id=p_actor_id or (scheduled_coach_id=p_actor_id and leave_status <> 'approved')))
  ) then raise exception '沒有這堂課的請假管理權限。'; end if;
  select * into v_lead from public.signup_leads where id=p_enrollment_id for update;
  if not found or v_lead.source<>'course_payment' or v_lead.registration_status<>'active'
    then raise exception '只能替本班有效報名的學員安排請假。'; end if;
  if p_session_date < v_today - 7 then raise exception '僅可回溯最近 7 天的請假與補課。'; end if;
  if v_lead.course_season_course_id is distinct from p_course_id then
    select * into v_existing from public.course_makeup_requests where enrollment_id=p_enrollment_id
      and target_course_season_course_id=p_course_id and target_session_date=p_session_date
      and status in ('scheduled','forfeited') for update;
    if not found then raise exception '沒有可順延的本堂補課安排。'; end if;
    v_is_makeup := true;
  end if;
  select * into v_home from public.course_season_courses where id=p_course_id for update;
  if not found or v_home.season_id is distinct from v_lead.season_id or not coalesce(v_home.billing_config->'sessionDates' ? p_session_date::text,false)
    then raise exception '請假課次不在本班課表內。'; end if;
  select * into v_season from public.course_seasons where id=v_home.season_id;
  if v_season.status not in ('active','enrolling') then raise exception '本季度已封存，不能更改請假。'; end if;
  if exists(select 1 from public.course_session_cancellations where course_season_course_id=p_course_id and session_date=p_session_date)
    then raise exception '本堂已停課，不需要另行請假。'; end if;
  if v_lead.billing_start_session_date is not null and p_session_date<v_lead.billing_start_session_date
    then raise exception '計費起點之前的課次沒有補課資格。'; end if;
  if v_is_makeup then v_request := v_existing;
  else
    select * into v_request from public.course_makeup_requests where enrollment_id=p_enrollment_id
      and original_course_season_course_id=p_course_id and original_session_date=p_session_date for update;
  end if;
  if v_request.id is not null and v_request.status='self_training' and p_mode='self_training' then return v_request; end if;
  if v_request.id is not null and v_request.status in ('self_training','completed')
    then raise exception '本次請假已完成處理，不能再更改或安排線下補課。'; end if;
  if v_request.status in ('scheduled','forfeited') then
    select * into v_target from public.course_season_courses where id=v_request.target_course_season_course_id;
    if v_request.target_session_date < v_today - 7
      then raise exception '原補課課次已超過 7 天回溯期限。'; end if;
  end if;

  if p_mode='in_person' then
    select * into v_target from public.course_season_courses where id=p_target_course_id for update;
    if not found or v_target.season_id<>v_home.season_id or v_target.id=v_lead.course_season_course_id
      then raise exception '補課只能選擇本季度的其他班級。'; end if;
    if p_target_date is null or not coalesce(v_target.billing_config->'sessionDates' ? p_target_date::text,false)
      or p_target_date>v_season.ends_on then raise exception '補課課次不在本季度課表內。'; end if;
    v_start := (p_target_date+coalesce(v_target.start_time,'23:59'::time)) at time zone coalesce(v_target.time_zone,'Asia/Taipei');
    if p_target_date < v_today - 7 or v_start <= (p_session_date+coalesce(v_home.start_time,'23:59'::time)) at time zone coalesce(v_home.time_zone,'Asia/Taipei')
      then raise exception '請選擇請假課次之後、最近 7 天內或未來的補課課次。'; end if;
    if exists(select 1 from public.course_session_cancellations where course_season_course_id=p_target_course_id and session_date=p_target_date)
      then raise exception '這堂補課已停課，請選擇其他課次。'; end if;
    if exists(select 1 from public.signup_leads where source='course_payment' and registration_status='active'
      and season_id=v_home.season_id and course_season_course_id=p_target_course_id and lower(email)=lower(v_lead.email))
      then raise exception '學員已報名這個班級，請選擇其他班級補課。'; end if;
  end if;

  if v_request.id is not null and exists(select 1 from public.course_attendance_records
    where enrollment_id=p_enrollment_id and course_season_course_id=v_request.target_course_season_course_id
    and session_date=v_request.target_session_date and status='present') then
    raise exception '原補課已有到課紀錄，不能順延。';
  end if;
  if v_request.id is not null then
    update public.course_makeup_requests set status='needs_reselection',updated_by=p_actor_id,updated_at=now()
      where id=v_request.id;
  else
  v_request := public.request_course_leave(v_home.season_id,v_lead.id,v_home.id,v_home.course_slug,p_session_date,p_actor_id,v_lead.email,v_lead.name);
  end if;
  if p_mode='in_person' then
    v_request := public.schedule_course_makeup(v_request.id,p_target_course_id,p_target_date,p_actor_id);
  else
    update public.course_makeup_requests set status='self_training',target_course_season_course_id=null,
      target_course_slug=null,target_session_date=null,updated_by=p_actor_id,updated_at=now()
      where id=v_request.id returning * into v_request;
  end if;
  if v_is_makeup then
    insert into public.course_attendance_records(season_id,course_season_course_id,course_slug,session_date,enrollment_id,
      student_email,student_name,status,note,marked_by,marked_at,updated_at)
    values(v_home.season_id,p_course_id,v_home.course_slug,p_session_date,v_lead.id,v_lead.email,v_lead.name,
      'excused','補課請假；沿用原請假資格順延。',p_actor_id,now(),now())
    on conflict(course_season_course_id,session_date,enrollment_id) do update
      set status='excused',note=excluded.note,marked_by=p_actor_id,marked_at=now(),updated_at=now();
  end if;
  update public.course_attendance_records set note=case when p_mode='self_training'
    then '教練已提供課表，自主訓練；本次不可再安排線下補課。' else '教練已登記請假並安排線下補課。' end
    where enrollment_id=p_enrollment_id and course_season_course_id=p_course_id and session_date=p_session_date;
  return v_request;
end $$;
revoke all on function public.resolve_coach_course_leave(uuid,uuid,date,uuid,text,uuid,date) from public,anon,authenticated;
grant execute on function public.resolve_coach_course_leave(uuid,uuid,date,uuid,text,uuid,date) to service_role;
