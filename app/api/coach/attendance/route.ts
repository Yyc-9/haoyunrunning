import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getDefaultCourseCoachKeys } from '@/lib/coach-profiles'
import { getCourseSeasons } from '@/lib/course-seasons-server'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const noStoreHeaders = { 'Cache-Control': 'no-store' }
const attendanceStatuses = new Set(['present', 'excused', 'makeup'])

type AttendanceStatus = 'present' | 'excused' | 'makeup'

type AttendanceRequest = {
  intent?: 'save_attendance' | 'set_session_cancellation'
  courseSeasonCourseId?: string
  sessionDate?: string
  cancelled?: boolean
  cancellationReason?: string
  records?: Array<{
    enrollmentId?: string
    status?: AttendanceStatus | 'unmarked' | 'preserve'
    note?: string
    deducted?: boolean
  }>
}

function cleanText(value: unknown, maxLength = 300) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function payloadText(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''
  return cleanText((payload as Record<string, unknown>)[key], 120)
}

function taipeiDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
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

  const relevantSeasons = seasons.filter((season) => season.isCurrent || ['enrolling', 'active'].includes(season.status))
  const activeSeasons = relevantSeasons.length ? relevantSeasons : seasons.slice(0, 1)
  const courses = activeSeasons.flatMap((season) => {
    const managedCourses = applyCourseOverrides(season.courseOverrides)
    return managedCourses.flatMap((course) => {
      const courseSeasonCourseId = season.courseOfferingIds[course.slug]
      const billingConfig = season.courseBillingConfigs[course.slug]
      if (!courseSeasonCourseId || !billingConfig?.scheduleReady) return []

      const coachKeys = season.courseOverrides[course.slug]?.coachKeys ?? getDefaultCourseCoachKeys(course.slug)
      if (!isAdmin && (!publicProfile?.coach_key || !coachKeys.includes(publicProfile.coach_key))) return []

      return [{
        seasonId: season.id,
        seasonName: season.name,
        courseSeasonCourseId,
        courseSlug: course.slug,
        courseName: course.name,
        weekday: course.weekday,
        location: course.location,
        meetingPoint: course.meetingPoint || '',
        sessionDates: billingConfig.sessionDates,
      }]
    })
  })

  return { user, isAdmin, courses }
}

export async function GET(request: NextRequest) {
  const access = await loadAccess(request)
  if ('response' in access) return access.response

  if (access.courses.length === 0) {
    return NextResponse.json({ courses: [], enrollments: [], attendance: [], deductions: [], cancellations: [] }, { headers: noStoreHeaders })
  }

  const seasonIds = [...new Set(access.courses.map((course) => course.seasonId))]
  const offeringIds = access.courses.map((course) => course.courseSeasonCourseId)
  const courseAccess = new Set(access.courses.map((course) => `${course.seasonId}:${course.courseSlug}`))

  const [enrollmentResult, attendanceResult, deductionResult, cancellationResult] = await Promise.all([
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
      .from('course_attendance_deductions')
      .select('id, course_season_course_id, session_date, enrollment_id, deducted_by, deducted_at, updated_at')
      .in('course_season_course_id', offeringIds)
      .order('session_date', { ascending: false }),
    supabaseAdmin!
      .from('course_session_cancellations')
      .select('id, course_season_course_id, session_date, reason, cancelled_by, cancelled_at, updated_at')
      .in('course_season_course_id', offeringIds)
      .order('session_date', { ascending: false }),
  ])

  const firstError = [enrollmentResult.error, attendanceResult.error, deductionResult.error, cancellationResult.error].find(Boolean)
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500, headers: noStoreHeaders })
  }

  const seen = new Set<string>()
  const enrollments = (enrollmentResult.data ?? []).flatMap((row) => {
    if (!row.season_id || !courseAccess.has(`${row.season_id}:${row.course_slug}`)) return []
    const key = `${row.season_id}:${row.course_slug}:${row.email.trim().toLowerCase()}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{
      id: row.id,
      season_id: row.season_id,
      course_season_course_id: row.course_season_course_id,
      course_slug: row.course_slug,
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
    deductions: deductionResult.data ?? [],
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
  if (sessionDate > taipeiDateKey()) {
    return NextResponse.json({ error: '尚未開始的課次不能提前點名。' }, { status: 400, headers: noStoreHeaders })
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
      return NextResponse.json({ message: '本堂已標記為停課，既有點名紀錄會保留但不列入計費異常。' }, { headers: noStoreHeaders })
    }

    const { error } = await supabaseAdmin!
      .from('course_session_cancellations')
      .delete()
      .eq('course_season_course_id', courseSeasonCourseId)
      .eq('session_date', sessionDate)
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })
    return NextResponse.json({ message: '已恢復本堂課程，可重新進行點名。' }, { headers: noStoreHeaders })
  }

  const requested = (body.records ?? []).slice(0, 100).map((record) => ({
    enrollmentId: cleanText(record.enrollmentId, 80),
    status: record.status,
    note: cleanText(record.note, 300),
    deducted: record.deducted === true,
  })).filter((record) => record.enrollmentId && (record.status === 'unmarked' || record.status === 'preserve' || attendanceStatuses.has(String(record.status))))

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
  const { data: enrollments, error: enrollmentError } = await supabaseAdmin!
    .from('signup_leads')
    .select('id, name, email, season_id, course_season_course_id, course_slug, status')
    .in('id', enrollmentIds)
    .eq('source', 'course_payment')
    .eq('season_id', course.seasonId)
    .eq('course_season_course_id', courseSeasonCourseId)
    .in('status', ['pending_transfer', 'pending_review', 'approved'])

  if (enrollmentError) {
    return NextResponse.json({ error: enrollmentError.message }, { status: 500, headers: noStoreHeaders })
  }

  const enrollmentsById = new Map((enrollments ?? []).map((enrollment) => [enrollment.id, enrollment]))
  if (enrollmentsById.size !== enrollmentIds.length) {
    return NextResponse.json({ error: '點名名單包含不屬於本班的學員。' }, { status: 400, headers: noStoreHeaders })
  }

  const clears = requested.filter((record) => record.status === 'unmarked').map((record) => record.enrollmentId)
  const updates = requested.filter((record): record is typeof record & { status: AttendanceStatus } => attendanceStatuses.has(String(record.status)))
  const deductionClears = requested.filter((record) => !record.deducted).map((record) => record.enrollmentId)
  const deductionUpdates = requested.filter((record) => record.deducted)

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

  if (deductionClears.length) {
    const { error } = await supabaseAdmin!
      .from('course_attendance_deductions')
      .delete()
      .eq('course_season_course_id', courseSeasonCourseId)
      .eq('session_date', sessionDate)
      .in('enrollment_id', deductionClears)
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })
  }

  if (deductionUpdates.length) {
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin!
      .from('course_attendance_deductions')
      .upsert(deductionUpdates.map((record) => ({
        season_id: course.seasonId,
        course_season_course_id: courseSeasonCourseId,
        course_slug: course.courseSlug,
        session_date: sessionDate,
        enrollment_id: record.enrollmentId,
        deducted_by: access.user.id,
        deducted_at: now,
        updated_at: now,
      })), { onConflict: 'course_season_course_id,session_date,enrollment_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })
  }

  return NextResponse.json({ message: `已儲存 ${requested.length} 位學員的到課與扣課結果。` }, { headers: noStoreHeaders })
}
