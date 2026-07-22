create table if not exists public.internal_test_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null unique,
  active boolean not null default true,
  current_mode text not null default 'student' check (current_mode in ('student', 'coach')),
  assigned_course_slug text not null default 'zhubei-night-run-monday',
  sandbox_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.internal_test_accounts is
  'Server-only isolated test accounts. State in this table must never be mixed with production enrollment, attendance, coach identity, or payment data.';

alter table public.internal_test_accounts enable row level security;
revoke all on table public.internal_test_accounts from public, anon, authenticated;
grant all on table public.internal_test_accounts to service_role;

insert into public.internal_test_accounts (profile_id, email, active, current_mode, assigned_course_slug)
select id, lower(email), true, 'student', 'zhubei-night-run-monday'
from public.profiles
where lower(email) = '779374913@qq.com'
on conflict (profile_id) do update
set email = excluded.email,
    active = true,
    assigned_course_slug = excluded.assigned_course_slug,
    updated_at = now();
