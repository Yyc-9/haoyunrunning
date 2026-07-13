create table if not exists public.course_seasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'enrolling', 'active', 'completed', 'archived')),
  is_current boolean not null default false,
  enrollment_starts_on date,
  enrollment_ends_on date,
  starts_on date,
  ends_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code ~ '^[0-9]{4}-Q[1-4]$'),
  check (enrollment_ends_on is null or enrollment_starts_on is null or enrollment_ends_on >= enrollment_starts_on),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create unique index if not exists course_seasons_one_current_idx
on public.course_seasons (is_current)
where is_current = true;

create index if not exists course_seasons_status_idx
on public.course_seasons (status, created_at desc);

drop trigger if exists course_seasons_set_updated_at on public.course_seasons;
create trigger course_seasons_set_updated_at
before update on public.course_seasons
for each row execute function public.set_updated_at();

create table if not exists public.course_season_courses (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.course_seasons(id) on delete cascade,
  course_slug text not null,
  course_data jsonb not null default '{}'::jsonb,
  capacity integer not null default 40 check (capacity between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, course_slug),
  check (course_slug ~ '^[a-z0-9-]{1,120}$'),
  check (jsonb_typeof(course_data) = 'object')
);

create index if not exists course_season_courses_season_idx
on public.course_season_courses (season_id, course_slug);

drop trigger if exists course_season_courses_set_updated_at on public.course_season_courses;
create trigger course_season_courses_set_updated_at
before update on public.course_season_courses
for each row execute function public.set_updated_at();

alter table public.course_seasons enable row level security;
alter table public.course_season_courses enable row level security;

revoke all on table public.course_seasons from anon, authenticated;
revoke all on table public.course_season_courses from anon, authenticated;
grant all on table public.course_seasons to service_role;
grant all on table public.course_season_courses to service_role;

insert into public.course_seasons (code, name, status, is_current)
values ('2026-Q3', '2026 第三季', 'enrolling', true)
on conflict (code) do nothing;

with seed_courses(course_slug) as (
  values
    ('hsinchu-beginner-tuesday'),
    ('zhubei-night-run-monday'),
    ('zhubei-night-run-wednesday'),
    ('taipei-pb-tuesday'),
    ('hsinchu-early-bird-wednesday'),
    ('taipei-night-run-wednesday'),
    ('hsinchu-night-run-thursday'),
    ('zhunan-beginner-thursday'),
    ('taipei-early-bird-saturday')
), current_season as (
  select id from public.course_seasons where code = '2026-Q3'
), current_overrides as (
  select value from public.site_content where key = 'course_overrides'
)
insert into public.course_season_courses (season_id, course_slug, course_data, capacity)
select
  current_season.id,
  seed_courses.course_slug,
  coalesce(current_overrides.value -> seed_courses.course_slug, '{}'::jsonb),
  40
from seed_courses
cross join current_season
left join current_overrides on true
on conflict (season_id, course_slug) do nothing;

alter table public.signup_leads
add column if not exists season_id uuid references public.course_seasons(id) on delete restrict;

alter table public.signup_leads
add column if not exists course_season_course_id uuid references public.course_season_courses(id) on delete restrict;

alter table public.signup_leads
add column if not exists course_capacity integer not null default 40
check (course_capacity between 1 and 500);

update public.signup_leads as lead
set
  season_id = season.id,
  course_season_course_id = season_course.id,
  course_capacity = season_course.capacity
from public.course_seasons as season
join public.course_season_courses as season_course
  on season_course.season_id = season.id
where lead.source = 'course_payment'
  and lead.season_id is null
  and season_course.course_slug = lead.course_slug
  and season.code = '2026-Q3';

create index if not exists signup_leads_season_course_status_idx
on public.signup_leads (season_id, course_slug, status, created_at desc)
where source = 'course_payment';

create or replace function public.activate_course_season(p_season_id uuid)
returns public.course_seasons
language plpgsql
set search_path = ''
as $$
declare
  v_season public.course_seasons%rowtype;
begin
  select * into v_season
  from public.course_seasons
  where id = p_season_id
  for update;

  if not found then
    raise exception 'course season not found';
  end if;

  update public.course_seasons
  set is_current = false, updated_at = now()
  where is_current = true and id <> p_season_id;

  update public.course_seasons
  set is_current = true, status = 'enrolling', updated_at = now()
  where id = p_season_id
  returning * into v_season;

  return v_season;
end;
$$;

revoke all on function public.activate_course_season(uuid) from public, anon, authenticated;
grant execute on function public.activate_course_season(uuid) to service_role;

create or replace function public.approve_course_enrollment(
  p_lead_id uuid,
  p_review_note text default ''
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_lead public.signup_leads%rowtype;
  v_paid_count integer;
  v_capacity integer;
  v_lock_key text;
  v_result public.signup_leads%rowtype;
begin
  select *
  into v_lead
  from public.signup_leads
  where id = p_lead_id
    and source = 'course_payment'
  for update;

  if not found then
    raise exception 'course enrollment not found';
  end if;

  if v_lead.status = 'approved' then
    return to_jsonb(v_lead);
  end if;

  if coalesce(v_lead.course_slug, '') = '' then
    raise exception 'course slug is missing';
  end if;

  select capacity
  into v_capacity
  from public.course_season_courses
  where id = v_lead.course_season_course_id;

  v_capacity := greatest(coalesce(v_capacity, v_lead.course_capacity, 40), 1);
  v_lock_key := coalesce(v_lead.season_id::text, 'legacy') || ':' || v_lead.course_slug;
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

  select count(*)::integer
  into v_paid_count
  from public.signup_leads
  where source = 'course_payment'
    and season_id is not distinct from v_lead.season_id
    and course_slug = v_lead.course_slug
    and status = 'approved'
    and id <> p_lead_id;

  if v_paid_count >= v_capacity then
    raise exception 'course capacity reached';
  end if;

  update public.signup_leads
  set
    status = 'approved',
    course_capacity = v_capacity,
    reviewed_at = now(),
    review_note = coalesce(p_review_note, ''),
    updated_at = now()
  where id = p_lead_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

revoke all on function public.approve_course_enrollment(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_course_enrollment(uuid, text) to service_role;
