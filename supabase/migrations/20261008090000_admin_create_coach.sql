-- An identity and its login registration must either both exist or neither exist.
create or replace function public.admin_create_coach(
  p_actor_id uuid, p_name text, p_kind text, p_email text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_key text := 'coach-' || gen_random_uuid()::text;
  v_user_id uuid;
  v_confirmed boolean := false;
  v_result jsonb;
begin
  if not exists(select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'admin_required';
  end if;
  if length(v_name) not between 1 and 80 or p_kind is null or p_kind not in ('coach', 'assistant') then
    raise exception 'invalid_coach_identity';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'email_conflict';
  end if;
  if exists(select 1 from public.coach_account_allowlist where email = v_email)
     or exists(select 1 from public.coach_public_profiles where lower(btrim(verification_email)) = v_email) then
    raise exception 'email_conflict';
  end if;
  select id, email_confirmed_at is not null into v_user_id, v_confirmed
  from auth.users where lower(email) = v_email;
  if v_user_id is not null and not exists(select 1 from public.profiles where id = v_user_id) then
    raise exception 'profile_missing';
  end if;
  if v_user_id is not null and exists(
    select 1 from public.coach_public_profiles where owner_profile_id = v_user_id
  ) then raise exception 'identity_collision'; end if;

  insert into public.coach_public_profiles(
    coach_key, display_name, role_title, verification_email, published, profile_initialized
  ) values (
    v_key, v_name, case when p_kind = 'assistant' then '助教' else '教練' end,
    v_email, false, true
  );
  v_result := public.register_coach_account(
    p_actor_id, v_key, v_email, v_user_id, coalesce(v_confirmed, false), 'admin_created_identity'
  );
  return v_result || jsonb_build_object('coach_key', v_key, 'display_name', v_name, 'kind', p_kind);
end;
$$;
revoke all on function public.admin_create_coach(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_create_coach(uuid,text,text,text) to service_role;
