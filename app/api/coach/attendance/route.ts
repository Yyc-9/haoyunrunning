import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getDefaultCourseCoachKeys } from '@/lib/coach-profiles'
import { attendanceCourseLabel, taipeiDateKey, type CourseAttendanceStatus } from '@/lib/course-attendance'
import { getCourseSeasons } from '@/lib/course-seasons-server'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { syncCoachSessionAssignments } from '@/lib/coach-session-duty'

const noStoreHeaders = { 'Cache-Control': 'no-store' }
const attendanceStatuses = new Set<CourseAttendanceStatus>(['present', 'excused', 'deducted'])

type AttendanceRequest = {
  intent?: 'save_attendance' | 'set_session_cancellation'
  courseSeasonCourseId?: string
  sessionDate?: string
  cancelled?: boolean
  cancellationReason?: string
  records?: Array<{
    enrollmentId?: string
    status?: CourseAttendanceStatus | 'unmarked'
    note?: string
  }>
}

function cleanText(value: unknown, maxLength = 300) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function payloadText(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''
  return cleanText((payload as Record<string, unknown>)[key], 120)
}

async function loadAccess(request: NextRequest) {
  if (!supabaseAdmin) {
    return { response: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers: noStoreHeaders }) }
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return { response: NextResponse.json({ error: '請先登入教練帳號。' }, { status: 401, headers: noStoreHeaders }) }
  }

  const [{ data: account, error: accountError }, adminProfile, seasons] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, role').eq('id', user.id).single(),
    getAdminProfile(user),
    getCourseSeasons({ includeRegistrationStats: false }),
  ])

  if (accountError || !account) {
    return { response: NextResponse.json({ error: accountError?.message || '找不到帳號資料。' }, { status: 500, headers: noStoreHeaders }) }
  }
  const isAdmin = Boolean(adminProfile)
  if (!isAdmin && account.role !== 'coach') {
    return { response: NextResponse.json({ error: '目前帳號尚未取得教練權限。' }, { status: 403, headers: noStoreHeaders }) }
  }

  const { data: publicProfile, error: publicProfileError } = isAdmin
    ? { data: null, error: null }
    : await supabaseAdmin
        .from('coach_public_profiles')
        .select('coach_key')
        .eq('owner_profile_id', user.id)
        .maybeSingle()

  if (publicProfileError) {
    return { response: NextResponse.json({ error: publicProfileError.message }, { status: 500, headers: noStoreHeaders }) }
  }

  await syncCoachSessionAssignments()
  const { data: sessionAssignments, error: assignmentError } = isAdmin
    ? { data: [], error: null }
    : await supabaseAdmin
        .from('coach_session_assignments')
        .select('course_season_course_id, session_date, scheduled_coach_id, actual_coach_id, leave_status')
        .or(`scheduled_coach_id.eq.${user.id},actual_coach_id.eq.${user.id}`)
  if (assignmentError) {
    return { response: NextResponse.json({ error: assignmentError.message }, { status: 500, headers: noStoreHeaders }) }
  }

  const relevantSeasons = seasons.filter((season) => season.isCurrent || ['enrolling', 'active'].includes(season.status))
  const activeSeasons = relevantSeasons.length ? relevantSeasons : seasons.slice(0, 1)
  const courseNames = new Map<string, string>()
  const courses = activeSeasons.flatMap((season) => {
    const managedCourses = applyCourseOverrides(season.courseOverrides)
    for (const course of managedCourses) courseNames.set(`${season.id}:${course.slug}`, attendanceCourseLabel(course.name))

    return managedCourses.flatMap((course) => {
      const courseSeasonCourseId = season.courseOfferingIds[course.slug]
      const billingConfig = season.courseBillingConfigs[course.slug]
      if (!courseSeasonCourseId || !billingConfig?.scheduleReady) return []

      const coachKeys = season.courseOverrides[course.slug]?.coachKeys ?? getDefaultCourseCoachKeys(course.slug)
      const isRegularCoach = Boolean(publicProfile?.coach_key && coachKeys.includes(publicProfile.coach_key))
      const allowedSessionDates = isAdmin
        ? billingConfig.sessionDates
        : (sessionAssignments ?? [])
            .filter((assignment) => assignment.course_season_course_id === courseSeasonCourseId)
            .filter((assignment) => assignment.actual_coach_id === user.id || (assignment.scheduled_coach_id === user.id && assignment.leave_status !== 'approved'))
            .map((assignment) => assignment.session_date)
      if (!isAdmin && !isRegularCoach && allowedSessionDates.length === 0) return []
      if (!isAdmin && allowedSessionDates.length === 0) return []

      return [{
        seasonId: season.id,
        seasonName: season.name,
        courseSeasonCourseId,
        courseSlug: course.slug,
        courseName: course.name,
        weekday: course.weekday,
        location: course.location,
        meetingPoint: course.meetingPoint || '',
        sessionDates: [...new Set(allowedSessionDates)].sort(),
      }]
    })
  })

  return { user, courses, courseNames }
}

