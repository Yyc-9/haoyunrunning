-- Limit each account to the two most recently active Supabase sessions.
create table if not exists public.user_device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null unique,
  device_label text not null default '',
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_device_sessions_user_id_idx
  on public.user_device_sessions (user_id, last_seen_at desc);

alter table public.user_device_sessions enable row level security;
revoke all on public.user_device_sessions from anon, authenticated;
grant all on public.user_device_sessions to service_role;

create or replace function public.register_user_device_session(
  p_user_id uuid,
  p_session_id uuid,
  p_device_label text default ''
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revoked_at timestamptz;
  v_old_session record;
begin
  select revoked_at
    into v_revoked_at
    from public.user_device_sessions
   where session_id = p_session_id;

  if found and v_revoked_at is not null then
    return false;
  end if;

  if not exists (
    select 1
      from auth.sessions
     where id = p_session_id
       and user_id = p_user_id
  ) then
    return false;
  end if;

  insert into public.user_device_sessions (
    user_id,
    session_id,
    device_label,
    last_seen_at,
    revoked_at
  ) values (
    p_user_id,
    p_session_id,
    left(coalesce(p_device_label, ''), 240),
    now(),
    null
  )
  on conflict (session_id) do update
    set device_label = case
          when excluded.device_label = '' then public.user_device_sessions.device_label
          else excluded.device_label
        end,
        last_seen_at = now();

  for v_old_session in
    select sessions.id
      from auth.sessions as sessions
     where sessions.user_id = p_user_id
       and sessions.id <> p_session_id
     order by coalesce(
       sessions.refreshed_at::timestamptz,
       sessions.updated_at,
       sessions.created_at
     ) desc
     offset 1
  loop
    insert into public.user_device_sessions (
      user_id,
      session_id,
      last_seen_at,
      revoked_at
    ) values (
      p_user_id,
      v_old_session.id,
      now(),
      now()
    )
    on conflict (session_id) do update
      set revoked_at = coalesce(public.user_device_sessions.revoked_at, now());

    delete from auth.sessions where id = v_old_session.id;
  end loop;

  return true;
end;
$$;

revoke all on function public.register_user_device_session(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.register_user_device_session(uuid, uuid, text) to service_role;

-- Invite redemption is handled through server-side API routes only.
drop policy if exists "coach_invites_select_unused_for_signed_in" on public.coach_invites;
revoke all on public.coach_invites from anon, authenticated;
grant all on public.coach_invites to service_role;
