-- Registration validity is separate from payment review. No finance or attendance dates are reset.
alter table public.signup_leads add column registration_status text not null default 'active'
  check (registration_status in ('active','cancelled','duplicate'));
-- Preserve the exclusion of explicitly identified historical duplicate imports.
update public.signup_leads set registration_status='duplicate'
where source='course_payment' and status='rejected'
  and review_note='Google 表格偵測到同班級、同姓名與同信箱的重複報名，請人工處理。';
create index signup_leads_active_registration_idx on public.signup_leads(season_id,course_season_course_id)
where source='course_payment' and registration_status='active';

CREATE OR REPLACE FUNCTION public.check_in_student_course(p_enrollment_id uuid, p_course_id uuid, p_session_date date, p_actor_id uuid)
 RETURNS student_course_checkins
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lead public.signup_leads; v_course public.course_season_courses;
  v_makeup public.course_makeup_requests; v_result public.student_course_checkins;
  v_start timestamptz;
begin
  select * into v_lead from public.signup_leads where id = p_enrollment_id for update;
  if not found or v_lead.source <> 'course_payment' or v_lead.registration_status <> 'active'
    or not exists (select 1 from public.profiles where id = p_actor_id and lower(trim(email)) = lower(trim(v_lead.email)))
    then raise exception '找不到有效的本人報名紀錄'; end if;
  select * into v_course from public.course_season_courses where id = p_course_id for share;
  if not found or v_course.season_id <> v_lead.season_id or v_course.start_time is null
    or not coalesce(v_course.billing_config->'sessionDates' ? p_session_date::text, false)
    then raise exception '課次或上課時間尚未設定'; end if;
  if not exists(select 1 from public.course_seasons where id = v_lead.season_id and status in ('active','enrolling'))
    then raise exception '本季度未開放簽到'; end if;
  if exists(select 1 from public.course_session_cancellations where course_season_course_id = p_course_id and session_date = p_session_date)
    then raise exception '本堂已停課'; end if;
  if p_course_id = v_lead.course_season_course_id then
    if exists(select 1 from public.course_makeup_requests where enrollment_id = p_enrollment_id and original_session_date = p_session_date and status <> 'cancelled')
      then raise exception '本堂已請假，請至安排的補課課次簽到'; end if;
    if v_lead.billing_start_session_date is not null and p_session_date < v_lead.billing_start_session_date
      then raise exception '本堂早於報名起始課次'; end if;
  else
    select * into v_makeup from public.course_makeup_requests where enrollment_id = p_enrollment_id
      and target_course_season_course_id = p_course_id and target_session_date = p_session_date
      and status in ('scheduled','completed') for update;
    if not found then raise exception '沒有安排到本堂補課'; end if;
  end if;
  select * into v_result from public.student_course_checkins where enrollment_id = p_enrollment_id and course_season_course_id = p_course_id and session_date = p_session_date;
  if found then return v_result; end if;
  v_start := (p_session_date + v_course.start_time) at time zone 'Asia/Taipei';
  if now() < v_start - interval '15 minutes' or now() > v_start + interval '15 minutes'
    then raise exception '簽到開放時間為開課前 15 分鐘至開課後 15 分鐘'; end if;
  insert into public.student_course_checkins(enrollment_id, course_season_course_id, session_date, student_id)
    values(p_enrollment_id, p_course_id, p_session_date, p_actor_id) returning * into v_result;
  if v_makeup.id is not null and exists(select 1 from public.course_attendance_records
    where enrollment_id = p_enrollment_id and course_season_course_id = p_course_id and session_date = p_session_date and status = 'present') then
    update public.course_makeup_requests set status = 'completed' where id = v_makeup.id;
  end if;
  return v_result;
end $function$;