export async function GET(request: NextRequest) {
  const access = await loadAccess(request)
  if ('response' in access) return access.response

  if (access.courses.length === 0) {
    return NextResponse.json({ courses: [], enrollments: [], attendance: [], makeups: [], cancellations: [] }, { headers: noStoreHeaders })
  }

  const seasonIds = [...new Set(access.courses.map((course) => course.seasonId))]
  const offeringIds = access.courses.map((course) => course.courseSeasonCourseId)
  const courseAccess = new Set(access.courses.map((course) => `${course.seasonId}:${course.courseSlug}`))

  const [enrollmentResult, attendanceResult, makeupResult, cancellationResult] = await Promise.all([
    supabaseAdmin!
      .from('signup_leads')
      .select('id, season_id, course_season_course_id, course_slug, name, email, status, billing_start_session_date, prior_attendance_claimed, attendance_verification_status, created_at, payload')
      .eq('source', 'course_payment')
      .in('season_id', seasonIds)
      .in('status', ['pending_transfer', 'pending_review', 'approved'])
      .order('created_at', { ascending: false }),
    supabaseAdmin!
      .from('course_attendance_records')
      .select('id, course_season_course_id, session_date, enrollment_id, status, note, marked_by, marked_at, updated_at')
      .in('course_season_course_id', offeringIds)
      .order('session_date', { ascending: false }),
    supabaseAdmin!
      .from('course_makeup_requests')
      .select('id, season_id, enrollment_id, original_course_season_course_id, original_course_slug, original_session_date, target_course_season_course_id, target_course_slug, target_session_date, status, requested_at, updated_at')
      .in('target_course_season_course_id', offeringIds)
      .in('status', ['scheduled', 'completed', 'forfeited'])
      .order('target_session_date', { ascending: false }),
    supabaseAdmin!
      .from('course_session_cancellations')
      .select('id, course_season_course_id, session_date, reason, cancelled_by, cancelled_at, updated_at')
      .in('course_season_course_id', offeringIds)
      .order('session_date', { ascending: false }),
  ])

  const firstError = [enrollmentResult.error, attendanceResult.error, makeupResult.error, cancellationResult.error].find(Boolean)
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500, headers: noStoreHeaders })
  }

  const makeupEnrollmentIds = new Set((makeupResult.data ?? []).map((requestRow) => requestRow.enrollment_id))
  const seen = new Set<string>()
  const enrollments = (enrollmentResult.data ?? []).flatMap((row) => {
    const hasRegularAccess = Boolean(row.season_id && courseAccess.has(`${row.season_id}:${row.course_slug}`))
    if (!hasRegularAccess && !makeupEnrollmentIds.has(row.id)) return []
    const key = `${row.season_id}:${row.course_slug}:${row.email.trim().toLowerCase()}`
    if (seen.has(key) && !makeupEnrollmentIds.has(row.id)) return []
    seen.add(key)
    return [{
      id: row.id,
      season_id: row.season_id,
      course_season_course_id: row.course_season_course_id,
      course_slug: row.course_slug,
      home_course_name: access.courseNames.get(`${row.season_id}:${row.course_slug}`) ?? row.course_slug,
      name: row.name,
      email: row.email,
      status: row.status,
      billing_start_session_date: row.billing_start_session_date,
      prior_attendance_claimed: row.prior_attendance_claimed,
      attendance_verification_status: row.attendance_verification_status,
      emergency_contact_name: payloadText(row.payload, 'emergencyContactName'),
      emergency_contact_phone: payloadText(row.payload, 'emergencyContactPhone'),
    }]
  })

  return NextResponse.json({
    courses: access.courses,
    enrollments,
    attendance: attendanceResult.data ?? [],
    makeups: makeupResult.data ?? [],
    cancellations: cancellationResult.data ?? [],
  }, { headers: noStoreHeaders })
}

