import 'server-only'

import {
  coachDutyWindow,
  resolveCoachDutyAttendanceState,
  type CoachDutyAttendanceState,
} from '@/lib/coach-duty-policy'
import { APP_TIME_ZONE_LABEL } from '@/lib/app-time'
import { getDefaultCourseCoachKeys } from '@/lib/coach-profiles'
import { getCourseSeasons } from '@/lib/course-seasons-server'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { supabaseAdmin } from '@/lib/supabase-server'

export const COACH_DUTY_TIME_ZONE = 'Asia/Taipei' as const
export {
  coachDutyPunctuality,
  coachDutyWindow,
  type CoachDutyAttendanceState,
} from '@/lib/coach-duty-policy'

type DutyCourse = {
  seasonId: string
  seasonName: string
  courseSeasonCourseId: string
  courseSlug: string
  courseName: string
  weekday: string
  location: string
  sessionDates: string[]
  startTime: string
  timeZone: typeof COACH_DUTY_TIME_ZONE
  coachKeys: string[]
}

type AssignmentRow = {
  id: string
  season_id: string
  course_season_course_id: string
  course_slug: string
  session_date: string
  scheduled_coach_id: string
  actual_coach_id: string | null
  coach_role: 'head_coach' | 'coach' | 'assistant' | 'substitute'
  leave_status: 'none' | 'requested' | 'approved' | 'rejected'
  leave_reason: string
  leave_requested_at: string | null
  recommended_substitute_id: string | null
  substitute_coach_id: string | null
  substitute_response: 'none' | 'pending' | 'accepted' | 'rejected'
  substitute_responded_at: string | null
  admin_status: 'not_required' | 'pending' | 'approved' | 'rejected'
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null
  admin_reason: string
  created_at: string
  updated_at: string
}

type CheckinRow = {
  id: string
  assignment_id: string
  actual_coach_id: string
  checked_in_at: string
  punctuality: 'on_time' | 'late'
  manual_correction: boolean
  corrected_by: string | null
  corrected_at: string | null
  correction_reason: string
}

export type CoachDutyItem = {
  id: string
  seasonId: string
  seasonName: string
  courseSeasonCourseId: string
  courseSlug: string
  courseName: string
  weekday: string
  location: string
  sessionDate: string
  startTime: string
  timeZone: typeof APP_TIME_ZONE_LABEL
  scheduledCoachId: string
  scheduledCoachName: string
  actualCoachId: string
  actualCoachName: string
  coachRole: AssignmentRow['coach_role']
  leaveStatus: AssignmentRow['leave_status']
  leaveReason: string
  recommendedSubstituteId: string
  recommendedSubstituteName: string
  substituteCoachId: string
  substituteCoachName: string
  substituteResponse: AssignmentRow['substitute_response']
  adminStatus: AssignmentRow['admin_status']
  adminReason: string
  attendanceState: CoachDutyAttendanceState
  checkedInAt: string
  punctuality: '' | CheckinRow['punctuality']
  manualCorrection: boolean
  canCheckIn: boolean
  checkInOpensAt: string
  canRequestLeave: boolean
  canRespondSubstitute: boolean
  salaryStatus: 'pending_rate'
  salaryStatusLabel: '待設定課酬'
  isCancelled: boolean
}

async function loadDutyCourses(options: { includeHistorical?: boolean } = {}): Promise<DutyCourse[]> {
  const seasons = await getCourseSeasons({ includeRegistrationStats: false })
  return seasons
    .filter((season) => options.includeHistorical || season.isCurrent || ['enrolling', 'active'].includes(season.status))
    .flatMap((season) => {
      const managedCourses = applyCourseOverrides(season.courseOverrides, { includeInactive: true })
      return managedCourses.flatMap((course) => {
        const id = season.courseOfferingIds[course.slug]
        const billing = season.courseBillingConfigs[course.slug]
        const override = season.courseOverrides[course.slug]
        if (!id || !billing?.sessionDates?.length) return []
        return [{
          seasonId: season.id,
          seasonName: season.name,
          courseSeasonCourseId: id,
          courseSlug: course.slug,
          courseName: course.name,
          weekday: course.weekday,
          location: course.location,
          sessionDates: billing.sessionDates,
          startTime: override?.startTime || '',
          timeZone: COACH_DUTY_TIME_ZONE,
          coachKeys: override?.coachKeys ?? getDefaultCourseCoachKeys(course.slug),
        }]
      })
    })
}

export async function syncCoachSessionAssignments() {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')
  const courses = await loadDutyCourses()
  const { data: identities, error: identityError } = await supabaseAdmin
    .from('coach_public_profiles')
    .select('coach_key, owner_profile_id')
    .not('owner_profile_id', 'is', null)
  if (identityError) throw identityError
  const ownerByCoachKey = new Map((identities ?? []).map((row) => [row.coach_key, row.owner_profile_id as string]))
  const rows = courses.flatMap((course) => course.sessionDates.flatMap((sessionDate) => course.coachKeys.flatMap((coachKey, index) => {
    const profileId = ownerByCoachKey.get(coachKey)
    if (!profileId) return []
    return [{
      season_id: course.seasonId,
      course_season_course_id: course.courseSeasonCourseId,
      course_slug: course.courseSlug,
      session_date: sessionDate,
      scheduled_coach_id: profileId,
      actual_coach_id: profileId,
      coach_role: index === 0 ? 'head_coach' : 'coach',
    }]
  })))
  if (rows.length) {
    const { error } = await supabaseAdmin
      .from('coach_session_assignments')
      .upsert(rows, { onConflict: 'course_season_course_id,session_date,scheduled_coach_id', ignoreDuplicates: true })
    if (error) throw error
  }
  return courses
}

