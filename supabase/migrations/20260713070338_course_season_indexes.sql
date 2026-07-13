create index if not exists course_seasons_created_by_idx
on public.course_seasons (created_by)
where created_by is not null;

create index if not exists signup_leads_course_season_course_idx
on public.signup_leads (course_season_course_id)
where source = 'course_payment' and course_season_course_id is not null;