export async function POST(request: NextRequest) {
  const access = await loadAccess(request)
  if ('response' in access) return access.response

  const body = (await request.json().catch(() => ({}))) as AttendanceRequest
  const courseSeasonCourseId = cleanText(body.courseSeasonCourseId, 80)
  const sessionDate = cleanText(body.sessionDate, 10)
  const course = access.courses.find((item) => item.courseSeasonCourseId === courseSeasonCourseId)

  if (!course || !course.sessionDates.includes(sessionDate)) {
    return NextResponse.json({ error: '班級或課次無效。' }, { status: 400, headers: noStoreHeaders })
  }
  if (body.intent === 'set_session_cancellation') {
    if (body.cancelled) {
      const now = new Date().toISOString()
      const { error } = await supabaseAdmin!
        .from('course_session_cancellations')
        .upsert({
          season_id: course.seasonId,
          course_season_course_id: courseSeasonCourseId,
          course_slug: course.courseSlug,
          session_date: sessionDate,
          reason: cleanText(body.cancellationReason, 300),
          cancelled_by: access.user.id,
          cancelled_at: now,
          updated_at: now,
        }, { onConflict: 'course_season_course_id,session_date' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })

      const [targetResult, originalResult, attendanceResult] = await Promise.all([
        supabaseAdmin!
          .from('course_makeup_requests')
          .update({
            target_course_season_course_id: null,
            target_course_slug: null,
            target_session_date: null,
            status: 'needs_reselection',
            updated_by: access.user.id,
            updated_at: now,
          })
          .eq('target_course_season_course_id', courseSeasonCourseId)
          .eq('target_session_date', sessionDate)
          .eq('status', 'scheduled'),
        supabaseAdmin!
          .from('course_makeup_requests')
          .update({
            target_course_season_course_id: null,
            target_course_slug: null,
            target_session_date: null,
            status: 'cancelled',
            updated_by: access.user.id,
            updated_at: now,
          })
          .eq('original_course_season_course_id', courseSeasonCourseId)
          .eq('original_session_date', sessionDate)
          .in('status', ['leave_requested', 'scheduled', 'needs_reselection']),
        supabaseAdmin!
          .from('course_attendance_records')
          .delete()
          .eq('course_season_course_id', courseSeasonCourseId)
          .eq('session_date', sessionDate)
          .eq('status', 'excused'),
      ])
      const relatedError = [targetResult.error, originalResult.error, attendanceResult.error].find(Boolean)
      if (relatedError) return NextResponse.json({ error: relatedError.message }, { status: 500, headers: noStoreHeaders })
      return NextResponse.json({ message: '本堂已標記為停課；原班學員不列為請假或扣除，受影響的補課學員可重新選擇課次。' }, { headers: noStoreHeaders })
    }

    const { error } = await supabaseAdmin!
      .from('course_session_cancellations')
      .delete()
      .eq('course_season_course_id', courseSeasonCourseId)
      .eq('session_date', sessionDate)
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })
    return NextResponse.json({ message: '已恢復本堂課程，可重新進行點名。' }, { headers: noStoreHeaders })
  }

  if (sessionDate > taipeiDateKey()) {
    return NextResponse.json({ error: '尚未開始的課次不能提前點名。' }, { status: 400, headers: noStoreHeaders })
  }

  const requested = (body.records ?? []).slice(0, 120).map((record) => ({
    enrollmentId: cleanText(record.enrollmentId, 80),
    status: record.status,
    note: cleanText(record.note, 300),
  })).filter((record) => record.enrollmentId && (record.status === 'unmarked' || attendanceStatuses.has(record.status as CourseAttendanceStatus)))

  if (requested.length === 0) {
    return NextResponse.json({ error: '沒有可儲存的點名資料。' }, { status: 400, headers: noStoreHeaders })
  }

  const { data: cancellation, error: cancellationError } = await supabaseAdmin!
    .from('course_session_cancellations')
    .select('id')
    .eq('course_season_course_id', courseSeasonCourseId)
    .eq('session_date', sessionDate)
    .maybeSingle()
  if (cancellationError) return NextResponse.json({ error: cancellationError.message }, { status: 500, headers: noStoreHeaders })
  if (cancellation) return NextResponse.json({ error: '本堂目前標記為停課，請先恢復開課再儲存點名。' }, { status: 409, headers: noStoreHeaders })

  const enrollmentIds = [...new Set(requested.map((record) => record.enrollmentId))]
  const [enrollmentResult, makeupResult, originalMakeupResult] = await Promise.all([
    supabaseAdmin!
      .from('signup_leads')
      .select('id, name, email, season_id, course_season_course_id, course_slug, status')
      .in('id', enrollmentIds)
      .eq('source', 'course_payment')
      .eq('season_id', course.seasonId)
      .in('status', ['pending_transfer', 'pending_review', 'approved']),
    supabaseAdmin!
      .from('course_makeup_requests')
      .select('id, enrollment_id, status')
      .eq('target_course_season_course_id', courseSeasonCourseId)
      .eq('target_session_date', sessionDate)
      .in('enrollment_id', enrollmentIds)
      .in('status', ['scheduled', 'completed', 'forfeited']),
    supabaseAdmin!
      .from('course_makeup_requests')
      .select('id, enrollment_id, status')
      .eq('original_course_season_course_id', courseSeasonCourseId)
      .eq('original_session_date', sessionDate)
      .in('enrollment_id', enrollmentIds)
      .in('status', ['leave_requested', 'scheduled', 'needs_reselection']),
  ])

  const firstError = [enrollmentResult.error, makeupResult.error, originalMakeupResult.error].find(Boolean)
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500, headers: noStoreHeaders })

  const enrollmentsById = new Map((enrollmentResult.data ?? []).map((enrollment) => [enrollment.id, enrollment]))
  const targetMakeupsByEnrollment = new Map((makeupResult.data ?? []).map((makeup) => [makeup.enrollment_id, makeup]))
  const invalidEnrollment = enrollmentIds.find((id) => {
    const enrollment = enrollmentsById.get(id)
    return !enrollment || (enrollment.course_season_course_id !== courseSeasonCourseId && !targetMakeupsByEnrollment.has(id))
  })
  if (invalidEnrollment) {
    return NextResponse.json({ error: '點名名單包含不屬於本班、也未安排本堂補課的學員。' }, { status: 400, headers: noStoreHeaders })
  }

  const clears = requested.filter((record) => record.status === 'unmarked').map((record) => record.enrollmentId)
  const updates = requested.filter((record): record is typeof record & { status: CourseAttendanceStatus } => attendanceStatuses.has(record.status as CourseAttendanceStatus))

  if (clears.length) {
    const { error } = await supabaseAdmin!
      .from('course_attendance_records')
      .delete()
      .eq('course_season_course_id', courseSeasonCourseId)
      .eq('session_date', sessionDate)
      .in('enrollment_id', clears)
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })
  }

  if (updates.length) {
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin!
      .from('course_attendance_records')
      .upsert(updates.map((record) => {
        const enrollment = enrollmentsById.get(record.enrollmentId)!
        return {
          season_id: course.seasonId,
          course_season_course_id: courseSeasonCourseId,
          course_slug: course.courseSlug,
          session_date: sessionDate,
          enrollment_id: enrollment.id,
          student_email: enrollment.email,
          student_name: enrollment.name,
          status: record.status,
          note: record.note,
          marked_by: access.user.id,
          marked_at: now,
          updated_at: now,
        }
      }), { onConflict: 'course_season_course_id,session_date,enrollment_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })
  }

  const requestedByEnrollment = new Map(requested.map((record) => [record.enrollmentId, record]))
  for (const makeup of makeupResult.data ?? []) {
    const nextAttendance = requestedByEnrollment.get(makeup.enrollment_id)?.status
    const nextStatus = nextAttendance === 'present' ? 'completed' : nextAttendance === 'unmarked' ? 'scheduled' : 'forfeited'
    const { error } = await supabaseAdmin!
      .from('course_makeup_requests')
      .update({ status: nextStatus, updated_by: access.user.id, updated_at: new Date().toISOString() })
      .eq('id', makeup.id)
    if (error) return NextResponse.json({ error: `點名已寫入，但補課狀態更新失敗：${error.message}` }, { status: 500, headers: noStoreHeaders })
  }

  for (const makeup of originalMakeupResult.data ?? []) {
    const nextAttendance = requestedByEnrollment.get(makeup.enrollment_id)?.status
    if (nextAttendance === 'excused') continue
    const { error } = await supabaseAdmin!
      .from('course_makeup_requests')
      .update({
        target_course_season_course_id: null,
        target_course_slug: null,
        target_session_date: null,
        status: 'cancelled',
        updated_by: access.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', makeup.id)
    if (error) return NextResponse.json({ error: `點名已寫入，但請假狀態更新失敗：${error.message}` }, { status: 500, headers: noStoreHeaders })
  }

  return NextResponse.json({ message: `已儲存 ${requested.length} 位學員的點名結果。` }, { headers: noStoreHeaders })
}
