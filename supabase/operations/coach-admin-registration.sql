-- Coach account registration and activation (server-only operation)
--
-- This file is intentionally an operations script, not an automatic migration.
-- Review it and run it only against the Good Luck Running Supabase project.
-- It contains no coach email addresses.  The seed copies only non-empty,
-- already stored coach_public_profiles.verification_email values.

create table if not exists public.coach_account_allowlist (
  id uuid primary key default gen_random_uuid(),
  coach_key text not null references public.coach_public_profiles(coach_key) on delete cascade,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'enabled', 'disabled')),
  profile_id uuid unique references public.profiles(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  enabled_at timestamptz,
  disabled_at timestamptz,
  disabled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_account_allowlist_email_normalized
    check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint coach_account_allowlist_coach_unique unique (coach_key),
  constraint coach_account_allowlist_email_unique unique (email)
);

comment on table public.coach_account_allowlist is
  'Server-only coach authorization source. Never expose this table to browser roles.';
comment on column public.coach_account_allowlist.email is
  'Normalized login email registered by an administrator; independent of editable profile fields.';

create index if not exists coach_account_allowlist_email_idx
  on public.coach_account_allowlist (email);
create index if not exists coach_account_allowlist_status_idx
  on public.coach_account_allowlist (status, created_at desc);

drop trigger if exists coach_account_allowlist_set_updated_at on public.coach_account_allowlist;
create trigger coach_account_allowlist_set_updated_at
before update on public.coach_account_allowlist
for each row execute function public.set_updated_at();

alter table public.coach_account_allowlist enable row level security;
revoke all on table public.coach_account_allowlist from public, anon, authenticated;
grant select, insert, update, delete on table public.coach_account_allowlist to service_role;

create table if not exists public.coach_account_audit_log (
  id uuid primary key default gen_random_uuid(),
  allowlist_id uuid references public.coach_account_allowlist(id) on delete set null,
  coach_key text not null,
  email text not null,
  action text not null check (action in (
    'registered',
    'activation_pending',
    'activated',
    'disabled',
    'enabled',
    'activation_rejected',
    'registration_rejected'
  )),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  previous_status text,
  next_status text,
  reason text not null default '',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.coach_account_audit_log is
  'Server-only immutable audit trail for coach account registration and state transitions.';

create index if not exists coach_account_audit_log_allowlist_idx
  on public.coach_account_audit_log (allowlist_id, created_at desc);
create index if not exists coach_account_audit_log_coach_idx
  on public.coach_account_audit_log (coach_key, created_at desc);

alter table public.coach_account_audit_log enable row level security;
revoke all on table public.coach_account_audit_log from public, anon, authenticated;
grant select, insert on table public.coach_account_audit_log to service_role;

-- Do not allow a browser client to create an elevated profile row.  The
-- service-side trigger creates student rows; coach/admin promotion below is
-- performed only by the locked server functions.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id and role = 'student'::public.app_role);

-- The existing handle_new_user trigger remains the source of default student
-- rows and existing admin-role allowlist behavior.  It never grants coach
-- access from user metadata.

