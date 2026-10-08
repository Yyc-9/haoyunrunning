alter table public.signup_leads add column if not exists admin_course_locked boolean not null default false;
create table if not exists public.admin_enrollment_transfer_audit (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.signup_leads(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null, previous_data jsonb not null, next_data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.admin_enrollment_transfer_audit enable row level security;
revoke all on public.admin_enrollment_transfer_audit from public,anon,authenticated;
grant select,insert on public.admin_enrollment_transfer_audit to service_role;
grant update on public.student_course_checkins to service_role;

create or replace function private.guard_admin_course_transfer() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.admin_course_locked and coalesce(current_setting('app.admin_course_transfer',true),'') <> 'on'
    and (new.course_season_course_id is distinct from old.course_season_course_id
      or new.course_slug is distinct from old.course_slug or new.season_id is distinct from old.season_id
      or new.admin_course_locked is distinct from old.admin_course_locked) then
    raise exception '此報名已由管理員轉班，請使用後台轉班功能修改，表格同步不能覆蓋。';
  end if;
  return new;
end;
$$;
create trigger guard_admin_course_transfer before update on public.signup_leads
for each row execute function private.guard_admin_course_transfer();

create or replace function public.admin_transfer_enrollment(
  p_actor_id uuid, p_enrollment_id uuid, p_target_id uuid, p_start_date date,
  p_mode text, p_date_map jsonb default '{}'::jsonb,
  p_reason text default '', p_fingerprint text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_lead public.signup_leads%rowtype;
  v_target public.course_season_courses%rowtype;
  v_previous jsonb; v_next jsonb; v_fingerprint text;
  v_attendance jsonb; v_checkins jsonb; v_deductions jsonb; v_makeups jsonb;
  v_dates text[]; v_date text; v_target_date date; v_taken integer;
begin
  if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception '只有超級管理員可以轉班。'; end if;
  select * into v_lead from public.signup_leads where id=p_enrollment_id for update;
  if not found or v_lead.source <> 'course_payment' or v_lead.registration_status <> 'active' then raise exception '找不到有效的課程報名。'; end if;
  if not exists(select 1 from public.course_seasons where id=v_lead.season_id and status in ('active','enrolling')) then raise exception '只能在招生中或進行中的季度轉班。'; end if;
  -- Serialize transfers into the same class and normal capacity-checked enrollment writes.
  select * into v_target from public.course_season_courses where id=p_target_id for update;
  if not found or v_target.season_id <> v_lead.season_id or v_target.id=v_lead.course_season_course_id then raise exception '請選擇同季度的另一個班級。'; end if;
  if p_mode is null or p_mode not in ('preserve_history','move_records') or jsonb_typeof(p_date_map) is distinct from 'object' then raise exception '出席紀錄處理方式無效。'; end if;
  if p_start_date is null or not coalesce(v_target.billing_config->'sessionDates' ? p_start_date::text,false) then raise exception '請選擇新班級的有效起始課次。'; end if;
  if exists(select 1 from public.course_session_cancellations where course_season_course_id=p_target_id and session_date=p_start_date) then raise exception '起始課次已停課。'; end if;
  if exists(select 1 from public.signup_leads where id<>v_lead.id and source='course_payment' and registration_status='active' and season_id=v_lead.season_id and course_season_course_id=p_target_id and lower(btrim(email))=lower(btrim(v_lead.email))) then raise exception '這位學員在新班級已有有效報名，請先處理重複資料。'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_lead.season_id::text || ':' || v_target.course_slug,0));
  select count(*) into v_taken from public.signup_leads where source='course_payment' and registration_status='active' and course_season_course_id=p_target_id and status in ('pending_transfer','pending_review','approved');
  if v_lead.status in ('pending_transfer','pending_review','approved') and v_taken >= v_target.capacity then raise exception '新班級已額滿。'; end if;

  perform id from public.course_attendance_records where enrollment_id=v_lead.id order by id for update;
  perform id from public.student_course_checkins where enrollment_id=v_lead.id order by id for update;
  perform id from public.course_attendance_deductions where enrollment_id=v_lead.id order by id for update;
  perform id from public.course_makeup_requests where enrollment_id=v_lead.id order by id for update;
  select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') into v_attendance from public.course_attendance_records t where enrollment_id=v_lead.id;
  select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') into v_checkins from public.student_course_checkins t where enrollment_id=v_lead.id;
  select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') into v_deductions from public.course_attendance_deductions t where enrollment_id=v_lead.id;
  select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') into v_makeups from public.course_makeup_requests t where enrollment_id=v_lead.id;
  select coalesce(array_agg(d order by d),'{}') into v_dates from (
    select session_date::text d from public.course_attendance_records where enrollment_id=v_lead.id and course_season_course_id=v_lead.course_season_course_id
    union select session_date::text from public.student_course_checkins where enrollment_id=v_lead.id and course_season_course_id=v_lead.course_season_course_id
    union select session_date::text from public.course_attendance_deductions where enrollment_id=v_lead.id and course_season_course_id=v_lead.course_season_course_id
    union select original_session_date::text from public.course_makeup_requests where enrollment_id=v_lead.id and original_course_season_course_id=v_lead.course_season_course_id
  ) dates;
  if p_mode='move_records' then
    if (select count(*) from jsonb_object_keys(p_date_map)) <> cardinality(v_dates) then raise exception '請為每個既有課次指定新班級課次。'; end if;
    if (select count(distinct value) from jsonb_each_text(p_date_map)) <> cardinality(v_dates) then raise exception '不能把兩個原課次合併到同一個新課次。'; end if;
    foreach v_date in array v_dates loop
      if not p_date_map ? v_date or not coalesce(v_target.billing_config->'sessionDates' ? (p_date_map->>v_date),false) then raise exception '出席紀錄的新課次不在目標班級日程中。'; end if;
      v_target_date := (p_date_map->>v_date)::date;
      if v_target_date < p_start_date then raise exception '移轉的出席課次不能早於新報名起始課次。'; end if;
      if exists(select 1 from public.course_session_cancellations where course_season_course_id=p_target_id and session_date=v_target_date) then raise exception '不能把出席紀錄移到停課課次。'; end if;
      if exists(select 1 from public.course_attendance_records where enrollment_id=v_lead.id and course_season_course_id=p_target_id and session_date=v_target_date)
        or exists(select 1 from public.student_course_checkins where enrollment_id=v_lead.id and course_season_course_id=p_target_id and session_date=v_target_date)
        or exists(select 1 from public.course_attendance_deductions where enrollment_id=v_lead.id and course_season_course_id=p_target_id and session_date=v_target_date)
        or exists(select 1 from public.course_makeup_requests where enrollment_id=v_lead.id and original_course_season_course_id=p_target_id and original_session_date=v_target_date) then
        raise exception '新課次已有出席或補課資料，請選擇其他對應課次。';
      end if;
    end loop;
    if exists(select 1 from public.course_makeup_requests where enrollment_id=v_lead.id and original_course_season_course_id=v_lead.course_season_course_id and target_course_season_course_id=p_target_id) then raise exception '有補課安排與新班級重疊，請先處理該補課紀錄。'; end if;
  end if;
  v_previous := jsonb_build_object('enrollment',to_jsonb(v_lead),'attendance',v_attendance,'checkins',v_checkins,'deductions',v_deductions,'makeups',v_makeups);
  v_next := jsonb_build_object('targetId',p_target_id,'courseName',coalesce(v_target.course_data->>'name',v_target.course_slug),'startDate',p_start_date,'mode',p_mode,'dateMap',p_date_map);
  v_fingerprint := md5((v_previous || jsonb_build_object('next',v_next,'target',to_jsonb(v_target)))::text);
  if p_fingerprint is null then
    return jsonb_build_object('fingerprint',v_fingerprint,'studentName',v_lead.name,'previousCourse',v_lead.preferred_course,'next',v_next,'paymentStatus',v_lead.status,'amountText',v_lead.amount_text,'dates',v_dates,
      'attendanceCount',jsonb_array_length(v_attendance),'checkinCount',jsonb_array_length(v_checkins),'makeupCount',jsonb_array_length(v_makeups));
  end if;
  if p_fingerprint <> v_fingerprint then raise exception '報名或出席資料已變更，請重新預覽。'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 800 then raise exception '請填寫轉班原因。'; end if;
  perform set_config('app.admin_course_transfer','on',true);
  update public.signup_leads set course_season_course_id=p_target_id,course_slug=v_target.course_slug,
    preferred_course=coalesce(v_target.course_data->>'name',v_target.course_slug),course_capacity=v_target.capacity,
    billing_start_session_date=p_start_date,admin_course_locked=true,
    payload=coalesce(payload,'{}'::jsonb)||jsonb_build_object('billingStartSessionDate',p_start_date,'adminCourseTransfer',v_next||jsonb_build_object('actorId',p_actor_id,'reason',p_reason,'at',now())),updated_at=now()
  where id=v_lead.id;
  if p_mode='move_records' then
    update public.course_makeup_requests set original_course_season_course_id=p_target_id,original_course_slug=v_target.course_slug,
      original_session_date=(p_date_map->>original_session_date::text)::date,updated_by=p_actor_id,updated_at=now()
    where enrollment_id=v_lead.id and original_course_season_course_id=v_lead.course_season_course_id;
    update public.student_course_checkins set course_season_course_id=p_target_id,session_date=(p_date_map->>session_date::text)::date
    where enrollment_id=v_lead.id and course_season_course_id=v_lead.course_season_course_id;
    update public.course_attendance_records set course_season_course_id=p_target_id,course_slug=v_target.course_slug,
      session_date=(p_date_map->>session_date::text)::date,updated_at=now()
    where enrollment_id=v_lead.id and course_season_course_id=v_lead.course_season_course_id;
    update public.course_attendance_deductions set course_season_course_id=p_target_id,course_slug=v_target.course_slug,
      session_date=(p_date_map->>session_date::text)::date,updated_at=now()
    where enrollment_id=v_lead.id and course_season_course_id=v_lead.course_season_course_id;
  end if;
  insert into public.admin_enrollment_transfer_audit(enrollment_id,actor_id,reason,previous_data,next_data)
    values(v_lead.id,p_actor_id,p_reason,v_previous,v_next);
  perform set_config('app.admin_course_transfer','off',true);
  return jsonb_build_object('transferred',true,'enrollmentId',v_lead.id,'next',v_next);
end;
$$;
revoke all on function public.admin_transfer_enrollment(uuid,uuid,uuid,date,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.admin_transfer_enrollment(uuid,uuid,uuid,date,text,jsonb,text,text) to service_role;
