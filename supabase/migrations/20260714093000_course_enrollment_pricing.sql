alter table public.course_season_courses
add column if not exists billing_config jsonb not null default '{}'::jsonb
check (jsonb_typeof(billing_config) = 'object');

alter table public.signup_leads
add column if not exists registration_identity text
check (registration_identity is null or registration_identity in ('returning', 'new'));

alter table public.signup_leads
add column if not exists enrollment_timing text
check (enrollment_timing is null or enrollment_timing in ('regular', 'late'));

alter table public.signup_leads
add column if not exists calculated_amount integer
check (calculated_amount is null or calculated_amount >= 0);

alter table public.signup_leads
add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb
check (jsonb_typeof(pricing_snapshot) = 'object');

alter table public.signup_leads
add column if not exists price_locked_until timestamptz;

create index if not exists signup_leads_season_pricing_idx
on public.signup_leads (season_id, enrollment_timing, registration_identity, created_at desc)
where source = 'course_payment';

update public.course_seasons
set starts_on = date '2026-07-08', ends_on = date '2026-09-30'
where code = '2026-Q3';

update public.course_season_courses as course
set billing_config = config.value
from (
  values
    ('zhubei-night-run-monday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-13','2026-07-20','2026-07-27','2026-08-03','2026-08-10','2026-08-17','2026-08-24','2026-08-31','2026-09-07','2026-09-14','2026-09-21']::text[]),
      'returningFullPrice', 4950, 'newFullPrice', 5500,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    )),
    ('hsinchu-beginner-tuesday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-14','2026-07-21','2026-07-28','2026-08-04','2026-08-11','2026-08-18','2026-08-25','2026-09-01','2026-09-08','2026-09-15','2026-09-22','2026-09-29']::text[]),
      'returningFullPrice', 5400, 'newFullPrice', 6000,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    )),
    ('taipei-pb-tuesday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-14','2026-07-21','2026-07-28','2026-08-04','2026-08-11','2026-08-18','2026-08-25','2026-09-01','2026-09-08','2026-09-15','2026-09-22','2026-09-29']::text[]),
      'returningFullPrice', 5400, 'newFullPrice', 6000,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    )),
    ('hsinchu-morning-run-wednesday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-08','2026-07-15','2026-07-22','2026-07-29','2026-08-05','2026-08-12','2026-08-19','2026-08-26','2026-09-02','2026-09-09','2026-09-16','2026-09-23','2026-09-30']::text[]),
      'returningFullPrice', 5850, 'newFullPrice', 6500,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    )),
    ('zhubei-night-run-wednesday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-15','2026-07-22','2026-07-29','2026-08-05','2026-08-12','2026-08-19','2026-08-26','2026-09-02','2026-09-09','2026-09-16','2026-09-23','2026-09-30']::text[]),
      'returningFullPrice', 5400, 'newFullPrice', 6000,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    )),
    ('taipei-night-run-wednesday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-15','2026-07-22','2026-07-29','2026-08-05','2026-08-12','2026-08-19','2026-08-26','2026-09-02','2026-09-09','2026-09-16','2026-09-23','2026-09-30']::text[]),
      'returningFullPrice', 5400, 'newFullPrice', 6000,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    )),
    ('hsinchu-night-run-thursday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-09','2026-07-16','2026-07-23','2026-07-30','2026-08-06','2026-08-13','2026-08-20','2026-08-27','2026-09-03','2026-09-10','2026-09-17','2026-09-24']::text[]),
      'returningFullPrice', 5400, 'newFullPrice', 6000,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    )),
    ('zhunan-beginner-thursday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-09','2026-07-16','2026-07-23','2026-07-30','2026-08-06','2026-08-13','2026-08-20','2026-08-27','2026-09-03','2026-09-10','2026-09-17','2026-09-24']::text[]),
      'returningFullPrice', 5400, 'newFullPrice', 6000,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    )),
    ('taipei-morning-run-saturday', jsonb_build_object(
      'scheduleReady', true,
      'sessionDates', to_jsonb(array['2026-07-11','2026-07-18','2026-07-25','2026-08-01','2026-08-08','2026-08-15','2026-08-22','2026-08-29','2026-09-05','2026-09-12','2026-09-19']::text[]),
      'returningFullPrice', 4950, 'newFullPrice', 5500,
      'returningLateRate', 450, 'referredLateRate', 450, 'standardLateRate', 500,
      'regularUntilSessionNumber', 2, 'priceLockHours', 24
    ))
) as config(course_slug, value), public.course_seasons as season
where season.code = '2026-Q3'
  and season.id = course.season_id
  and course.course_slug = config.course_slug;

update public.course_season_courses as course
set billing_config = jsonb_build_object(
  'scheduleReady', false,
  'sessionDates', '[]'::jsonb,
  'returningFullPrice', coalesce((
    select (source.billing_config ->> 'returningFullPrice')::integer
    from public.course_season_courses as source
    join public.course_seasons as source_season on source_season.id = source.season_id
    where source_season.code = '2026-Q3' and source.course_slug = course.course_slug
  ), 4950),
  'newFullPrice', coalesce((
    select (source.billing_config ->> 'newFullPrice')::integer
    from public.course_season_courses as source
    join public.course_seasons as source_season on source_season.id = source.season_id
    where source_season.code = '2026-Q3' and source.course_slug = course.course_slug
  ), 5500),
  'returningLateRate', 450,
  'referredLateRate', 450,
  'standardLateRate', 500,
  'regularUntilSessionNumber', 2,
  'priceLockHours', 24
)
from public.course_seasons as season
where season.id = course.season_id
  and season.code = '2026-Q4';
