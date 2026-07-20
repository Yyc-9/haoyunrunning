-- Correct the private coach verification allowlist and remove a profile that was
-- created for a student by mistake. The course JSON keeps its original coach order.
update public.coach_public_profiles
set verification_email = 'iam.bianbien@gmail.com'
where coach_key = 'bianbian';

update public.profiles
set role = 'student'
where role = 'coach'
  and id in (
    select owner_profile_id
    from public.coach_public_profiles
    where coach_key = 'liuJunWei'
      and owner_profile_id is not null
  );

update public.course_season_courses
set course_data = jsonb_set(
  coalesce(course_data, '{}'::jsonb),
  '{coachKeys}',
  coalesce(
    (
      select jsonb_agg(coach.value order by coach.position)
      from jsonb_array_elements(coalesce(course_data -> 'coachKeys', '[]'::jsonb))
        with ordinality as coach(value, position)
      where coach.value <> to_jsonb('liuJunWei'::text)
    ),
    '[]'::jsonb
  ),
  true
)
where jsonb_typeof(course_data -> 'coachKeys') = 'array'
  and (course_data -> 'coachKeys') ? 'liuJunWei';

delete from public.coach_public_profiles
where coach_key = 'liuJunWei';
