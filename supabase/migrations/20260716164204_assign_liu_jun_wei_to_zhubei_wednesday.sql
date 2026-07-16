insert into public.coach_public_profiles (coach_key, display_name)
values ('liuJunWei', '劉鈞瑋教練')
on conflict (coach_key) do update
set display_name = excluded.display_name;

update public.course_season_courses as course
set course_data = jsonb_set(
  coalesce(course.course_data, '{}'::jsonb),
  '{coachKeys}',
  case
    when jsonb_typeof(course.course_data -> 'coachKeys') = 'array'
      and (course.course_data -> 'coachKeys') ? 'liuJunWei'
      then course.course_data -> 'coachKeys'
    when jsonb_typeof(course.course_data -> 'coachKeys') = 'array'
      then (course.course_data -> 'coachKeys') || '["liuJunWei"]'::jsonb
    else '["chenShengQi", "liuJunWei", "liuChengEn", "bianbian", "zhouXianFeng", "zhengYiQun"]'::jsonb
  end,
  true
)
from public.course_seasons as season
where course.season_id = season.id
  and season.is_current = true
  and course.course_slug = 'zhubei-night-run-wednesday';
