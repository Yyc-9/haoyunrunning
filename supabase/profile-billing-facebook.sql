alter table public.profiles
  add column if not exists facebook text not null default '';

create table if not exists public.profile_billing_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  invoice_type text not null default 'none'
    check (invoice_type in ('none', 'carrier', 'tax_id')),
  invoice_carrier text not null default '',
  tax_id text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profile_billing_preferences enable row level security;

revoke all on table public.profile_billing_preferences from anon, authenticated;
grant select, insert, update, delete on table public.profile_billing_preferences to service_role;

drop policy if exists "Service role manages billing preferences" on public.profile_billing_preferences;
create policy "Service role manages billing preferences"
on public.profile_billing_preferences
for all
to service_role
using (true)
with check (true);
