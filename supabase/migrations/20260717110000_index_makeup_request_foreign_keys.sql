create index if not exists course_makeup_requests_original_course_idx
on public.course_makeup_requests (original_course_season_course_id, original_session_date);

create index if not exists course_makeup_requests_requested_by_idx
on public.course_makeup_requests (requested_by);

create index if not exists course_makeup_requests_updated_by_idx
on public.course_makeup_requests (updated_by);
