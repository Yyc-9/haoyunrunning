create table public.admin_season_state_audit (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.course_seasons(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  previous_data jsonb not null,
  next_data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.admin_season_state_audit enable row level security;
revoke all on public.admin_season_state_audit from public,anon,authenticated;
grant select,insert on public.admin_season_state_audit to service_role;
create function public.admin_restore_season(p_actor_id uuid,p_season_id uuid,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_actor jsonb;
  v_season public.course_seasons%rowtype;
  v_next public.course_seasons%rowtype;
  v_sync_before jsonb;
  v_sync_after jsonb;
begin
  v_actor:=public.resolve_account_role(p_actor_id);
  if v_actor is null or v_actor->>'role'<>'admin' then raise exception 'admin_required'; end if;
  if btrim(coalesce(p_reason,''))='' or length(p_reason)>800 then raise exception 'restore_reason_required'; end if;
  select * into v_season from public.course_seasons where id=p_season_id for update;
  if not found or v_season.status<>'archived' then raise exception 'season_not_archived'; end if;
  if v_season.is_current then raise exception 'archived_season_is_current'; end if;
  perform 1 from public.course_season_sync_sources where season_id=p_season_id order by id for update;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) into v_sync_before
    from public.course_season_sync_sources s where s.season_id=p_season_id;
  update public.course_season_sync_sources set active=false,updated_at=now() where season_id=p_season_id and active;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) into v_sync_after
    from public.course_season_sync_sources s where s.season_id=p_season_id;
  update public.course_seasons set status='completed' where id=p_season_id returning * into v_next;
  insert into public.admin_season_state_audit(season_id,actor_id,reason,previous_data,next_data)
  values(p_season_id,p_actor_id,btrim(p_reason),to_jsonb(v_season)||jsonb_build_object('syncSources',v_sync_before),to_jsonb(v_next)||jsonb_build_object('syncSources',v_sync_after));
  return jsonb_build_object('seasonId',v_next.id,'status',v_next.status,'isCurrent',v_next.is_current);
end;
$$;
revoke all on function public.admin_restore_season(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_restore_season(uuid,uuid,text) to service_role;
