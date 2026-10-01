import { coachRegistrationFields, type RegistrationField } from './coach-registration'
import { SEAT_HOLDING_STATUSES, isActiveEnrollment, type RegistrationStatus } from './course-capacity'
import type { CourseSeasonStatus } from './course-seasons'
import type { PaymentOrderStatus } from './payment'

export type CoachRosterSeason = { id: string; code: string; name: string; status: CourseSeasonStatus; isCurrent: boolean }
export type CoachRosterCourseInput = { id: string; slug: string; name: string }
export type RosterFeedback = {
  id: string; created_at: string; distance_km: number | null; pace_text: string | null
  average_heart_rate: number | null; rpe: number | null; feeling: string | null
  status: 'new' | 'flagged' | 'reviewed'
}
export type OwnRosterStudent = {
  id: string; name: string; visibility: 'own'; status: PaymentOrderStatus
  email: string; goal: string; pb: string; fields: RegistrationField[]
  registrationStatus?: RegistrationStatus; hasFormalAccess: boolean; recentFeedback: RosterFeedback[]
}
export type OtherRosterStudent = { id: string; name: string; visibility: 'name_only' }
export type CoachRosterStudent = OwnRosterStudent | OtherRosterStudent
export type CoachRosterCourse = CoachRosterCourseInput & {
  isOwn: boolean; registeredCount: number; students: CoachRosterStudent[]
  paymentCounts?: { approved: number; pending_review: number; pending_transfer: number; rejected: number }
}
export type CoachRosterPayload = {
  seasons: CoachRosterSeason[]; selectedSeasonId: string; courses: CoachRosterCourse[]; isolatedTest?: boolean
}
export type RosterProfile = { email: string; pb: string | null; recentFeedback: RosterFeedback[] }
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const activeStatuses: readonly string[] = SEAT_HOLDING_STATUSES

/** A legacy registration may have a slug but no offering ID. Never match it to another offering ID. */
export function rosterCourseId(row: Record<string, unknown>, courses: readonly CoachRosterCourseInput[]) {
  const id = text(row.course_season_course_id)
  return (id ? courses.find(course => course.id === id) : courses.find(course => course.slug === row.course_slug))?.id ?? ''
}

/** Build the response from registrations, not account bindings. Explicit serialization protects other classes. */
export function buildCoachRosterCourses(options: {
  seasonId: string; courses: CoachRosterCourseInput[]; ownCourseIds: readonly string[]
  registrations: Record<string, unknown>[]; ownDetails?: Record<string, unknown>[]
  formalProfiles?: RosterProfile[]; allowFormalAccess?: boolean
}): CoachRosterCourse[] {
  const owned = new Set(options.ownCourseIds)
  const details = new Map((options.ownDetails ?? []).map(row => [text(row.id), row]))
  const profiles = new Map((options.formalProfiles ?? []).map(profile => [profile.email.trim().toLowerCase(), profile]))
  // Pagination can overlap during concurrent registrations; count each enrollment ID once.
  const registrations = [...new Map(options.registrations.map(row => [text(row.id), row])).values()]
    .filter(row => text(row.id) && row.source === 'course_payment' && row.season_id === options.seasonId)
  return options.courses.map(course => {
    const isOwn = owned.has(course.id)
    const paymentCounts = { approved: 0, pending_review: 0, pending_transfer: 0, rejected: 0 }
    const students: CoachRosterStudent[] = []
    for (const registration of registrations) {
      if (rosterCourseId(registration, options.courses) !== course.id) continue
      const detail = isOwn ? details.get(text(registration.id)) : undefined
      const row = detail?.season_id === options.seasonId && rosterCourseId(detail, options.courses) === course.id ? detail : registration
      const status = text(row.status)
      if (!activeStatuses.includes(status) && status !== 'rejected') continue
      const active = isActiveEnrollment(row)
      if (active) paymentCounts[status as PaymentOrderStatus]++
      const basic = { id: text(row.id), name: text(row.name) || '未填寫姓名' }
      if (!isOwn) {
        if (active) students.push({ ...basic, visibility: 'name_only' })
        continue
      }
      const profile = active && options.allowFormalAccess !== false && status === 'approved'
        ? profiles.get(text(row.email).toLowerCase()) : undefined
      students.push({
        ...basic, visibility: 'own', status: status as PaymentOrderStatus,
        registrationStatus: (row.registration_status || (active ? 'active' : 'duplicate')) as RegistrationStatus,
        email: text(row.email), goal: text(row.goal), pb: profile?.pb ?? '',
        fields: coachRegistrationFields(row), hasFormalAccess: Boolean(profile),
        recentFeedback: profile?.recentFeedback ?? [],
      })
    }
    students.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
    return {
      ...course, isOwn, registeredCount: paymentCounts.approved + paymentCounts.pending_review + paymentCounts.pending_transfer + paymentCounts.rejected,
      students, ...(isOwn ? { paymentCounts } : {}),
    }
  })
}

export function coachRosterSummary(courses: readonly CoachRosterCourse[]) {
  return courses.filter(course => course.isOwn).reduce((summary, course) => ({
    classCount: summary.classCount + 1, registeredCount: summary.registeredCount + course.registeredCount,
    approvedCount: summary.approvedCount + (course.paymentCounts?.approved ?? 0),
    pendingCount: summary.pendingCount + (course.paymentCounts?.pending_review ?? 0) + (course.paymentCounts?.pending_transfer ?? 0) + (course.paymentCounts?.rejected ?? 0),
  }), { classCount: 0, registeredCount: 0, approvedCount: 0, pendingCount: 0 })
}
