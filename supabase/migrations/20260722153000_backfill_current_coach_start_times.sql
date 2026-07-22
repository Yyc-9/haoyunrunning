-- These active Q3 courses inherit their display time from the application base
-- catalog and therefore did not have classTime stored in course_data.
update public.course_season_courses as course
set start_time = case course.course_slug
  when 'taipei-night-run-wednesday' then '19:07'::time
  when 'taipei-pb-tuesday' then '19:07'::time
  when 'zhunan-beginner-thursday' then '19:27'::time
  else course.start_time
end
from public.course_seasons as season
where season.id = course.season_id
  and season.code = '2026-Q3'
  and course.start_time is null
  and course.course_slug in (
    'taipei-night-run-wednesday',
    'taipei-pb-tuesday',
    'zhunan-beginner-thursday'
  );