CREATE OR REPLACE FUNCTION public.approve_course_enrollment(p_lead_id uuid, p_review_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_lead public.signup_leads%rowtype;
  v_paid_count integer;
  v_capacity integer;
  v_lock_key text;
  v_result public.signup_leads%rowtype;
begin
  select *
  into v_lead
  from public.signup_leads
  where id = p_lead_id
    and source = 'course_payment'
  for update;

  if not found then
    raise exception 'course enrollment not found';
  end if;

  if v_lead.registration_status <> 'active' then
    raise exception 'course enrollment is cancelled or duplicate';
  end if;

  if v_lead.status = 'approved' then
    return to_jsonb(v_lead);
  end if;

  if coalesce(v_lead.course_slug, '') = '' then
    raise exception 'course slug is missing';
  end if;

  select capacity
  into v_capacity
  from public.course_season_courses
  where id = v_lead.course_season_course_id;

  v_capacity := greatest(coalesce(v_capacity, v_lead.course_capacity, 40), 1);
  v_lock_key := coalesce(v_lead.season_id::text, 'legacy') || ':' || v_lead.course_slug;
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

  -- This enrollment already holds its seat. Late reconciliation must not re-admit it.
  update public.signup_leads
  set
    status = 'approved',
    course_capacity = v_capacity,
    reviewed_at = now(),
    review_note = coalesce(p_review_note, ''),
    updated_at = now()
  where id = p_lead_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$function$;

CREATE OR REPLACE FUNCTION public.schedule_course_makeup(p_request_id uuid, p_target_course_season_course_id uuid, p_target_session_date date, p_actor_profile_id uuid)
 RETURNS course_makeup_requests
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_request public.course_makeup_requests%rowtype;
  v_target public.course_season_courses%rowtype;
  v_approved_count integer;
  v_makeup_count integer;
begin
  select * into v_request from public.course_makeup_requests where id = p_request_id for update;
  if not found then raise exception 'makeup request not found'; end if;
  if v_request.status not in ('leave_requested', 'scheduled', 'needs_reselection') then
    raise exception 'makeup request cannot be scheduled';
  end if;

  select * into v_target from public.course_season_courses where id = p_target_course_season_course_id for update;
  if not found or v_target.season_id <> v_request.season_id then
    raise exception 'makeup target is outside current season';
  end if;
  if v_target.id = v_request.original_course_season_course_id then
    raise exception 'makeup target must be another class';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_target.id::text || ':' || p_target_session_date::text, 0));
  select count(*) into v_approved_count from public.signup_leads
  where source = 'course_payment' and season_id = v_request.season_id
    and course_season_course_id = v_target.id and registration_status = 'active';
  select count(*) into v_makeup_count from public.course_makeup_requests
  where target_course_season_course_id = v_target.id and target_session_date = p_target_session_date
    and status = 'scheduled' and id <> v_request.id
    and exists (select 1 from public.signup_leads l where l.id=course_makeup_requests.enrollment_id and l.registration_status='active');

  if v_approved_count + v_makeup_count >= v_target.capacity then raise exception 'makeup target capacity reached'; end if;

  update public.course_makeup_requests set target_course_season_course_id = v_target.id,
    target_course_slug = v_target.course_slug, target_session_date = p_target_session_date,
    status = 'scheduled', updated_by = p_actor_profile_id, updated_at = now()
  where id = v_request.id returning * into v_request;
  return v_request;
end;
$function$;


-- Serialize eligibility checks with cancellation. Service-role writes must obey this too.
create or replace function public.guard_active_enrollment_attendance() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_lead public.signup_leads;
begin
  select * into v_lead from public.signup_leads where id=new.enrollment_id for update;
  if not found or v_lead.source<>'course_payment' or v_lead.registration_status<>'active' then
    raise exception '報名已取消或標記重複，不能新增或修改出席紀錄';
  end if;
  return new;
end $$;
create trigger require_active_attendance before insert or update on public.course_attendance_records
for each row execute function public.guard_active_enrollment_attendance();
create trigger require_active_checkin before insert on public.student_course_checkins
for each row execute function public.guard_active_enrollment_attendance();

create or replace function public.guard_inactive_enrollment_finance() returns trigger
language plpgsql set search_path=public as $$
begin
  if old.source='course_payment' and old.registration_status<>'active'
     and (new.status is distinct from old.status or new.payment_submitted_at is distinct from old.payment_submitted_at or new.reviewed_at is distinct from old.reviewed_at) then
    raise exception '報名已取消或標記重複，不能變更核帳狀態';
  end if;
  return new;
end $$;
create trigger guard_inactive_enrollment_finance before update on public.signup_leads
for each row execute function public.guard_inactive_enrollment_finance();

