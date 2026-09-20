-- Only the server may access this singleton; public output passes through the existing payment APIs.
create table public.payment_display_settings (
  id boolean primary key default true check (id),
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.payment_display_settings enable row level security;
revoke all on public.payment_display_settings from public, anon, authenticated;
grant select, insert, update on public.payment_display_settings to service_role;
