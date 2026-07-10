alter function public.set_updated_at() set search_path = public, pg_temp;

revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.is_coach_of(uuid, uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
grant execute on function public.is_coach_of(uuid, uuid) to authenticated, service_role;