function attendanceState(item: AssignmentRow, checkin: CheckinRow | undefined, cancelled: boolean, startTime: string, now: Date): CoachDutyAttendanceState {
  return resolveCoachDutyAttendanceState({
    sessionDate: item.session_date,
    startTime,
    now,
    checkedInPunctuality: checkin?.punctuality ?? null,
    leaveApproved: item.leave_status === 'approved',
    hasActualCoach: Boolean(item.actual_coach_id),
    isSubstitute: Boolean(
      item.actual_coach_id
      && item.actual_coach_id !== item.scheduled_coach_id,
    ),
    cancelled,
  })
}

export async function loadCoachDutyItems(options: { userId?: string; isAdmin?: boolean; now?: Date } = {}) {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')
  const activeCourses = await syncCoachSessionAssignments()
  const courses = options.isAdmin ? await loadDutyCourses({ includeHistorical: true }) : activeCourses
  const courseById = new Map(courses.map((course) => [course.courseSeasonCourseId, course]))
  const offeringIds = courses.map((course) => course.courseSeasonCourseId)
  if (!offeringIds.length) return []

  const [assignmentResult, checkinResult, cancellationResult, profileResult] = await Promise.all([
    supabaseAdmin.from('coach_session_assignments').select('*').in('course_season_course_id', offeringIds).order('session_date'),
    supabaseAdmin.from('coach_session_checkins').select('*'),
    supabaseAdmin.from('course_session_cancellations').select('course_season_course_id, session_date').in('course_season_course_id', offeringIds),
    supabaseAdmin.from('profiles').select('id, name, email'),
  ])
  const error = [assignmentResult.error, checkinResult.error, cancellationResult.error, profileResult.error].find(Boolean)
  if (error) throw error
  const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile.name || profile.email || '未命名教練']))
  const checkins = new Map(((checkinResult.data ?? []) as CheckinRow[]).map((row) => [row.assignment_id, row]))
  const cancellations = new Set((cancellationResult.data ?? []).map((row) => `${row.course_season_course_id}:${row.session_date}`))
  const now = options.now ?? new Date()

  return ((assignmentResult.data ?? []) as AssignmentRow[])
    .filter((row) => options.isAdmin || !options.userId || [row.scheduled_coach_id, row.actual_coach_id, row.substitute_coach_id, row.recommended_substitute_id].includes(options.userId))
    .flatMap((row): CoachDutyItem[] => {
      const course = courseById.get(row.course_season_course_id)
      if (!course) return []
      const checkin = checkins.get(row.id)
      const cancelled = cancellations.has(`${row.course_season_course_id}:${row.session_date}`)
      const state = attendanceState(row, checkin, cancelled, course.startTime, now)
      const window = coachDutyWindow(row.session_date, course.startTime, now)
      const actualCoachId = row.actual_coach_id ?? ''
      return [{
        id: row.id,
        seasonId: row.season_id,
        seasonName: course.seasonName,
        courseSeasonCourseId: row.course_season_course_id,
        courseSlug: row.course_slug,
        courseName: course.courseName,
        weekday: course.weekday,
        location: course.location,
        sessionDate: row.session_date,
        startTime: course.startTime,
        timeZone: APP_TIME_ZONE_LABEL,
        scheduledCoachId: row.scheduled_coach_id,
        scheduledCoachName: profiles.get(row.scheduled_coach_id) ?? '未命名教練',
        actualCoachId,
        actualCoachName: actualCoachId ? profiles.get(actualCoachId) ?? '未命名教練' : '',
        coachRole: row.coach_role,
        leaveStatus: row.leave_status,
        leaveReason: row.leave_reason,
        recommendedSubstituteId: row.recommended_substitute_id ?? '',
        recommendedSubstituteName: row.recommended_substitute_id ? profiles.get(row.recommended_substitute_id) ?? '未命名教練' : '',
        substituteCoachId: row.substitute_coach_id ?? '',
        substituteCoachName: row.substitute_coach_id ? profiles.get(row.substitute_coach_id) ?? '未命名教練' : '',
        substituteResponse: row.substitute_response,
        adminStatus: row.admin_status,
        adminReason: row.admin_reason,
        attendanceState: state,
        checkedInAt: checkin?.checked_in_at ?? '',
        punctuality: checkin?.punctuality ?? '',
        manualCorrection: checkin?.manual_correction ?? false,
        canCheckIn: !cancelled
          && actualCoachId === options.userId
          && !(row.leave_status === 'approved' && row.scheduled_coach_id === options.userId)
          && window.phase === 'open'
          && !checkin,
        checkInOpensAt: window.opensAt?.toISOString() ?? '',
        canRequestLeave: !cancelled && row.scheduled_coach_id === options.userId && row.leave_status === 'none' && !checkin,
        canRespondSubstitute: row.substitute_coach_id === options.userId && row.substitute_response === 'pending',
        salaryStatus: 'pending_rate',
        salaryStatusLabel: '待設定課酬',
        isCancelled: cancelled,
      }]
    })
}

export async function auditCoachDuty(assignmentId: string, actorProfileId: string, action: string, reason: string, snapshot: Record<string, unknown>) {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')
  const { error } = await supabaseAdmin.from('coach_session_duty_audit_log').insert({
    assignment_id: assignmentId,
    actor_profile_id: actorProfileId,
    action,
    reason,
    snapshot,
  })
  if (error) throw error
}
