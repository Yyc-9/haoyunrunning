create table if not exists public.admin_role_allowlist (
  email text primary key
    check (email <> '' and email = lower(btrim(email))),
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  note text not null default ''
);

comment on table public.admin_role_allowlist is
  'Server-managed email allowlist for granting the application admin role on first login.';

alter table public.admin_role_allowlist enable row level security;
revoke all on table public.admin_role_allowlist from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_role_allowlist to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(new.email, '')));
  initial_role public.app_role := 'student';
begin
  if exists (
    select 1
    from public.admin_role_allowlist
    where email = normalized_email
      and active = true
  ) then
    initial_role := 'admin';
  end if;

  insert into public.profiles (id, email, name, phone, pb, role)
  values (
    new.id,
    normalized_email,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'pb', ''),
    initial_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
