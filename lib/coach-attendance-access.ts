export type SessionAccess = {
  courseSeasonCourseId: string
  sessionDates: readonly string[]
}

export function allowedSessionDateSet(access: readonly SessionAccess[]) {
  return new Map(access.map((course) => [
    course.courseSeasonCourseId,
    new Set(course.sessionDates),
  ]))
}

export function filterRowsBySessionAccess<T extends { course_season_course_id: string; session_date: string }>(
  rows: readonly T[],
  access: ReadonlyMap<string, ReadonlySet<string>>,
) {
  return rows.filter((row) => access.get(row.course_season_course_id)?.has(row.session_date) ?? false)
}

export function filterCourseMakeupsBySessionAccess<T extends { target_course_season_course_id: string | null; target_session_date: string | null }>(
  rows: readonly T[],
  access: ReadonlyMap<string, ReadonlySet<string>>,
) {
  return rows.filter((row) => Boolean(
    row.target_course_season_course_id
    && row.target_session_date
    && access.get(row.target_course_season_course_id)?.has(row.target_session_date),
  ))
}

export function filterCourseEnrollmentsByAccess<T extends { season_id: string | null; course_slug: string; id: string }>(
  rows: readonly T[],
  allowedCourses: ReadonlySet<string>,
  makeupEnrollmentIds: ReadonlySet<string>,
) {
  return rows.filter((row) => allowedCourses.has(`${row.season_id}:${row.course_slug}`) || makeupEnrollmentIds.has(row.id))
}
