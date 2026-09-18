-- Current course membership is separate from historical attendance assignments.
create table public.course_coach_memberships (
  course_season_course_id uuid not null references public.course_season_courses(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  primary key (course_season_course_id, coach_id)
);
create index course_coach_memberships_coach_idx on public.course_coach_memberships(coach_id);
alter table public.course_coach_memberships enable row level security;
revoke all on public.course_coach_memberships from public, anon, authenticated;
grant select on public.course_coach_memberships to service_role;
-- Initialize the projection before switching any permission helper to it.
-- Existing active offerings have explicit coachKeys (verified before rollout).
insert into public.course_coach_memberships(course_season_course_id,coach_id)
select distinct c.id,p.id from public.course_season_courses c
join public.course_seasons s on s.id=c.season_id and s.status in ('active','enrolling')
cross join lateral jsonb_array_elements_text(coalesce(c.course_data->'coachKeys','[]'::jsonb)) k(coach_key)
join public.coach_public_profiles cp on cp.coach_key=k.coach_key
join public.profiles p on p.id=cp.owner_profile_id and p.role in ('coach','admin');
create function public.sync_formal_course_coaches(p_course_ids uuid[], p_memberships jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('sync_formal_course_coaches'));
  delete from public.course_coach_memberships where course_season_course_id = any(p_course_ids);
  insert into public.course_coach_memberships(course_season_course_id, coach_id)
    select distinct x.course_id, x.coach_id from jsonb_to_recordset(p_memberships) as x(course_id uuid, coach_id uuid)
    join public.profiles p on p.id = x.coach_id and p.role in ('coach', 'admin')
    where x.course_id = any(p_course_ids);
end $$;
revoke all on function public.sync_formal_course_coaches(uuid[],jsonb) from public, anon, authenticated;
grant execute on function public.sync_formal_course_coaches(uuid[],jsonb) to service_role;

-- Paid enrollment plus current course membership is the sole formal relationship.
create or replace view public.formal_coach_students as
select md5(a.coach_id::text || ':' || p.id::text)::uuid as id, a.coach_id,
  p.id as student_id, true as active, min(l.created_at) as created_at
from public.signup_leads l
join public.profiles p on lower(trim(p.email)) = lower(trim(l.email))
join public.course_seasons s on s.id = l.season_id and s.status in ('active', 'enrolling')
join public.course_coach_memberships a on a.course_season_course_id = l.course_season_course_id
join public.profiles cp on cp.id = a.coach_id and cp.role in ('coach','admin')
where l.source = 'course_payment' and l.status = 'approved'
group by a.coach_id, p.id;
revoke all on public.formal_coach_students from public, anon, authenticated;
grant select on public.formal_coach_students to service_role;

create or replace function private.is_coach_of(coach_id uuid, student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (coach_id = auth.uid() or student_id = auth.uid()) and exists (
    select 1 from public.formal_coach_students b where b.coach_id = is_coach_of.coach_id and b.student_id = is_coach_of.student_id
  );
$$;
alter policy profiles_select_own_or_coach_or_admin on public.profiles
using (id = auth.uid() or private.is_admin(auth.uid()) or private.is_coach_of(auth.uid(), id));
-- Historical manual relations no longer grant a browser direct access.
revoke insert, update, delete on public.coach_students from anon, authenticated;

create table public.student_course_checkins (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.signup_leads(id) on delete cascade,
  course_season_course_id uuid not null references public.course_season_courses(id) on delete cascade,
  session_date date not null,
  student_id uuid not null references public.profiles(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  unique (enrollment_id, course_season_course_id, session_date)
);
create index student_course_checkins_session_idx on public.student_course_checkins(course_season_course_id, session_date);
create index student_course_checkins_student_idx on public.student_course_checkins(student_id);
alter table public.student_course_checkins enable row level security;
revoke all on public.student_course_checkins from public, anon, authenticated;
grant select, insert on public.student_course_checkins to service_role;

create or replace function public.check_in_student_course(p_enrollment_id uuid, p_course_id uuid, p_session_date date, p_actor_id uuid)
returns public.student_course_checkins language plpgsql security definer set search_path = public as $$
declare
  v_lead public.signup_leads; v_course public.course_season_courses;
  v_makeup public.course_makeup_requests; v_result public.student_course_checkins;
  v_start timestamptz;
begin
  select * into v_lead from public.signup_leads where id = p_enrollment_id for update;
  if not found or v_lead.source <> 'course_payment' or v_lead.status <> 'approved'
    or not exists (select 1 from public.profiles where id = p_actor_id and lower(trim(email)) = lower(trim(v_lead.email)))
    then raise exception '找不到已確認入帳的本人課程資格'; end if;
  select * into v_course from public.course_season_courses where id = p_course_id for share;
  if not found or v_course.season_id <> v_lead.season_id or v_course.start_time is null
    or not coalesce(v_course.billing_config->'sessionDates' ? p_session_date::text, false)
    then raise exception '課次或上課時間尚未設定'; end if;
  if not exists(select 1 from public.course_seasons where id = v_lead.season_id and status in ('active','enrolling'))
    then raise exception '本季度未開放簽到'; end if;
  if exists(select 1 from public.course_session_cancellations where course_season_course_id = p_course_id and session_date = p_session_date)
    then raise exception '本堂已停課'; end if;
  if p_course_id = v_lead.course_season_course_id then
    if exists(select 1 from public.course_makeup_requests where enrollment_id = p_enrollment_id and original_session_date = p_session_date and status <> 'cancelled')
      then raise exception '本堂已請假，請至安排的補課課次簽到'; end if;
    if v_lead.billing_start_session_date is not null and p_session_date < v_lead.billing_start_session_date
      then raise exception '本堂早於報名起始課次'; end if;
  else
    select * into v_makeup from public.course_makeup_requests where enrollment_id = p_enrollment_id
      and target_course_season_course_id = p_course_id and target_session_date = p_session_date
      and status in ('scheduled','completed') for update;
    if not found then raise exception '沒有安排到本堂補課'; end if;
  end if;
  select * into v_result from public.student_course_checkins where enrollment_id = p_enrollment_id and course_season_course_id = p_course_id and session_date = p_session_date;
  if found then return v_result; end if;
  v_start := (p_session_date + v_course.start_time) at time zone 'Asia/Taipei';
  if now() < v_start - interval '15 minutes' or now() > v_start + interval '15 minutes'
    then raise exception '簽到開放時間為開課前 15 分鐘至開課後 15 分鐘'; end if;
  insert into public.student_course_checkins(enrollment_id, course_season_course_id, session_date, student_id)
    values(p_enrollment_id, p_course_id, p_session_date, p_actor_id) returning * into v_result;
  if v_makeup.id is not null and exists(select 1 from public.course_attendance_records
    where enrollment_id = p_enrollment_id and course_season_course_id = p_course_id and session_date = p_session_date and status = 'present') then
    update public.course_makeup_requests set status = 'completed' where id = v_makeup.id;
  end if;
  return v_result;
end $$;
revoke all on function public.check_in_student_course(uuid,uuid,date,uuid) from public, anon, authenticated;
grant execute on function public.check_in_student_course(uuid,uuid,date,uuid) to service_role;

-- Keep a checked-in makeup tied to the same session. Serializes with check-in's
-- row lock, including when rescheduling/cancellation races the student's click.
create or replace function public.guard_checked_in_makeup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.target_course_season_course_id is distinct from old.target_course_season_course_id
    or new.target_session_date is distinct from old.target_session_date or new.status = 'cancelled')
    and exists(select 1 from public.student_course_checkins where enrollment_id = old.enrollment_id
      and course_season_course_id = old.target_course_season_course_id and session_date = old.target_session_date)
    and not (new.status = 'needs_reselection' and exists(select 1 from public.course_session_cancellations
      where course_season_course_id = old.target_course_season_course_id and session_date = old.target_session_date))
    then raise exception '補課已簽到，不可取消或改期，請聯絡管理員核對'; end if;
  return new;
end $$;
create trigger guard_checked_in_makeup before update on public.course_makeup_requests
for each row execute function public.guard_checked_in_makeup();

create or replace function public.complete_verified_makeup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.course_makeup_requests set status = 'scheduled', updated_at = now()
    where enrollment_id = old.enrollment_id and target_course_season_course_id = old.course_season_course_id
      and target_session_date = old.session_date and status in ('completed','forfeited');
    return old;
  end if;
  update public.course_makeup_requests set status = case
    when new.status = 'present' and exists(select 1 from public.student_course_checkins c where
      c.enrollment_id = new.enrollment_id and c.course_season_course_id = new.course_season_course_id and c.session_date = new.session_date) then 'completed'
    when new.status = 'present' then 'scheduled' else 'forfeited' end
  where enrollment_id = new.enrollment_id and target_course_season_course_id = new.course_season_course_id
    and target_session_date = new.session_date and status in ('scheduled','completed','forfeited');
  return new;
end $$;
create trigger complete_verified_makeup after insert or update or delete on public.course_attendance_records
for each row execute function public.complete_verified_makeup();

create or replace function public.guard_leave_after_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.signup_leads where id = new.enrollment_id for update;
  if new.status <> 'cancelled' and exists(select 1 from public.student_course_checkins c
    join public.signup_leads l on l.id = c.enrollment_id
    where c.enrollment_id = new.enrollment_id and c.course_season_course_id = l.course_season_course_id
      and c.session_date = new.original_session_date) then
    raise exception '原班已簽到，不能再建立請假或補課';
  end if;
  return new;
end $$;
create trigger guard_leave_after_checkin before insert or update on public.course_makeup_requests
for each row execute function public.guard_leave_after_checkin();

create function public.set_course_session_cancellation(p_course_id uuid, p_date date, p_cancelled boolean, p_reason text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_course public.course_season_courses;
begin
  select * into v_course from public.course_season_courses where id = p_course_id for update;
  if not found or not coalesce(v_course.billing_config->'sessionDates' ? p_date::text, false)
    then raise exception '無效課次'; end if;
  if not exists(select 1 from public.course_seasons where id = v_course.season_id and status in ('active','enrolling'))
    then raise exception '本季度不可修改'; end if;
  if not p_cancelled then
    delete from public.course_session_cancellations where course_season_course_id = p_course_id and session_date = p_date;
    return;
  end if;
  insert into public.course_session_cancellations(season_id,course_season_course_id,course_slug,session_date,reason,cancelled_by,cancelled_at,updated_at)
    values(v_course.season_id,p_course_id,v_course.course_slug,p_date,left(p_reason,300),p_actor,now(),now())
    on conflict(course_season_course_id,session_date) do update set reason=excluded.reason,cancelled_by=p_actor,cancelled_at=now(),updated_at=now();
  update public.course_makeup_requests set target_course_season_course_id=null,target_course_slug=null,target_session_date=null,
    status='needs_reselection',updated_by=p_actor,updated_at=now()
    where target_course_season_course_id=p_course_id and target_session_date=p_date and status='scheduled';
  update public.course_makeup_requests set target_course_season_course_id=null,target_course_slug=null,target_session_date=null,
    status='cancelled',updated_by=p_actor,updated_at=now()
    where original_course_season_course_id=p_course_id and original_session_date=p_date
      and status in ('leave_requested','scheduled','needs_reselection');
  delete from public.course_attendance_records where course_season_course_id=p_course_id and session_date=p_date and status='excused';
end $$;
revoke all on function public.set_course_session_cancellation(uuid,date,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.set_course_session_cancellation(uuid,date,boolean,text,uuid) to service_role;
