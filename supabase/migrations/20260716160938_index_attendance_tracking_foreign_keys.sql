create index if not exists course_attendance_deductions_season_idx
on public.course_attendance_deductions (season_id);

create index if not exists course_session_cancellations_season_idx
on public.course_session_cancellations (season_id);
