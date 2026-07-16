alter table public.course_attendance_records
drop constraint if exists course_attendance_records_status_check;

alter table public.course_attendance_records
add constraint course_attendance_records_status_check
check (status in ('present', 'absent', 'excused', 'makeup'));

create table if not exists public.course_attendance_deductions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.course_seasons(id) on delete cascade,
  course_season_course_id uuid not null references public.course_season_courses(id) on delete cascade,
  course_slug text not null,
  session_date date not null,
  enrollment_id uuid not null references public.signup_leads(id) on delete cascade,
  deducted_by uuid not null references public.profiles(id) on delete restrict,
  deducted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_season_course_id, session_date, enrollment_id)
);

create index if not exists course_attendance_deductions_enrollment_idx
on public.course_attendance_deductions (enrollment_id, session_date desc);

create index if not exists course_attendance_deductions_marked_by_idx
on public.course_attendance_deductions (deducted_by);

alter table public.course_attendance_deductions enable row level security;
revoke all on table public.course_attendance_deductions from public, anon, authenticated;
grant all on table public.course_attendance_deductions to service_role;

create table if not exists public.course_session_cancellations (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.course_seasons(id) on delete cascade,
  course_season_course_id uuid not null references public.course_season_courses(id) on delete cascade,
  course_slug text not null,
  session_date date not null,
  reason text not null default '',
  cancelled_by uuid not null references public.profiles(id) on delete restrict,
  cancelled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_season_course_id, session_date)
);

create index if not exists course_session_cancellations_marked_by_idx
on public.course_session_cancellations (cancelled_by);

alter table public.course_session_cancellations enable row level security;
revoke all on table public.course_session_cancellations from public, anon, authenticated;
grant all on table public.course_session_cancellations to service_role;
