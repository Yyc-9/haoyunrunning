-- Signup lead collection table for anniversary activities and group training interest forms.
-- Run this file in Supabase SQL Editor before using /anniversary or /group-signup forms.

create table if not exists public.signup_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('anniversary_4th', 'group_class', 'course_payment')),
  name text not null,
  phone text default '',
  email text default '',
  instagram text default '',
  preferred_course text default '',
  running_experience text default '',
  goal text default '',
  companion_count text default '',
  amount_text text default '',
  notes text default '',
  status text not null default 'pending_transfer',
  transfer_last_five text default '',
  payment_submitted_at timestamptz,
  reminder_sent_at timestamptz,
  reviewed_at timestamptz,
  review_note text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.signup_leads
add column if not exists amount_text text default '';

alter table public.signup_leads
add column if not exists transfer_last_five text default '';

alter table public.signup_leads
drop constraint if exists signup_leads_source_check;

alter table public.signup_leads
add constraint signup_leads_source_check
check (source in ('anniversary_4th', 'group_class', 'course_payment'));

alter table public.signup_leads
add column if not exists payment_submitted_at timestamptz;

alter table public.signup_leads
add column if not exists reminder_sent_at timestamptz;

alter table public.signup_leads
add column if not exists reviewed_at timestamptz;

alter table public.signup_leads
add column if not exists review_note text default '';

alter table public.signup_leads
alter column status set default 'pending_transfer';

update public.signup_leads
set status = case
  when status in ('confirmed', 'approved') then 'approved'
  when status in ('closed', 'rejected') then 'rejected'
  when status in ('pending_review', 'contacted') then 'pending_review'
  else 'pending_transfer'
end
where status is null
  or status not in ('pending_transfer', 'pending_review', 'approved', 'rejected');

alter table public.signup_leads
drop constraint if exists signup_leads_status_check;

alter table public.signup_leads
add constraint signup_leads_status_check
check (status in ('pending_transfer', 'pending_review', 'approved', 'rejected'));

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