-- Map a function error to an API-safe conflict without exposing internal SQL
-- details.  The route still logs the provider error server-side.
create or replace function public.coach_account_error_message(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_code
    when 'allowlist_missing' then '找不到這筆教練登記。'
    when 'allowlist_disabled' then '這筆教練登記已停用，必須由管理員重新啟用。'
    when 'email_mismatch' then '登入信箱與管理員登記信箱不符。'
    when 'email_unverified' then '請先完成這個登入信箱的驗證。'
    when 'profile_missing' then '登入帳號尚未建立跑者資料，請重新登入後再試。'
    when 'identity_collision' then '這個帳號已連結其他公開教練身份。'
    when 'identity_owned' then '這份公開教練身份已連結其他帳號。'
    when 'email_conflict' then '這個登入信箱已登記給其他公開教練身份。'
    when 'admin_protected' then '管理員帳號必須保留管理員權限，不能在這裡停用。'
    else '教練帳號操作被拒絕。'
  end;
$$;

revoke all on function public.coach_account_error_message(text) from public, anon, authenticated;
grant execute on function public.coach_account_error_message(text) to service_role;

-- Atomic link + enable.  Authentication itself is verified by the server
-- route using Supabase Auth; this function independently checks exact email,
-- confirmed-email input, current authorization status, and identity ownership.
-- It never trusts user_metadata or profiles.email as authorization evidence.
create or replace function public.activate_coach_allowlist(
  p_allowlist_id uuid,
  p_profile_id uuid,
  p_login_email text,
  p_email_confirmed boolean,
  p_actor_id uuid default null,
  p_reason text default 'verified_login'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowlist public.coach_account_allowlist%rowtype;
  v_profile public.profiles%rowtype;
  v_public public.coach_public_profiles%rowtype;
  v_email text := lower(btrim(coalesce(p_login_email, '')));
  v_previous_status text;
begin
  select * into v_allowlist
  from public.coach_account_allowlist
  where id = p_allowlist_id
  for update;
  if not found then
    raise exception 'allowlist_missing';
  end if;
  v_previous_status := v_allowlist.status;

  if v_allowlist.status = 'disabled' then
    raise exception 'allowlist_disabled';
  end if;
  if p_profile_id is null then
    raise exception 'profile_missing';
  end if;
  if v_allowlist.profile_id is not null and v_allowlist.profile_id <> p_profile_id then
    raise exception 'identity_collision';
  end if;
  if v_email = '' or v_email <> v_allowlist.email then
    raise exception 'email_mismatch';
  end if;
  if coalesce(p_email_confirmed, false) = false then
    insert into public.coach_account_audit_log (
      allowlist_id, coach_key, email, action, actor_profile_id,
      target_profile_id, previous_status, next_status, reason, metadata
    ) values (
      v_allowlist.id, v_allowlist.coach_key, v_allowlist.email,
      'activation_pending', p_actor_id, p_profile_id,
      v_previous_status, 'pending', 'email_unverified',
      jsonb_build_object('email_confirmed', false)
    );
    return jsonb_build_object('status', 'pending_email', 'coach_key', v_allowlist.coach_key);
  end if;

  -- A session heartbeat can call this route repeatedly.  Once the same
  -- profile/identity/role is already enabled, return without another audit
  -- row or mutation.
  if v_allowlist.status = 'enabled' and v_allowlist.profile_id = p_profile_id then
    select * into v_profile
    from public.profiles
    where id = p_profile_id
    for update;
    select * into v_public
    from public.coach_public_profiles
    where coach_key = v_allowlist.coach_key
    for update;
    if found and v_profile.role in ('coach', 'admin')
       and v_public.owner_profile_id = p_profile_id then
      return jsonb_build_object(
        'status', 'enabled',
        'coach_key', v_allowlist.coach_key,
        'profile_id', p_profile_id,
        'idempotent', true
      );
    end if;
  end if;

  select * into v_profile
  from public.profiles
  where id = p_profile_id
  for update;
  if not found then
    raise exception 'profile_missing';
  end if;
  if lower(btrim(v_profile.email)) <> v_allowlist.email
     and v_email <> v_allowlist.email then
    raise exception 'email_mismatch';
  end if;

  select * into v_public
  from public.coach_public_profiles
  where coach_key = v_allowlist.coach_key
  for update;
  if not found then
    raise exception 'allowlist_missing';
  end if;
  if v_public.owner_profile_id is not null and v_public.owner_profile_id <> p_profile_id then
    raise exception 'identity_owned';
  end if;
  if exists (
    select 1 from public.coach_public_profiles other
    where other.owner_profile_id = p_profile_id
      and other.coach_key <> v_allowlist.coach_key
  ) then
    raise exception 'identity_collision';
  end if;

  update public.profiles
  set email = v_email,
      role = (case when role = 'admin' then 'admin' else 'coach' end)::public.app_role
  where id = p_profile_id;

  update public.coach_public_profiles
  set owner_profile_id = p_profile_id
  where coach_key = v_allowlist.coach_key;

  update public.coach_account_allowlist
  set status = 'enabled',
      profile_id = p_profile_id,
      enabled_at = coalesce(enabled_at, now()),
      disabled_at = null,
      disabled_by = null,
      updated_at = now()
  where id = v_allowlist.id;

  insert into public.coach_account_audit_log (
    allowlist_id, coach_key, email, action, actor_profile_id,
    target_profile_id, previous_status, next_status, reason, metadata
  ) values (
    v_allowlist.id, v_allowlist.coach_key, v_allowlist.email,
    'activated', p_actor_id, p_profile_id,
    v_previous_status, 'enabled', coalesce(p_reason, ''),
    jsonb_build_object('profile_role_before', v_profile.role)
  );

  return jsonb_build_object(
    'status', 'enabled',
    'coach_key', v_allowlist.coach_key,
    'profile_id', p_profile_id
  );
exception
  when unique_violation then
    raise exception 'identity_collision';
end;
$$;

revoke all on function public.activate_coach_allowlist(uuid, uuid, text, boolean, uuid, text) from public, anon, authenticated;
grant execute on function public.activate_coach_allowlist(uuid, uuid, text, boolean, uuid, text) to service_role;

-- Administrator-only registration.  The server may pass a currently
-- registered, verified auth user discovered through auth.admin.listUsers;
-- otherwise this creates a pending first-login record.  The function itself
-- never queries or grants ordinary roles access to auth.users.
create or replace function public.register_coach_account(
  p_actor_id uuid,
  p_coach_key text,
  p_email text,
  p_profile_id uuid default null,
  p_email_confirmed boolean default false,
  p_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_allowlist public.coach_account_allowlist%rowtype;
  v_public public.coach_public_profiles%rowtype;
  v_existing public.coach_account_allowlist%rowtype;
begin
  if not exists (
    select 1 from public.profiles where id = p_actor_id and role = 'admin'
  ) then
    raise exception 'admin_required';
  end if;
  if p_coach_key is null or p_coach_key !~ '^[A-Za-z0-9-]{1,80}$' then
    raise exception 'allowlist_missing';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'email_conflict';
  end if;

  -- Lock the allowlist row before the public identity, matching activation's
  -- allowlist -> profile -> public order and avoiding registration/activation
  -- deadlocks.
  select * into v_existing
  from public.coach_account_allowlist
  where coach_key = p_coach_key
  for update;

  select * into v_public
  from public.coach_public_profiles
  where coach_key = p_coach_key
  for update;
  if not found then
    raise exception 'allowlist_missing';
  end if;
  if v_existing.id is not null and v_existing.status = 'disabled' then
    raise exception 'allowlist_disabled';
  end if;
  if v_existing.id is not null and v_existing.profile_id is not null then
    if p_profile_id is not null and v_existing.profile_id <> p_profile_id then
      raise exception 'identity_collision';
    end if;
    if v_existing.email <> v_email then
      raise exception 'email_conflict';
    end if;
  end if;
  if exists (
    select 1 from public.coach_account_allowlist other
    where other.email = v_email
      and (v_existing.id is null or other.id <> v_existing.id)
  ) then
    raise exception 'email_conflict';
  end if;
  if v_public.owner_profile_id is not null
     and (p_profile_id is null or v_public.owner_profile_id <> p_profile_id) then
    raise exception 'identity_owned';
  end if;

  if v_existing.id is not null then
    if v_existing.email <> v_email and v_existing.status = 'enabled' then
      raise exception 'email_conflict';
    end if;
    if v_existing.email <> v_email then
      update public.coach_account_allowlist
      set email = v_email, updated_at = now()
      where id = v_existing.id;
    end if;
    select * into v_allowlist from public.coach_account_allowlist where id = v_existing.id;
  else
    insert into public.coach_account_allowlist (coach_key, email, status, created_by)
    values (p_coach_key, v_email, 'pending', p_actor_id)
    returning * into v_allowlist;
  end if;

  insert into public.coach_account_audit_log (
    allowlist_id, coach_key, email, action, actor_profile_id,
    target_profile_id, previous_status, next_status, reason
  ) values (
    v_allowlist.id, v_allowlist.coach_key, v_allowlist.email,
    'registered', p_actor_id, p_profile_id,
    v_allowlist.status, v_allowlist.status, coalesce(p_note, '')
  );

  if p_profile_id is not null and coalesce(p_email_confirmed, false) then
    return public.activate_coach_allowlist(
      v_allowlist.id, p_profile_id, v_email, true, p_actor_id, 'admin_registration'
    );
  end if;

  return jsonb_build_object(
    'status', v_allowlist.status,
    'coach_key', v_allowlist.coach_key,
    'allowlist_id', v_allowlist.id
  );
exception
  when unique_violation then
    raise exception 'email_conflict';
end;
$$;

revoke all on function public.register_coach_account(uuid, text, text, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.register_coach_account(uuid, text, text, uuid, boolean, text) to service_role;

-- Explicit admin enable/disable.  Disable never auto-revives on a later
-- login; only this function may move a disabled record back to pending.
create or replace function public.set_coach_account_status(
  p_actor_id uuid,
  p_allowlist_id uuid,
  p_enabled boolean,
  p_profile_id uuid default null,
  p_login_email text default null,
  p_email_confirmed boolean default false,
  p_reason text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowlist public.coach_account_allowlist%rowtype;
  v_profile public.profiles%rowtype;
  v_previous_status text;
begin
  if not exists (
    select 1 from public.profiles where id = p_actor_id and role = 'admin'
  ) then
    raise exception 'admin_required';
  end if;
  select * into v_allowlist
  from public.coach_account_allowlist
  where id = p_allowlist_id
  for update;
  if not found then
    raise exception 'allowlist_missing';
  end if;
  v_previous_status := v_allowlist.status;

  if p_enabled and v_allowlist.profile_id is not null
     and p_profile_id is not null
     and v_allowlist.profile_id <> p_profile_id then
    raise exception 'identity_collision';
  end if;

  if not p_enabled then
    if v_allowlist.profile_id is not null then
      select * into v_profile from public.profiles where id = v_allowlist.profile_id for update;
      if found and v_profile.role = 'admin' then
        raise exception 'admin_protected';
      end if;
      if found and v_profile.role = 'coach' then
        update public.profiles set role = 'student' where id = v_profile.id;
      end if;
    end if;
    update public.coach_account_allowlist
    set status = 'disabled', disabled_at = now(), disabled_by = p_actor_id, updated_at = now()
    where id = v_allowlist.id;
    insert into public.coach_account_audit_log (
      allowlist_id, coach_key, email, action, actor_profile_id,
      target_profile_id, previous_status, next_status, reason
    ) values (
      v_allowlist.id, v_allowlist.coach_key, v_allowlist.email, 'disabled',
      p_actor_id, v_allowlist.profile_id, v_previous_status, 'disabled', coalesce(p_reason, '')
    );
    return jsonb_build_object('status', 'disabled', 'coach_key', v_allowlist.coach_key);
  end if;

  if v_allowlist.status <> 'disabled' then
    return jsonb_build_object('status', v_allowlist.status, 'coach_key', v_allowlist.coach_key);
  end if;

  update public.coach_account_allowlist
  set status = 'pending', disabled_at = null, disabled_by = null, updated_at = now()
  where id = v_allowlist.id;
  insert into public.coach_account_audit_log (
    allowlist_id, coach_key, email, action, actor_profile_id,
    target_profile_id, previous_status, next_status, reason
  ) values (
    v_allowlist.id, v_allowlist.coach_key, v_allowlist.email, 'enabled',
    p_actor_id, p_profile_id, v_previous_status, 'pending', coalesce(p_reason, '')
  );

  if p_profile_id is not null and coalesce(p_email_confirmed, false) then
    return public.activate_coach_allowlist(
      v_allowlist.id, p_profile_id, coalesce(p_login_email, v_allowlist.email),
      true, p_actor_id, 'admin_enable'
    );
  end if;
  return jsonb_build_object('status', 'pending', 'coach_key', v_allowlist.coach_key);
exception
  when unique_violation then
    raise exception 'identity_collision';
end;
$$;

revoke all on function public.set_coach_account_status(uuid, uuid, boolean, uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.set_coach_account_status(uuid, uuid, boolean, uuid, text, boolean, text) to service_role;

-- Idempotent initial seed.  It intentionally does not contain private email
-- literals and does not promote student profiles.  Existing linked coach/admin
-- identities become enabled only when their stored email matches exactly.
insert into public.coach_account_allowlist (coach_key, email, status, profile_id, enabled_at)
select
  public_profile.coach_key,
  lower(btrim(public_profile.verification_email)),
  case
    when public_profile.owner_profile_id is not null
      and owner_profile.id is not null
      and lower(btrim(owner_profile.email)) = lower(btrim(public_profile.verification_email))
      and owner_profile.role in ('coach', 'admin') then 'enabled'
    else 'pending'
  end,
  case
    when public_profile.owner_profile_id is not null
      and owner_profile.id is not null
      and lower(btrim(owner_profile.email)) = lower(btrim(public_profile.verification_email))
      and owner_profile.role in ('coach', 'admin') then owner_profile.id
    else null
  end,
  case
    when public_profile.owner_profile_id is not null
      and owner_profile.id is not null
      and lower(btrim(owner_profile.email)) = lower(btrim(public_profile.verification_email))
      and owner_profile.role in ('coach', 'admin') then now()
    else null
  end
from public.coach_public_profiles public_profile
left join public.profiles owner_profile on owner_profile.id = public_profile.owner_profile_id
where btrim(coalesce(public_profile.verification_email, '')) <> ''
on conflict (coach_key) do nothing;

-- Keep the public coach identity owner and independent authorization row
-- consistent for already-linked rows, without touching student profiles.
update public.coach_account_allowlist allowlist
set profile_id = public_profile.owner_profile_id,
    status = 'enabled',
    enabled_at = coalesce(allowlist.enabled_at, now()),
    updated_at = now()
from public.coach_public_profiles public_profile
join public.profiles owner_profile on owner_profile.id = public_profile.owner_profile_id
where allowlist.coach_key = public_profile.coach_key
  and allowlist.status <> 'disabled'
  and public_profile.owner_profile_id is not null
  and lower(btrim(allowlist.email)) = lower(btrim(public_profile.verification_email))
  and lower(btrim(owner_profile.email)) = lower(btrim(public_profile.verification_email))
  and owner_profile.role in ('coach', 'admin')
  and (allowlist.profile_id is null or allowlist.profile_id = public_profile.owner_profile_id);

-- Re-running this script is safe: existing allowlist rows and history remain,
-- while a disabled row is never re-enabled by the seed.

-- Safe review query for the two already-verified student accounts (and any
-- other pending rows).  This query is read-only and intentionally leaves the
-- actual profile/auth IDs to the server-side authenticated request:
-- select id, coach_key, email, status, profile_id
-- from public.coach_account_allowlist
-- where status = 'pending'
-- order by created_at;
--
-- For each verified user, the server checks auth.admin.getUserById(user.id),
-- requires email_confirmed_at and exact primary email, then calls
-- activate_coach_allowlist(id, user.id, user.email, true, admin_or_user_id,
-- 'verified_login').  Do not manually promote profiles or set owner_profile_id;
-- that RPC performs the atomic identity/role update and audit.  Unregistered
-- rows remain pending until that user's first verified login.
