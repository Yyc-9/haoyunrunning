-- Deploy this reviewed operation before enabling the delete_course_season API.
-- No existing quarter is deleted by installing this function.
begin;
alter table public.course_catalog_audit_log
  drop constraint if exists course_catalog_audit_log_action_check;
alter table public.course_catalog_audit_log
  add constraint course_catalog_audit_log_action_check
  check (action in ('delete_empty_course_authorized', 'delete_empty_season_authorized'));

create or replace function public.delete_empty_course_season(p_season_id uuid, p_actor_profile_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target public.course_seasons%rowtype;
  offering_ids uuid[];
  snapshot jsonb;
begin
  -- Locks block activation, edits and FK-backed concurrent registrations.
  select * into target from public.course_seasons where id = p_season_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = '找不到這個季度，可能已被刪除。';
  end if;
  if target.is_current or target.status in ('enrolling', 'active') then
    raise exception using errcode = 'P0001', message = '前台招生或進行中的季度不能刪除，請先切換季度並封存。';
  end if;
  perform id from public.course_season_courses where season_id = p_season_id order by id for update;
  perform id from public.course_season_sync_sources where season_id = p_season_id order by id for update;
  select coalesce(array_agg(id), '{}'::uuid[]) into offering_ids
    from public.course_season_courses where season_id = p_season_id;

  if exists (select 1 from public.signup_leads where season_id = p_season_id or course_season_course_id = any(offering_ids))
    or exists (select 1 from public.course_attendance_records where season_id = p_season_id or course_season_course_id = any(offering_ids))
    or exists (select 1 from public.course_attendance_deductions where season_id = p_season_id or course_season_course_id = any(offering_ids))
    or exists (select 1 from public.course_session_cancellations where season_id = p_season_id or course_season_course_id = any(offering_ids))
    or exists (select 1 from public.course_makeup_requests where season_id = p_season_id or original_course_season_course_id = any(offering_ids) or target_course_season_course_id = any(offering_ids))
    or exists (select 1 from public.coach_session_assignments where season_id = p_season_id or course_season_course_id = any(offering_ids))
    or exists (select 1 from public.course_season_sync_sources where season_id = p_season_id and last_synced_at is not null)
  then
    raise exception using errcode = 'P0001', message = '這個季度已有報名、點名、請假、補課或同步紀錄，不能刪除；請改用封存。';
  end if;

  select jsonb_build_object(
    'season', to_jsonb(target),
    'courses', coalesce((select jsonb_agg(to_jsonb(c)) from public.course_season_courses c where c.season_id = p_season_id), '[]'::jsonb),
    'syncSources', coalesce((select jsonb_agg(to_jsonb(s)) from public.course_season_sync_sources s where s.season_id = p_season_id), '[]'::jsonb)
  ) into snapshot;
  insert into public.course_catalog_audit_log(actor_profile_id, action, season_id, course_slug, snapshot)
    values (p_actor_profile_id, 'delete_empty_season_authorized', p_season_id, '', snapshot);
  delete from public.course_seasons where id = p_season_id;
  return jsonb_build_object('deletedSeasonId', p_season_id, 'name', target.name);
end;
$$;
revoke all on function public.delete_empty_course_season(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_empty_course_season(uuid, uuid) to service_role;
commit;
