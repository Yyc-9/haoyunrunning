-- Minimal historical student index for secure email-based returning-student recognition.

create table if not exists public.legacy_students (
  email text primary key,
  name text not null,
  class_history text[] not null default '{}',
  latest_season text not null default '',
  source_status text not null default '',
  imported_at timestamptz not null default now(),
  constraint legacy_students_email_normalized check (email = lower(trim(email))),
  constraint legacy_students_email_shape check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint legacy_students_name_not_blank check (length(trim(name)) > 0)
);

alter table public.legacy_students enable row level security;

drop policy if exists "Legacy students are server only" on public.legacy_students;
create policy "Legacy students are server only"
on public.legacy_students
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

revoke all on table public.legacy_students from public, anon, authenticated;
grant select, insert, update, delete on table public.legacy_students to service_role;

comment on table public.legacy_students is
  'Private server-only index imported from historical enrollment records. Stores only email, name, and non-sensitive class history.';
