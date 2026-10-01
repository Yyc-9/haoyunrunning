import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getCourseSeasons } from '@/lib/course-seasons-server'
import { overviewSeasonId } from '@/lib/course-seasons'
import { syncCoachSessionAssignments } from '@/lib/coach-session-duty'
import { allCourses } from '@/lib/goodluck-data'
import { buildCoachRosterCourses, rosterCourseId, type CoachRosterPayload, type RosterFeedback, type RosterProfile } from '@/lib/coach-roster'

/** Public roster projection intentionally omits emails, payloads and financial information. */
const rosterColumns = 'id, source, season_id, course_season_course_id, course_slug, name, status'
const ownColumns = `${rosterColumns}, email, phone, preferred_course, registration_identity, instagram, goal, running_experience, billing_start_session_date, prior_attendance_claimed, amount_text, transfer_last_five, notes, payload`

export async function getCoachRoster(coachId: string, requestedSeasonId = ''): Promise<CoachRosterPayload> {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')
  const availableSeasons = (await getCourseSeasons({ includeRegistrationStats: false })).filter(season => season.status !== 'draft')
  const selectedSeasonId = overviewSeasonId(availableSeasons, requestedSeasonId)
  if (requestedSeasonId && !availableSeasons.some(season => season.id === requestedSeasonId)) throw new Error('找不到這個季度。')
  const seasons = availableSeasons.map(({ id, code, name, status, isCurrent }) => ({ id, code, name, status, isCurrent }))
  const season = availableSeasons.find(item => item.id === selectedSeasonId)
  if (!season) return { seasons, selectedSeasonId: '', courses: [] }

  await syncCoachSessionAssignments()
  const courses = Object.entries(season.courseOfferingIds).map(([slug, id]) => ({
    id, slug, name: season.courseOverrides[slug]?.name || allCourses.find(course => course.slug === slug)?.name || slug,
  }))
  const { data: memberships, error: membershipError } = await supabaseAdmin.from('course_coach_memberships')
    .select('course_season_course_id').eq('coach_id', coachId)
  if (membershipError) throw membershipError
  const ownCourseIds = (memberships ?? []).map(row => row.course_season_course_id as string)
  const owned = new Set(ownCourseIds)
  const registrations: Record<string, unknown>[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabaseAdmin.from('signup_leads').select(rosterColumns)
      .eq('source', 'course_payment').eq('season_id', season.id)
      .in('status', ['pending_transfer', 'pending_review', 'approved', 'rejected'])
      .order('created_at', { ascending: false }).order('id').range(from, from + 499)
    if (error) throw error
    registrations.push(...(data ?? []))
    if (!data || data.length < 500) break
  }
  const ownEnrollmentIds = registrations.filter(row => owned.has(rosterCourseId(row, courses))).map(row => String(row.id))
  const ownDetails: Record<string, unknown>[] = []
  // Fetch private registration fields only after checking the class membership on the server.
  for (let from = 0; from < ownEnrollmentIds.length; from += 100) {
    const { data, error } = await supabaseAdmin.from('signup_leads').select(ownColumns)
      .eq('source', 'course_payment').eq('season_id', season.id).in('id', ownEnrollmentIds.slice(from, from + 100))
    if (error) throw error
    ownDetails.push(...(data ?? []))
  }

  const allowFormalAccess = season.status === 'active' || season.status === 'enrolling'
  const formalProfiles: RosterProfile[] = []
  if (allowFormalAccess && ownDetails.some(row => row.status === 'approved')) {
    const { data: bindings, error: bindingError } = await supabaseAdmin.from('formal_coach_students')
      .select('student_id').eq('coach_id', coachId).eq('active', true)
    if (bindingError) throw bindingError
    const studentIds = [...new Set((bindings ?? []).map(row => row.student_id as string))]
    for (let from = 0; from < studentIds.length; from += 100) {
      const ids = studentIds.slice(from, from + 100)
      const [{ data: profiles, error: profileError }, { data: feedback, error: feedbackError }] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, email, pb').in('id', ids),
        supabaseAdmin.from('training_feedback')
          .select('id, student_id, created_at, distance_km, pace_text, average_heart_rate, rpe, feeling, status')
          .in('student_id', ids).order('created_at', { ascending: false }).limit(300),
      ])
      if (profileError) throw profileError
      if (feedbackError) throw feedbackError
      for (const profile of profiles ?? []) {
        formalProfiles.push({ email: profile.email, pb: profile.pb,
          recentFeedback: (feedback ?? []).filter(row => row.student_id === profile.id).slice(0, 2) as RosterFeedback[] })
      }
    }
  }
  return { seasons, selectedSeasonId, courses: buildCoachRosterCourses({
    seasonId: season.id, courses, ownCourseIds, registrations, ownDetails, formalProfiles, allowFormalAccess,
  }) }
}
