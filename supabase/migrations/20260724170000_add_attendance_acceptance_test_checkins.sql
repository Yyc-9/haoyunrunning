create table if not exists public.site_acceptance_test_checkins (
  id uuid primary key default gen_random_uuid(),
  test_key text not null,
  participant_profile_id uuid not null references public.profiles(id) on delete cascade,
  participant_role text not null check (participant_role in ('coach', 'student')),
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (test_key, participant_profile_id, participant_role)
);

comment on table public.site_acceptance_test_checkins is
  'Server-only website acceptance-test check-ins. These records must never be included in official course attendance, coach duty, payroll, or enrollment statistics.';

create index if not exists site_acceptance_test_checkins_key_role_idx
on public.site_acceptance_test_checkins (test_key, participant_role, checked_in_at);

alter table public.site_acceptance_test_checkins enable row level security;
revoke all on table public.site_acceptance_test_checkins from public, anon, authenticated;
grant all on table public.site_acceptance_test_checkins to service_role;
