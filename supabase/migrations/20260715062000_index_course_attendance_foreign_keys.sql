create index if not exists course_attendance_season_idx
on public.course_attendance_records (season_id);

create index if not exists course_attendance_marked_by_idx
on public.course_attendance_records (marked_by);

create index if not exists course_attendance_resolved_by_idx
on public.course_attendance_resolutions (resolved_by);
