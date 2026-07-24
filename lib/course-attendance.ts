export type CourseAttendanceStatus = 'present' | 'excused' | 'deducted'

export type CourseMakeupStatus =
  | 'leave_requested'
  | 'scheduled'
  | 'completed'
  | 'forfeited'
  | 'cancelled'
  | 'needs_reselection'

export type StudentAttendanceCourse = {
  seasonId: string
  seasonName: string
  courseSeasonCourseId: string
  courseSlug: string
  courseName: string
  weekday: string
  classTime: string
  location: string
  sessionDates: string[]
  capacity: number
  approvedCount: number
  scheduledMakeupCounts: Record<string, number>
}

export type StudentAttendanceEnrollment = {
  id: string
  seasonId: string
  courseSeasonCourseId: string
  courseSlug: string
  courseName: string
  name: string
  email: string
}

export type CourseAttendanceRecord = {
  id: string
  course_season_course_id: string
  session_date: string
  enrollment_id: string
  status: CourseAttendanceStatus
  note: string
  marked_at: string
  updated_at: string
}

export type CourseMakeupRequest = {
  id: string
  season_id: string
  enrollment_id: string
  original_course_season_course_id: string
  original_course_slug: string
  original_session_date: string
  target_course_season_course_id: string | null
  target_course_slug: string | null
  target_session_date: string | null
  status: CourseMakeupStatus
  requested_at: string
  updated_at: string
}

export type CourseSessionCancellation = {
  id: string
  course_season_course_id: string
  session_date: string
  reason: string
}

export function taipeiDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function courseSessionStart(sessionDate: string, classTime: string) {
  const match = classTime.match(/(?:^|\D)([01]?\d|2[0-3])[:：]([0-5]\d)/)
  const hours = match?.[1]?.padStart(2, '0') ?? '23'
  const minutes = match?.[2] ?? '59'
  return new Date(`${sessionDate}T${hours}:${minutes}:00+08:00`)
}

export function isBeforeCourseStart(sessionDate: string, classTime: string, now = new Date()) {
  return now.getTime() < courseSessionStart(sessionDate, classTime).getTime()
}

export function nearestUpcomingCourseSession(
  sessionDates: readonly string[],
  classTime: string,
  cancelledDates: ReadonlySet<string>,
  now = new Date(),
) {
  return sessionDates
    .filter((sessionDate) => !cancelledDates.has(sessionDate) && isBeforeCourseStart(sessionDate, classTime, now))
    .sort((first, second) => courseSessionStart(first, classTime).getTime()
      - courseSessionStart(second, classTime).getTime())[0] ?? null
}

export function isCourseSessionAfter(
  candidateDate: string,
  candidateTime: string,
  referenceDate: string,
  referenceTime: string,
) {
  return courseSessionStart(candidateDate, candidateTime).getTime()
    > courseSessionStart(referenceDate, referenceTime).getTime()
}

export type MakeupTargetValidation = {
  valid: boolean
  status?: 400 | 409
  message?: string
}

export function validateMakeupTarget(input: {
  seasonId: string
  seasonEndsOn: string
  homeCourseId: string
  originalSessionDate: string
  originalClassTime: string
  targetCourse: {
    seasonId: string
    courseId: string
    sessionDates: readonly string[]
    classTime: string
  } | null
  targetSessionDate: string
  cancelled: boolean
  now?: Date
}): MakeupTargetValidation {
  const { targetCourse } = input
  if (
    !targetCourse
    || targetCourse.seasonId !== input.seasonId
    || targetCourse.courseId === input.homeCourseId
  ) {
    return { valid: false, status: 400, message: '補課只能選擇本季度的其他班級。' }
  }
  if (!targetCourse.sessionDates.includes(input.targetSessionDate)) {
    return { valid: false, status: 400, message: '補課課次不在本季度課表內。' }
  }
  if (input.seasonEndsOn && input.targetSessionDate > input.seasonEndsOn) {
    return { valid: false, status: 400, message: '補課課次不可超過本季度結束日。' }
  }
  if (!isCourseSessionAfter(
    input.targetSessionDate,
    targetCourse.classTime,
    input.originalSessionDate,
    input.originalClassTime,
  )) {
    return { valid: false, status: 400, message: '補課只能選擇原請假課次之後的課程。' }
  }
  if (!isBeforeCourseStart(
    input.targetSessionDate,
    targetCourse.classTime,
    input.now,
  )) {
    return { valid: false, status: 409, message: '只能選擇尚未開始的補課課次。' }
  }
  if (input.cancelled) {
    return { valid: false, status: 409, message: '這一堂目前停課，請選擇其他補課課次。' }
  }
  return { valid: true }
}

export function formatAttendanceDate(date: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T12:00:00+08:00`))
}

export function attendanceCourseLabel(name: string) {
  const compact = name.replace(/^.*?\s+[XＸ×]\s+/u, '').trim()
  return compact || name
}
