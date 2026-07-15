create table if not exists public.course_attendance_records (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.course_seasons(id) on delete cascade,
  course_season_course_id uuid not null references public.course_season_courses(id) on delete cascade,
  course_slug text not null,
  session_date date not null,
  enrollment_id uuid not null references public.signup_leads(id) on delete cascade,
  student_email text not null default '',
  student_name text not null default '',
  status text not null check (status in ('present', 'absent', 'excused')),
  note text not null default '',
  marked_by uuid not null references public.profiles(id) on delete restrict,
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_season_course_id, session_date, enrollment_id)
);

create index if not exists course_attendance_course_session_idx
on public.course_attendance_records (course_season_course_id, session_date, status);

create index if not exists course_attendance_enrollment_idx
on public.course_attendance_records (enrollment_id, session_date desc);

alter table public.course_attendance_records enable row level security;
revoke all on table public.course_attendance_records from public, anon, authenticated;
grant all on table public.course_attendance_records to service_role;

create table if not exists public.course_attendance_resolutions (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null unique references public.course_attendance_records(id) on delete cascade,
  enrollment_id uuid not null references public.signup_leads(id) on delete cascade,
  outcome text not null check (outcome in ('supplement_paid', 'waived')),
  note text not null default '',
  resolved_by uuid not null references public.profiles(id) on delete restrict,
  resolved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_attendance_resolutions_enrollment_idx
on public.course_attendance_resolutions (enrollment_id, resolved_at desc);

alter table public.course_attendance_resolutions enable row level security;
revoke all on table public.course_attendance_resolutions from public, anon, authenticated;
grant all on table public.course_attendance_resolutions to service_role;

create or replace function private.sync_course_attendance_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.signup_leads
    set attendance_verification_status = 'pending', updated_at = now()
    where id = old.enrollment_id
      and prior_attendance_claimed = true
      and billing_start_session_date = old.session_date;
  end if;

  if tg_op <> 'DELETE' then
    update public.signup_leads
    set
      attendance_verification_status = case when new.status = 'present' then 'verified' else 'rejected' end,
      updated_at = now()
    where id = new.enrollment_id
      and prior_attendance_claimed = true
      and billing_start_session_date = new.session_date;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.sync_course_attendance_verification() from public, anon, authenticated;

drop trigger if exists sync_course_attendance_verification on public.course_attendance_records;
create trigger sync_course_attendance_verification
after insert or update or delete on public.course_attendance_records
for each row execute function private.sync_course_attendance_verification();

update public.signup_leads
set attendance_verification_status = 'pending', updated_at = now()
where source = 'course_payment'
  and prior_attendance_claimed = true
  and attendance_verification_status = 'verified';

create or replace function public.approve_course_enrollment(
  p_lead_id uuid,
  p_review_note text default ''
)
returns jsonb
language plpgsql
set search_path = ''
as $$
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

  select count(*)::integer
  into v_paid_count
  from public.signup_leads
  where source = 'course_payment'
    and season_id is not distinct from v_lead.season_id
    and course_slug = v_lead.course_slug
    and status = 'approved'
    and id <> p_lead_id;

  if v_paid_count >= v_capacity then
    raise exception 'course capacity reached';
  end if;

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
$$;

revoke all on function public.approve_course_enrollment(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_course_enrollment(uuid, text) to service_role;
