alter table public.course_season_courses
add column if not exists start_time time;

alter table public.course_season_courses
add column if not exists time_zone text not null default 'Asia/Taipei';

alter table public.course_season_courses
drop constraint if exists course_season_courses_time_zone_check;

alter table public.course_season_courses
add constraint course_season_courses_time_zone_check
check (time_zone = 'Asia/Taipei');

-- One-time initialization from the existing admin-maintained display value.
-- Runtime attendance rules use start_time only and never parse classTime.
update public.course_season_courses
set start_time = substring(course_data ->> 'classTime' from '([012][0-9]:[0-5][0-9])')::time
where start_time is null
  and coalesce(course_data ->> 'classTime', '') ~ '([01][0-9]|2[0-3]):[0-5][0-9]';

create table if not exists public.coach_session_assignments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.course_seasons(id) on delete cascade,
  course_season_course_id uuid not null references public.course_season_courses(id) on delete cascade,
  course_slug text not null,
  session_date date not null,
  scheduled_coach_id uuid not null references public.profiles(id) on delete restrict,
  actual_coach_id uuid references public.profiles(id) on delete restrict,
  coach_role text not null default 'coach' check (coach_role in ('head_coach', 'coach', 'assistant', 'substitute')),
  leave_status text not null default 'none' check (leave_status in ('none', 'requested', 'approved', 'rejected')),
  leave_reason text not null default '',
  leave_requested_at timestamptz,
  recommended_substitute_id uuid references public.profiles(id) on delete set null,
  substitute_coach_id uuid references public.profiles(id) on delete set null,
  substitute_response text not null default 'none' check (substitute_response in ('none', 'pending', 'accepted', 'rejected')),
  substitute_responded_at timestamptz,
  admin_status text not null default 'not_required' check (admin_status in ('not_required', 'pending', 'approved', 'rejected')),
  admin_reviewed_by uuid references public.profiles(id) on delete set null,
  admin_reviewed_at timestamptz,
  admin_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_season_course_id, session_date, scheduled_coach_id)
);

create index if not exists coach_session_assignments_scheduled_idx
on public.coach_session_assignments (scheduled_coach_id, session_date desc);

create index if not exists coach_session_assignments_actual_idx
on public.coach_session_assignments (actual_coach_id, session_date desc)
where actual_coach_id is not null;

create index if not exists coach_session_assignments_admin_idx
on public.coach_session_assignments (session_date desc, leave_status, substitute_response);

drop trigger if exists coach_session_assignments_set_updated_at on public.coach_session_assignments;
create trigger coach_session_assignments_set_updated_at
before update on public.coach_session_assignments
for each row execute function public.set_updated_at();

create table if not exists public.coach_session_checkins (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.coach_session_assignments(id) on delete cascade,
  actual_coach_id uuid not null references public.profiles(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  punctuality text not null check (punctuality in ('on_time', 'late')),
  manual_correction boolean not null default false,
  corrected_by uuid references public.profiles(id) on delete set null,
  corrected_at timestamptz,
  correction_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_session_checkins_coach_idx
on public.coach_session_checkins (actual_coach_id, checked_in_at desc);

drop trigger if exists coach_session_checkins_set_updated_at on public.coach_session_checkins;
create trigger coach_session_checkins_set_updated_at
before update on public.coach_session_checkins
for each row execute function public.set_updated_at();

create table if not exists public.coach_session_duty_audit_log (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.coach_session_assignments(id) on delete cascade,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  reason text not null default '',
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists coach_session_duty_audit_assignment_idx
on public.coach_session_duty_audit_log (assignment_id, created_at desc);

alter table public.coach_session_assignments enable row level security;
alter table public.coach_session_checkins enable row level security;
alter table public.coach_session_duty_audit_log enable row level security;

revoke all on table public.coach_session_assignments from public, anon, authenticated;
revoke all on table public.coach_session_checkins from public, anon, authenticated;
revoke all on table public.coach_session_duty_audit_log from public, anon, authenticated;
grant all on table public.coach_session_assignments to service_role;
grant all on table public.coach_session_checkins to service_role;
grant all on table public.coach_session_duty_audit_log to service_role;
