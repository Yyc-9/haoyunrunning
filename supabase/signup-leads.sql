-- Signup lead collection table for anniversary activities and group training interest forms.
-- Run this file in Supabase SQL Editor before using /anniversary or /group-signup forms.

create table if not exists public.signup_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('anniversary_4th', 'group_class')),
  name text not null,
  phone text default '',
  email text default '',
  instagram text default '',
  preferred_course text default '',
  running_experience text default '',
  goal text default '',
  companion_count text default '',
  notes text default '',
  status text not null default 'new',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signup_leads_source_created_at_idx
on public.signup_leads (source, created_at desc);

drop trigger if exists signup_leads_set_updated_at on public.signup_leads;

create trigger signup_leads_set_updated_at
before update on public.signup_leads
for each row execute function public.set_updated_at();

alter table public.signup_leads enable row level security;

create policy "signup_leads_admin_select"
on public.signup_leads for select
using (public.is_admin(auth.uid()));

create policy "signup_leads_admin_update"
on public.signup_leads for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "signup_leads_admin_delete"
on public.signup_leads for delete
using (public.is_admin(auth.uid()));