create or replace function public.request_enrollment_supplement(
  p_id uuid,p_enrollment_id uuid,p_actor_id uuid,p_reason text,p_message text,p_internal_note text,
  p_expected_status text,p_expected_submitted_at timestamptz
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_lead public.signup_leads; v_request public.enrollment_followups;
begin
  select * into v_lead from public.signup_leads where id=p_enrollment_id and source='course_payment' for update;
  if not found or v_lead.registration_status<>'active' then raise exception 'enrollment_not_found'; end if;
  select * into v_request from public.enrollment_followups where id=p_id;
  if found then
    if v_request.enrollment_id<>p_enrollment_id or v_request.actor_id<>p_actor_id
       or v_request.student_message<>trim(p_message) or v_request.reason<>p_reason
       or v_request.internal_note<>trim(coalesce(p_internal_note,'')) then raise exception 'request_id_conflict'; end if;
    return to_jsonb(v_request);
  end if;
  perform 1 from public.course_seasons where id=v_lead.season_id and status<>'archived' for share;
  if not found then raise exception 'season_not_writable'; end if;
  if v_lead.status not in ('pending_transfer','pending_review','rejected') then raise exception 'enrollment_not_writable'; end if;
  if v_lead.status is distinct from p_expected_status or v_lead.payment_submitted_at is distinct from p_expected_submitted_at then
    raise exception 'enrollment_changed';
  end if;
  if exists(select 1 from public.enrollment_followups where enrollment_id=p_enrollment_id and responded_at is null) then
    raise exception 'supplement_already_requested';
  end if;
  insert into public.enrollment_followups(id,enrollment_id,actor_id,reason,student_message,internal_note)
    values(p_id,p_enrollment_id,p_actor_id,p_reason,trim(p_message),trim(coalesce(p_internal_note,''))) returning * into v_request;
  update public.signup_leads set status='rejected',student_review_message=trim(p_message),
    review_note=trim(coalesce(p_internal_note,'')),reviewed_at=now() where id=p_enrollment_id;
  -- An imported/bank-flagged row may already be rejected before a human writes the request.
  if v_lead.status='rejected' then
    insert into public.enrollment_notifications(enrollment_id,audience,recipient_email,kind,title,message)
      values(v_lead.id,'student',lower(trim(v_lead.email)),'supplement_requested','你的報名需要補充資料',trim(p_message));
  end if;
  return to_jsonb(v_request);
end $$;

create or replace function public.submit_enrollment_supplement(
  p_enrollment_id uuid,p_email text,p_last_five text,p_transfer_date date,p_reply text,p_request_id uuid
) returns void language plpgsql security invoker set search_path='' as $$
declare v_lead public.signup_leads; v_request public.enrollment_followups;
begin
  select * into v_lead from public.signup_leads where id=p_enrollment_id and source='course_payment'
    and lower(trim(email))=lower(trim(p_email)) for update;
  if not found or v_lead.registration_status<>'active' then raise exception 'enrollment_not_found'; end if;
  perform 1 from public.course_seasons where id=v_lead.season_id and status<>'archived' for share;
  if not found then raise exception 'season_not_writable'; end if;
  if v_lead.status not in ('pending_transfer','rejected') then raise exception 'enrollment_changed'; end if;
  if p_last_five !~ '^[0-9]{5}$' or p_last_five is null or p_transfer_date is null or p_transfer_date>(now() at time zone 'Asia/Taipei')::date
    then raise exception 'invalid_transfer'; end if;
  if length(coalesce(p_reply,''))>1000 or (v_lead.status='rejected' and length(trim(coalesce(p_reply,'')))=0)
    then raise exception 'invalid_reply'; end if;
  select * into v_request from public.enrollment_followups where enrollment_id=v_lead.id and responded_at is null;
  if v_request.id is distinct from p_request_id then raise exception 'enrollment_changed'; end if;
  update public.enrollment_followups set responded_at=now(),student_reply=trim(coalesce(p_reply,'')) where id=v_request.id;
  update public.signup_leads set transfer_last_five=p_last_five,transfer_date=p_transfer_date,
    notes=case when length(trim(coalesce(p_reply,'')))>0 then concat_ws(E'\n',nullif(v_lead.notes,''),'補充說明：'||trim(p_reply)) else v_lead.notes end,
    status='pending_review',payment_submitted_at=now() where id=v_lead.id;
end $$;

create or replace function public.claim_enrollment_followup_email(p_id uuid,p_recipient text,p_payload jsonb)
returns setof public.enrollment_followups language plpgsql security invoker set search_path='' as $$
declare v_row public.enrollment_followups;
begin
  select * into v_row from public.enrollment_followups where id=p_id for update;
  if not found or v_row.email_status='sent' or v_row.responded_at is not null then return; end if;
  if not exists(select 1 from public.signup_leads l join public.course_seasons s on s.id=l.season_id
    where l.id=v_row.enrollment_id and l.registration_status='active' and l.status='rejected' and s.status<>'archived' and lower(trim(l.email))=lower(trim(p_recipient))) then return; end if;
  if v_row.email_recipient is not null and v_row.email_recipient<>p_recipient then return; end if;
  -- Resend retains idempotency keys for 24 hours. Never retry an uncertain send beyond that window.
  if v_row.email_first_attempt_at < now()-interval '23 hours' then
    update public.enrollment_followups set email_status='expired',email_error='已超過安全重試時限，請人工確認郵件紀錄；站內通知仍有效。' where id=p_id;
    return;
  end if;
  if v_row.email_status='sending' and v_row.email_attempt_at > now()-interval '60 seconds' then return; end if;
  return query update public.enrollment_followups set email_status='sending',email_error=null,
    email_attempt_at=clock_timestamp(),email_first_attempt_at=coalesce(email_first_attempt_at,now()),
    email_recipient=coalesce(email_recipient,p_recipient),email_payload=coalesce(email_payload,p_payload)
    where id=p_id returning *;
end $$;

revoke all on function public.check_in_student_course(uuid,uuid,date,uuid) from public,anon,authenticated;
grant execute on function public.check_in_student_course(uuid,uuid,date,uuid) to service_role;
revoke all on function public.approve_course_enrollment(uuid,text) from public,anon,authenticated;
grant execute on function public.approve_course_enrollment(uuid,text) to service_role;
revoke all on function public.schedule_course_makeup(uuid,uuid,date,uuid) from public,anon,authenticated;
grant execute on function public.schedule_course_makeup(uuid,uuid,date,uuid) to service_role;

-- Do not let a stale leave/makeup form operate after cancellation.
create trigger require_active_makeup before insert or update on public.course_makeup_requests
for each row when (new.status <> 'cancelled') execute function public.guard_active_enrollment_attendance();
