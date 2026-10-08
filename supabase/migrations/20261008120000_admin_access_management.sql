-- Application admin access is resolved from authoritative Auth data. Explicit
-- revocation wins over environment bootstrap emails and existing profile roles.
create table public.admin_account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null,
  updated_at timestamptz not null default now()
);
create table public.admin_access_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  email text not null,
  target_id uuid references auth.users(id) on delete set null,
  active boolean not null,
  reason text not null,
  previous_data jsonb not null,
  next_data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.admin_account_access enable row level security;
alter table public.admin_access_audit enable row level security;
revoke all on public.admin_account_access, public.admin_access_audit from public, anon, authenticated;
grant select, insert, update on public.admin_account_access to service_role;
grant select, insert on public.admin_access_audit to service_role;

create or replace function public.resolve_account_role(p_user_id uuid, p_env_emails text[] default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user auth.users%rowtype;
  v_profile public.profiles%rowtype;
  v_email text;
  v_allow boolean;
  v_account boolean;
  v_role public.app_role;
begin
  perform pg_advisory_xact_lock(hashtextextended('admin_access_management', 0));
  select * into v_user from auth.users where id = p_user_id;
  if not found then return null; end if;
  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then return null; end if;
  v_email := lower(btrim(coalesce(v_user.email, '')));
  select active into v_allow from public.admin_role_allowlist where email = v_email;
  select active into v_account from public.admin_account_access where user_id = p_user_id;
  v_role := v_profile.role;
  if v_user.email_confirmed_at is not null and v_email <> ''
    and v_allow is distinct from false and v_account is distinct from false
    and (v_allow is true or v_account is true or v_profile.role = 'admin' or v_email = any(p_env_emails)) then
    v_role := 'admin';
  elsif v_profile.role = 'admin' then
    v_role := case when exists (
      select 1 from public.coach_account_allowlist a
      where a.profile_id = p_user_id and a.status = 'enabled'
    ) then 'coach'::public.app_role else 'student'::public.app_role end;
  end if;
  if v_role is distinct from v_profile.role then
    update public.profiles set role = v_role where id = p_user_id;
  end if;
  return jsonb_build_object('id', p_user_id, 'role', v_role, 'email', v_email, 'name', v_profile.name);
end;
$$;
revoke all on function public.resolve_account_role(uuid,text[]) from public, anon, authenticated;
grant execute on function public.resolve_account_role(uuid,text[]) to service_role;

create or replace function public.admin_set_access(p_actor_id uuid, p_email text, p_active boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_actor jsonb;
  v_user auth.users%rowtype;
  v_count integer;
  v_previous jsonb;
  v_next jsonb;
  v_profile jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('admin_access_management', 0));
  v_actor := public.resolve_account_role(p_actor_id);
  if v_actor is null or v_actor->>'role' <> 'admin' then raise exception 'admin_required'; end if;
  if p_active is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(v_email) > 254 then raise exception 'invalid_admin_email'; end if;
  if btrim(coalesce(p_reason,'')) = '' or length(p_reason) > 800 then raise exception 'admin_reason_required'; end if;
  -- Auth can contain identities from multiple providers; never pick an arbitrary duplicate.
  select count(*) into v_count from auth.users where lower(btrim(email)) = v_email;
  if v_count > 1 then raise exception 'admin_email_conflict'; end if;
  select * into v_user from auth.users where lower(btrim(email)) = v_email for update;
  if not p_active and (v_user.id = p_actor_id or v_email = v_actor->>'email') then
    raise exception 'admin_cannot_revoke_self';
  end if;
  if not p_active and v_user.id is not null and exists(select 1 from public.profiles where id = v_user.id and role = 'admin')
    and not exists (
      select 1 from public.profiles p join auth.users u on u.id = p.id
      where p.role = 'admin' and p.id <> v_user.id and u.email_confirmed_at is not null
        and not exists(select 1 from public.admin_role_allowlist a where a.email = lower(btrim(u.email)) and not a.active)
        and not exists(select 1 from public.admin_account_access a where a.user_id = p.id and not a.active)
    ) then raise exception 'last_admin_required'; end if;
  v_previous := jsonb_build_object(
    'allowlist',(select to_jsonb(a) from public.admin_role_allowlist a where email = v_email),
    'account',(select to_jsonb(a) from public.admin_account_access a where user_id = v_user.id),
    'profile',(select jsonb_build_object('id',id,'role',role) from public.profiles where id = v_user.id)
  );
  insert into public.admin_role_allowlist(email,active,granted_by,note)
  values(v_email,p_active,p_actor_id,btrim(p_reason))
  on conflict(email) do update set active=excluded.active, granted_by=excluded.granted_by, granted_at=now(), note=excluded.note;
  if v_user.id is not null then
    if not exists(select 1 from public.profiles where id = v_user.id) then raise exception 'admin_profile_missing'; end if;
    insert into public.admin_account_access(user_id,active) values(v_user.id,p_active)
    on conflict(user_id) do update set active=excluded.active,updated_at=now();
    v_profile := public.resolve_account_role(v_user.id);
  end if;
  v_next := jsonb_build_object('email',v_email,'active',p_active,'userId',v_user.id,
    'registered',v_user.id is not null,'emailConfirmed',v_user.email_confirmed_at is not null,
    'role',v_profile->>'role');
  insert into public.admin_access_audit(actor_id,email,target_id,active,reason,previous_data,next_data)
  values(p_actor_id,v_email,v_user.id,p_active,btrim(p_reason),v_previous,v_next);
  return v_next;
end;
$$;
revoke all on function public.admin_set_access(uuid,text,boolean,text) from public, anon, authenticated;
grant execute on function public.admin_set_access(uuid,text,boolean,text) to service_role;

-- New unverified registrations must not obtain an admin role before confirming
-- ownership of the allowlisted email. Login resolves the role after verification.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(coalesce(new.email, '')));
  initial_role public.app_role := 'student';
