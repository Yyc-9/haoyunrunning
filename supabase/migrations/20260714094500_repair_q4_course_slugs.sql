update public.course_season_courses as course
set course_slug = 'hsinchu-morning-run-wednesday'
from public.course_seasons as season
where season.id = course.season_id
  and season.code = '2026-Q4'
  and course.course_slug = 'hsinchu-early-bird-wednesday'
  and not exists (
    select 1
    from public.course_season_courses as existing
    where existing.season_id = course.season_id
      and existing.course_slug = 'hsinchu-morning-run-wednesday'
  );

update public.course_season_courses as course
set course_slug = 'taipei-morning-run-saturday'
from public.course_seasons as season
where season.id = course.season_id
  and season.code = '2026-Q4'
  and course.course_slug = 'taipei-early-bird-saturday'
  and not exists (
    select 1
    from public.course_season_courses as existing
    where existing.season_id = course.season_id
      and existing.course_slug = 'taipei-morning-run-saturday'
  );

update public.course_season_courses as course
set billing_config = jsonb_set(
  jsonb_set(course.billing_config, '{returningFullPrice}', '5850'::jsonb, true),
  '{newFullPrice}',
  '6500'::jsonb,
  true
)
from public.course_seasons as season
where season.id = course.season_id
  and season.code = '2026-Q4'
  and course.course_slug = 'hsinchu-morning-run-wednesday';
