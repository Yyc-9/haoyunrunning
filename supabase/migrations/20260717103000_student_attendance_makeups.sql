create table if not exists public.course_attendance_audit_log (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid,
  season_id uuid not null,
  course_season_course_id uuid not null,
  session_date date not null,
  enrollment_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  previous_status text,
  next_status text,
  actor_profile_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists course_attendance_audit_enrollment_idx
on public.course_attendance_audit_log (enrollment_id, created_at desc);

create index if not exists course_attendance_audit_course_session_idx
on public.course_attendance_audit_log (course_season_course_id, session_date, created_at desc);

alter table public.course_attendance_audit_log enable row level security;
revoke all on table public.course_attendance_audit_log from public, anon, authenticated;
grant all on table public.course_attendance_audit_log to service_role;

create or replace function private.audit_course_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.course_attendance_records%rowtype;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  insert into public.course_attendance_audit_log (
    attendance_id,
    season_id,
    course_season_course_id,
    session_date,
    enrollment_id,
    action,
    previous_status,
    next_status,
    actor_profile_id
  ) values (
    case when tg_op = 'DELETE' then null else v_row.id end,
    v_row.season_id,
    v_row.course_season_course_id,
    v_row.session_date,
    v_row.enrollment_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then old.status else null end,
    case when tg_op in ('INSERT', 'UPDATE') then new.status else null end,
    v_row.marked_by
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.audit_course_attendance_change() from public, anon, authenticated;

drop trigger if exists audit_course_attendance_change on public.course_attendance_records;
create trigger audit_course_attendance_change
after insert or update or delete on public.course_attendance_records
for each row execute function private.audit_course_attendance_change();

alter table public.course_attendance_records
drop constraint if exists course_attendance_records_status_check;

update public.course_attendance_records
set
  status = case status when 'makeup' then 'present' when 'absent' then 'deducted' else status end,
  note = case
    when status = 'makeup' then concat_ws(E'\n', nullif(note, ''), '系統保留：此筆原為舊版「補課」點名狀態。')
    when status = 'absent' then concat_ws(E'\n', nullif(note, ''), '系統保留：此筆原為舊版「缺席」點名狀態。')
    else note
  end,
  updated_at = now()
where status in ('makeup', 'absent');

insert into public.course_attendance_records (
  season_id,
  course_season_course_id,
  course_slug,
  session_date,
  enrollment_id,
  student_email,
  student_name,
  status,
  note,
  marked_by,
  marked_at,
  updated_at
)
select
  deduction.season_id,
  deduction.course_season_course_id,
  deduction.course_slug,
  deduction.session_date,
  deduction.enrollment_id,
  coalesce(lead.email, ''),
  coalesce(lead.name, ''),
  'deducted',
  '系統保留：由舊版獨立扣課紀錄轉入。',
  deduction.deducted_by,
  deduction.deducted_at,
  deduction.updated_at
from public.course_attendance_deductions as deduction
join public.signup_leads as lead on lead.id = deduction.enrollment_id
on conflict (course_season_course_id, session_date, enrollment_id)
do update set
  status = 'deducted',
  note = concat_ws(E'\n', nullif(public.course_attendance_records.note, ''), '系統保留：本筆含舊版獨立扣課紀錄。'),
  marked_by = excluded.marked_by,
  marked_at = excluded.marked_at,
  updated_at = excluded.updated_at;

alter table public.course_attendance_records
add constraint course_attendance_records_status_check
check (status in ('present', 'excused', 'deducted'));

create table if not exists public.course_makeup_requests (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.course_seasons(id) on delete cascade,
  enrollment_id uuid not null references public.signup_leads(id) on delete cascade,
  original_course_season_course_id uuid not null references public.course_season_courses(id) on delete cascade,
  original_course_slug text not null,
  original_session_date date not null,
  target_course_season_course_id uuid references public.course_season_courses(id) on delete restrict,
  target_course_slug text,
  target_session_date date,
  status text not null default 'leave_requested'
    check (status in ('leave_requested', 'scheduled', 'completed', 'forfeited', 'cancelled', 'needs_reselection')),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (season_id, enrollment_id, original_course_season_course_id, original_session_date),
  check (
    (target_course_season_course_id is null and target_course_slug is null and target_session_date is null)
    or
    (target_course_season_course_id is not null and target_course_slug is not null and target_session_date is not null)
  ),
  check (target_course_season_course_id is null or target_course_season_course_id <> original_course_season_course_id)
);

create index if not exists course_makeup_requests_enrollment_idx
on public.course_makeup_requests (enrollment_id, original_session_date desc);

create index if not exists course_makeup_requests_target_session_idx
on public.course_makeup_requests (target_course_season_course_id, target_session_date, status);

create unique index if not exists course_makeup_requests_one_target_per_student_idx
on public.course_makeup_requests (enrollment_id, target_course_season_course_id, target_session_date)
where status in ('scheduled', 'completed');

alter table public.course_makeup_requests enable row level security;
revoke all on table public.course_makeup_requests from public, anon, authenticated;
grant all on table public.course_makeup_requests to service_role;

create table if not exists public.course_makeup_request_audit_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  season_id uuid not null,
  enrollment_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  previous_status text,
  next_status text,
  previous_target_course_id uuid,
  next_target_course_id uuid,
  previous_target_session_date date,
  next_target_session_date date,
  actor_profile_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists course_makeup_request_audit_enrollment_idx
on public.course_makeup_request_audit_log (enrollment_id, created_at desc);

alter table public.course_makeup_request_audit_log enable row level security;
revoke all on table public.course_makeup_request_audit_log from public, anon, authenticated;
grant all on table public.course_makeup_request_audit_log to service_role;

create or replace function private.audit_course_makeup_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.course_makeup_requests%rowtype;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  insert into public.course_makeup_request_audit_log (
    request_id,
    season_id,
    enrollment_id,
    action,
    previous_status,
    next_status,
    previous_target_course_id,
    next_target_course_id,
    previous_target_session_date,
    next_target_session_date,
    actor_profile_id
  ) values (
    case when tg_op = 'DELETE' then null else v_row.id end,
    v_row.season_id,
    v_row.enrollment_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then old.status else null end,
    case when tg_op in ('INSERT', 'UPDATE') then new.status else null end,
    case when tg_op in ('UPDATE', 'DELETE') then old.target_course_season_course_id else null end,
    case when tg_op in ('INSERT', 'UPDATE') then new.target_course_season_course_id else null end,
    case when tg_op in ('UPDATE', 'DELETE') then old.target_session_date else null end,
    case when tg_op in ('INSERT', 'UPDATE') then new.target_session_date else null end,
    v_row.updated_by
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.audit_course_makeup_request_change() from public, anon, authenticated;

drop trigger if exists audit_course_makeup_request_change on public.course_makeup_requests;
create trigger audit_course_makeup_request_change
after insert or update or delete on public.course_makeup_requests
for each row execute function private.audit_course_makeup_request_change();

create or replace function public.request_course_leave(
  p_season_id uuid,
  p_enrollment_id uuid,
  p_course_season_course_id uuid,
  p_course_slug text,
  p_session_date date,
  p_actor_profile_id uuid,
  p_student_email text,
  p_student_name text
)
returns public.course_makeup_requests
language plpgsql
set search_path = ''
as $$
declare
  v_request public.course_makeup_requests%rowtype;
  v_attendance public.course_attendance_records%rowtype;
begin
  select * into v_attendance
  from public.course_attendance_records
  where course_season_course_id = p_course_season_course_id
    and session_date = p_session_date
    and enrollment_id = p_enrollment_id
  for update;

  if found and v_attendance.status in ('present', 'deducted') then
    raise exception 'attendance is already finalized';
  end if;

  select * into v_request
  from public.course_makeup_requests
  where season_id = p_season_id
    and enrollment_id = p_enrollment_id
    and original_course_season_course_id = p_course_season_course_id
    and original_session_date = p_session_date
  for update;

  if found and v_request.status in ('completed', 'forfeited') then
    raise exception 'makeup request is already finalized';
  end if;

  insert into public.course_attendance_records (
    season_id,
    course_season_course_id,
    course_slug,
    session_date,
    enrollment_id,
    student_email,
    student_name,
    status,
    note,
    marked_by,
    marked_at,
    updated_at
  ) values (
    p_season_id,
    p_course_season_course_id,
    p_course_slug,
    p_session_date,
    p_enrollment_id,
    p_student_email,
    p_student_name,
    'excused',
    '學員於網站提出請假。',
    p_actor_profile_id,
    now(),
    now()
  )
  on conflict (course_season_course_id, session_date, enrollment_id)
  do update set
    status = 'excused',
    note = '學員於網站提出請假。',
    marked_by = p_actor_profile_id,
    marked_at = now(),
    updated_at = now();

  insert into public.course_makeup_requests (
    season_id,
    enrollment_id,
    original_course_season_course_id,
    original_course_slug,
    original_session_date,
    status,
    requested_by,
    requested_at,
    updated_by,
    updated_at
  ) values (
    p_season_id,
    p_enrollment_id,
    p_course_season_course_id,
    p_course_slug,
    p_session_date,
    'leave_requested',
    p_actor_profile_id,
    now(),
    p_actor_profile_id,
    now()
  )
  on conflict (season_id, enrollment_id, original_course_season_course_id, original_session_date)
  do update set
    status = case
      when public.course_makeup_requests.status = 'scheduled' then 'scheduled'
      else 'leave_requested'
    end,
    target_course_season_course_id = case
      when public.course_makeup_requests.status = 'scheduled' then public.course_makeup_requests.target_course_season_course_id
      else null
    end,
    target_course_slug = case
      when public.course_makeup_requests.status = 'scheduled' then public.course_makeup_requests.target_course_slug
      else null
    end,
    target_session_date = case
      when public.course_makeup_requests.status = 'scheduled' then public.course_makeup_requests.target_session_date
      else null
    end,
    requested_by = p_actor_profile_id,
    requested_at = now(),
    updated_by = p_actor_profile_id,
    updated_at = now()
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.request_course_leave(uuid, uuid, uuid, text, date, uuid, text, text) from public, anon, authenticated;
grant execute on function public.request_course_leave(uuid, uuid, uuid, text, date, uuid, text, text) to service_role;

create or replace function public.cancel_course_leave(
  p_request_id uuid,
  p_actor_profile_id uuid
)
returns public.course_makeup_requests
language plpgsql
set search_path = ''
as $$
declare
  v_request public.course_makeup_requests%rowtype;
  v_attendance public.course_attendance_records%rowtype;
begin
  select * into v_request
  from public.course_makeup_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'makeup request not found';
  end if;

  if v_request.status in ('completed', 'forfeited') then
    raise exception 'makeup request is already finalized';
  end if;

  select * into v_attendance
  from public.course_attendance_records
  where course_season_course_id = v_request.original_course_season_course_id
    and session_date = v_request.original_session_date
    and enrollment_id = v_request.enrollment_id
  for update;

  if found and v_attendance.status <> 'excused' then
    raise exception 'attendance is already finalized';
  end if;

  delete from public.course_attendance_records
  where course_season_course_id = v_request.original_course_season_course_id
    and session_date = v_request.original_session_date
    and enrollment_id = v_request.enrollment_id
    and status = 'excused';

  update public.course_makeup_requests
  set
    target_course_season_course_id = null,
    target_course_slug = null,
    target_session_date = null,
    status = 'cancelled',
    updated_by = p_actor_profile_id,
    updated_at = now()
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.cancel_course_leave(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_course_leave(uuid, uuid) to service_role;

create or replace function public.schedule_course_makeup(
  p_request_id uuid,
  p_target_course_season_course_id uuid,
  p_target_session_date date,
  p_actor_profile_id uuid
)
returns public.course_makeup_requests
language plpgsql
set search_path = ''
as $$
declare
  v_request public.course_makeup_requests%rowtype;
  v_target public.course_season_courses%rowtype;
  v_approved_count integer;
  v_makeup_count integer;
begin
  select * into v_request
  from public.course_makeup_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'makeup request not found';
  end if;

  if v_request.status not in ('leave_requested', 'scheduled', 'needs_reselection') then
    raise exception 'makeup request cannot be scheduled';
  end if;

  select * into v_target
  from public.course_season_courses
  where id = p_target_course_season_course_id
  for update;

  if not found or v_target.season_id <> v_request.season_id then
    raise exception 'makeup target is outside current season';
  end if;

  if v_target.id = v_request.original_course_season_course_id then
    raise exception 'makeup target must be another class';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_target.id::text || ':' || p_target_session_date::text, 0));

  select count(*) into v_approved_count
  from public.signup_leads
  where source = 'course_payment'
    and season_id = v_request.season_id
    and course_season_course_id = v_target.id
    and status = 'approved';

  select count(*) into v_makeup_count
  from public.course_makeup_requests
  where target_course_season_course_id = v_target.id
    and target_session_date = p_target_session_date
    and status = 'scheduled'
    and id <> v_request.id;

  if v_approved_count + v_makeup_count >= v_target.capacity then
    raise exception 'makeup target capacity reached';
  end if;

  update public.course_makeup_requests
  set
    target_course_season_course_id = v_target.id,
    target_course_slug = v_target.course_slug,
    target_session_date = p_target_session_date,
    status = 'scheduled',
    updated_by = p_actor_profile_id,
    updated_at = now()
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.schedule_course_makeup(uuid, uuid, date, uuid) from public, anon, authenticated;
grant execute on function public.schedule_course_makeup(uuid, uuid, date, uuid) to service_role;