begin
  perform pg_advisory_xact_lock(hashtextextended('admin_access_management', 0));
  if new.email_confirmed_at is not null and exists (
    select 1 from public.admin_role_allowlist where email = normalized_email and active
  ) then initial_role := 'admin'; end if;
  insert into public.profiles(id,email,name,phone,pb,role) values(
    new.id,normalized_email,
    coalesce(new.raw_user_meta_data->>'name',split_part(coalesce(new.email,''),'@',1)),
    coalesce(new.raw_user_meta_data->>'phone',''),coalesce(new.raw_user_meta_data->>'pb',''),initial_role
  ) on conflict(id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Read-only diagnostic: never activates a coach or updates a target's session.
create function public.admin_account_overview(p_actor_id uuid, p_email text default null, p_env_emails text[] default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := nullif(lower(btrim(coalesce(p_email,''))),'');
  v_admins jsonb;
  v_target jsonb;
  v_users uuid[];
begin
  if not exists (
    select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_actor_id and p.role='admin' and u.email_confirmed_at is not null
      and not exists(select 1 from public.admin_role_allowlist a where a.email=lower(btrim(u.email)) and not a.active)
      and not exists(select 1 from public.admin_account_access a where a.user_id=p.id and not a.active)
  ) then raise exception 'admin_required'; end if;
  with emails as (
    select email from public.admin_role_allowlist
    union select lower(btrim(u.email)) from auth.users u join public.profiles p on p.id=u.id where p.role='admin'
    union select lower(btrim(u.email)) from auth.users u join public.admin_account_access a on a.user_id=u.id
    union select unnest(p_env_emails)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'email',e.email,'userId',u.id,'name',p.name,'role',p.role,
    'registered',u.id is not null,'emailConfirmed',u.email_confirmed_at is not null,
    'allowlistActive',a.active,'accountActive',x.active,'environmentAllowed',e.email=any(p_env_emails)
  ) order by e.email),'[]'::jsonb) into v_admins
  from emails e left join auth.users u on lower(btrim(u.email))=e.email
  left join public.profiles p on p.id=u.id
  left join public.admin_role_allowlist a on a.email=e.email
  left join public.admin_account_access x on x.user_id=u.id
  where e.email is not null and e.email<>'';

  if v_email is not null then
    select coalesce(array_agg(id),'{}'::uuid[]) into v_users from auth.users where lower(btrim(email))=v_email;
    v_target := jsonb_build_object(
      'email',v_email,
      'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'emailConfirmed',u.email_confirmed_at is not null,
        'role',p.role,'name',p.name,'adminActive',a.active))
        from auth.users u left join public.profiles p on p.id=u.id
        left join public.admin_account_access a on a.user_id=u.id where u.id=any(v_users)),'[]'::jsonb),
      'adminAllowlist',(select active from public.admin_role_allowlist where email=v_email),
      'environmentAllowed',v_email=any(p_env_emails),
      'coachAccounts',coalesce((select jsonb_agg(jsonb_build_object('coachKey',a.coach_key,'status',a.status,
        'profileId',a.profile_id,'ownerId',cp.owner_profile_id,'name',cp.display_name))
        from public.coach_account_allowlist a left join public.coach_public_profiles cp on cp.coach_key=a.coach_key
        where a.email=v_email or a.profile_id=any(v_users)),'[]'::jsonb),
      'courses',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'coachId',m.coach_id,'name',coalesce(c.course_data->>'name',c.course_slug),'season',s.name,'seasonStatus',s.status))
        from public.course_coach_memberships m join public.course_season_courses c on c.id=m.course_season_course_id
        join public.course_seasons s on s.id=c.season_id where m.coach_id=any(v_users)),'[]'::jsonb),
      'sessions',coalesce((select jsonb_agg(jsonb_build_object('lastSeenAt',d.last_seen_at,'revokedAt',d.revoked_at,'device',d.device_label))
        from (select last_seen_at,revoked_at,device_label from public.user_device_sessions where user_id=any(v_users) order by last_seen_at desc limit 10) d),'[]'::jsonb)
    );
  end if;
  return jsonb_build_object('admins',v_admins,'diagnostic',v_target,
    'audit',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select a.id,a.email,a.active,a.reason,a.created_at,p.name as actor_name
      from public.admin_access_audit a left join public.profiles p on p.id=a.actor_id
      where v_email is null or a.email=v_email order by a.created_at desc,a.id limit 30
    ) x),'[]'::jsonb));
end;
$$;
revoke all on function public.admin_account_overview(uuid,text,text[]) from public, anon, authenticated;
grant execute on function public.admin_account_overview(uuid,text,text[]) to service_role;

-- Older application instances must not restore a revoked admin by writing the
-- profile directly while a deployment rolls over to the new resolver.
create or replace function public.guard_admin_profile_access()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'admin' and not exists (
    select 1 from auth.users u where u.id=new.id and u.email_confirmed_at is not null
      and not exists(select 1 from public.admin_role_allowlist a where a.email=lower(btrim(u.email)) and not a.active)
      and not exists(select 1 from public.admin_account_access a where a.user_id=new.id and not a.active)
  ) then raise exception 'admin_access_revoked_or_unverified'; end if;
  return new;
end;
$$;
revoke all on function public.guard_admin_profile_access() from public, anon, authenticated;
create trigger guard_admin_profile_access before insert or update of role on public.profiles
for each row execute function public.guard_admin_profile_access();

-- Reconcile pre-existing profile roles with explicit inactive grants immediately.
do $$ declare v_id uuid; begin
  for v_id in select id from public.profiles where role='admin' loop
    perform public.resolve_account_role(v_id);
  end loop;
end $$;
