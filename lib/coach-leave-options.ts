import { attendanceCourseLabel, validateMakeupTarget, type CoachLeaveOption } from '@/lib/course-attendance'
import { getCourseSeasons } from '@/lib/course-seasons-server'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { supabaseAdmin } from '@/lib/supabase-server'

// Only schedules and aggregate seat availability leave this helper, never another class's student data.
export async function getCoachLeaveOptions(seasonId: string, homeCourseId: string, sessionDate: string): Promise<CoachLeaveOption[]> {
  const season = (await getCourseSeasons({ includeRegistrationStats: false })).find(item => item.id === seasonId)
  if (!season || !['active', 'enrolling'].includes(season.status)) return []
  const courses = applyCourseOverrides(season.courseOverrides, { onlyConfigured: true, includeInactive: true })
  const home = courses.find(item => season.courseOfferingIds[item.slug] === homeCourseId)
  if (!home || !supabaseAdmin) return []
  const [registrations, makeups, cancellations, times] = await Promise.all([
    supabaseAdmin.from('signup_leads').select('id, course_season_course_id').eq('season_id', seasonId).eq('source', 'course_payment').eq('registration_status', 'active'),
    supabaseAdmin.from('course_makeup_requests').select('enrollment_id, target_course_season_course_id, target_session_date').eq('season_id', seasonId).eq('status', 'scheduled'),
    supabaseAdmin.from('course_session_cancellations').select('course_season_course_id, session_date').eq('season_id', seasonId),
    supabaseAdmin.from('course_season_courses').select('id, start_time').eq('season_id', seasonId),
  ])
  const error = [registrations.error, makeups.error, cancellations.error, times.error].find(Boolean)
  if (error) throw new Error(error.message)
  const activeIds = new Set((registrations.data ?? []).map(item => item.id))
  const timeFor = (id: string, fallback: string) => times.data?.find(item => item.id === id)?.start_time || fallback
  return courses.flatMap(course => {
    const courseId = season.courseOfferingIds[course.slug]
    const billing = season.courseBillingConfigs[course.slug]
    if (!courseId || !billing?.scheduleReady || courseId === homeCourseId) return []
    const classTime = timeFor(courseId, course.classTime || course.time || '')
    const registered = (registrations.data ?? []).filter(item => item.course_season_course_id === courseId).length
    const sessions = billing.sessionDates.filter(date => validateMakeupTarget({
      seasonId, seasonEndsOn: season.endsOn, homeCourseId, originalSessionDate: sessionDate,
      originalClassTime: timeFor(homeCourseId, home.classTime || home.time || ''),
      targetCourse: { seasonId, courseId, sessionDates: billing.sessionDates, classTime }, targetSessionDate: date,
      cancelled: (cancellations.data ?? []).some(item => item.course_season_course_id === courseId && item.session_date === date),
    }).valid).map(date => ({
      date, remaining: Math.max(0, (season.courseCapacities[course.slug] ?? 40) - registered - (makeups.data ?? []).filter(item => activeIds.has(item.enrollment_id) && item.target_course_season_course_id === courseId && item.target_session_date === date).length),
    }))
    return [{ courseId, courseName: attendanceCourseLabel(course.name), classTime, sessions }]
  })
}
