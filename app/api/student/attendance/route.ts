import { NextRequest, NextResponse } from 'next/server'
import {
  attendanceCourseLabel,
  isBeforeCourseStart,
  nearestUpcomingCourseSession,
  validateMakeupTarget,
} from '@/lib/course-attendance'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { getManagedCourses } from '@/lib/managed-courses-server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getIsolatedTestAccount, updateIsolatedTestState } from '@/lib/test-account'

const noStoreHeaders = { 'Cache-Control': 'no-store' }

type StudentAttendanceRequest = {
  intent?: 'request_leave' | 'schedule_makeup' | 'cancel_makeup' | 'cancel_leave'
  enrollmentId?: string
  sessionDate?: string
  requestId?: string
  targetCourseSeasonCourseId?: string
  targetSessionDate?: string
}

function cleanText(value: unknown, maxLength = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

async function loadStudentContext(request: NextRequest) {
  if (!supabaseAdmin) {
    return { response: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers: noStoreHeaders }) }
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) {
    return { response: NextResponse.json({ error: '請先登入學員帳號。' }, { status: 401, headers: noStoreHeaders }) }
  }

  const [season, managedCourses] = await Promise.all([
    getCurrentCourseSeason(),
    getManagedCourses(),
  ])

  if (!season) {
    return { response: NextResponse.json({ error: '目前沒有可使用的季度課程。' }, { status: 404, headers: noStoreHeaders }) }
  }

  const testAccount = await getIsolatedTestAccount(user)
  if (testAccount) {
    if (testAccount.currentMode !== 'student') return { response: NextResponse.json({ error: '請先切換至學員測試模式。' }, { status: 403, headers: noStoreHeaders }) }
    const courses = managedCourses.flatMap((course) => {
      const sourceId = season.courseOfferingIds[course.slug]
      const billing = season.courseBillingConfigs[course.slug]
      if (!sourceId || !billing?.scheduleReady) return []
      return [{
        seasonId: season.id, seasonName: season.name, courseSeasonCourseId: `test-${sourceId}`, courseSlug: course.slug,
        courseName: attendanceCourseLabel(course.name), weekday: course.weekday, classTime: course.classTime || course.time || '',
        location: course.location, sessionDates: billing.sessionDates, capacity: season.courseCapacities[course.slug] ?? 40,
      }]
    })
    const homeCourse = courses.find((course) => course.courseSlug === testAccount.assignedCourseSlug)
      ?? courses.find((course) => course.weekday === '週一')
    const enrollments = homeCourse ? [{
      id: 'test-student-enrollment', season_id: season.id, course_season_course_id: homeCourse.courseSeasonCourseId,
      course_slug: homeCourse.courseSlug, name: '測試學員', email: user.email,
    }] : []
    return { user, season, courses, enrollments, testAccount }
  }

  const { data: enrollments, error } = await supabaseAdmin
    .from('signup_leads')
    .select('id, season_id, course_season_course_id, course_slug, name, email, status, created_at')
    .eq('source', 'course_payment')
    .eq('season_id', season.id)
    .eq('email', user.email.trim().toLowerCase())
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders }) }
  }

  const seenCourses = new Set<string>()
  const ownedEnrollments = (enrollments ?? []).filter((enrollment) => {
    if (!enrollment.course_season_course_id || seenCourses.has(enrollment.course_season_course_id)) return false
    seenCourses.add(enrollment.course_season_course_id)
    return true
  })

  const courses = managedCourses.flatMap((course) => {
    const courseSeasonCourseId = season.courseOfferingIds[course.slug]
    const billingConfig = season.courseBillingConfigs[course.slug]
    if (!courseSeasonCourseId || !billingConfig?.scheduleReady) return []
    return [{
      seasonId: season.id,
      seasonName: season.name,
      courseSeasonCourseId,
      courseSlug: course.slug,
      courseName: attendanceCourseLabel(course.name),
      weekday: course.weekday,
      classTime: course.classTime || course.time || '',
      location: course.location,
      sessionDates: billingConfig.sessionDates,
      capacity: season.courseCapacities[course.slug] ?? 40,
    }]
  })

  return { user, season, courses, enrollments: ownedEnrollments }
}

export async function GET(request: NextRequest) {
  const context = await loadStudentContext(request)
  if ('response' in context) return context.response

  const offeringIds = context.courses.map((course) => course.courseSeasonCourseId)
  const enrollmentIds = context.enrollments.map((enrollment) => enrollment.id)

  const testAccount = 'testAccount' in context ? context.testAccount : undefined
  if (testAccount) {
    const state = testAccount.sandboxState
    const attendance = Array.isArray(state.studentAttendance) ? state.studentAttendance : []
    const makeups = Array.isArray(state.studentMakeups) ? state.studentMakeups : []
    const courseNames = new Map(context.courses.map((course) => [course.courseSeasonCourseId, course.courseName]))
    return NextResponse.json({
      season: { id: context.season.id, name: context.season.name, code: context.season.code, endsOn: context.season.endsOn },
      courses: context.courses.map((course) => ({ ...course, approvedCount: 0, scheduledMakeupCounts: {} })),
      enrollments: context.enrollments.map((enrollment) => ({
        id: enrollment.id, seasonId: enrollment.season_id, courseSeasonCourseId: enrollment.course_season_course_id,
        courseSlug: enrollment.course_slug, courseName: courseNames.get(enrollment.course_season_course_id) ?? enrollment.course_slug,
        name: enrollment.name, email: enrollment.email,
      })),
      attendance, makeups, cancellations: [], isolatedTest: true,
    }, { headers: noStoreHeaders })
  }

  const [approvedResult, scheduledResult, cancellationResult, attendanceResult, makeupResult] = await Promise.all([
    supabaseAdmin!
      .from('signup_leads')
      .select('course_season_course_id')
      .eq('source', 'course_payment')
      .eq('season_id', context.season.id)
      .eq('status', 'approved'),
    supabaseAdmin!
      .from('course_makeup_requests')
      .select('target_course_season_course_id, target_session_date')
      .eq('season_id', context.season.id)
      .eq('status', 'scheduled'),
    offeringIds.length
      ? supabaseAdmin!
          .from('course_session_cancellations')
          .select('id, course_season_course_id, session_date, reason')
          .in('course_season_course_id', offeringIds)
      : Promise.resolve({ data: [], error: null }),
    enrollmentIds.length
      ? supabaseAdmin!
          .from('course_attendance_records')
          .select('id, course_season_course_id, session_date, enrollment_id, status, note, marked_at, updated_at')
          .in('enrollment_id', enrollmentIds)
          .order('session_date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    enrollmentIds.length
      ? supabaseAdmin!
          .from('course_makeup_requests')
          .select('id, season_id, enrollment_id, original_course_season_course_id, original_course_slug, original_session_date, target_course_season_course_id, target_course_slug, target_session_date, status, requested_at, updated_at')
          .eq('season_id', context.season.id)
          .in('enrollment_id', enrollmentIds)
          .order('original_session_date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  const firstError = [approvedResult.error, scheduledResult.error, cancellationResult.error, attendanceResult.error, makeupResult.error].find(Boolean)
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500, headers: noStoreHeaders })
  }

  const approvedCounts = new Map<string, number>()
  for (const row of approvedResult.data ?? []) {
    if (!row.course_season_course_id) continue
    approvedCounts.set(row.course_season_course_id, (approvedCounts.get(row.course_season_course_id) ?? 0) + 1)
  }
  const scheduledMakeupCounts = new Map<string, Record<string, number>>()
  for (const row of scheduledResult.data ?? []) {
    if (!row.target_course_season_course_id || !row.target_session_date) continue
    const current = scheduledMakeupCounts.get(row.target_course_season_course_id) ?? {}
    current[row.target_session_date] = (current[row.target_session_date] ?? 0) + 1
    scheduledMakeupCounts.set(row.target_course_season_course_id, current)
  }
  const courseNames = new Map(context.courses.map((course) => [course.courseSeasonCourseId, course.courseName]))

  return NextResponse.json({
    season: {
      id: context.season.id,
      name: context.season.name,
      code: context.season.code,
      endsOn: context.season.endsOn,
    },
    courses: context.courses.map((course) => ({
      ...course,
      approvedCount: approvedCounts.get(course.courseSeasonCourseId) ?? 0,
      scheduledMakeupCounts: scheduledMakeupCounts.get(course.courseSeasonCourseId) ?? {},
    })),
    enrollments: context.enrollments.map((enrollment) => ({
      id: enrollment.id,
      seasonId: enrollment.season_id,
      courseSeasonCourseId: enrollment.course_season_course_id,
      courseSlug: enrollment.course_slug,
      courseName: courseNames.get(enrollment.course_season_course_id) ?? enrollment.course_slug,
      name: enrollment.name,
      email: enrollment.email,
    })),
    attendance: attendanceResult.data ?? [],
    makeups: makeupResult.data ?? [],
    cancellations: cancellationResult.data ?? [],
  }, { headers: noStoreHeaders })
}

export async function POST(request: NextRequest) {
  const context = await loadStudentContext(request)
  if ('response' in context) return context.response

  const body = (await request.json().catch(() => ({}))) as StudentAttendanceRequest
  const intent = cleanText(body.intent, 40)
  const enrollmentId = cleanText(body.enrollmentId, 80)
  const enrollment = context.enrollments.find((item) => item.id === enrollmentId)

  if (!enrollment) {
    return NextResponse.json({ error: '找不到你的本季度課程資格。' }, { status: 403, headers: noStoreHeaders })
  }

  const homeCourse = context.courses.find((course) => course.courseSeasonCourseId === enrollment.course_season_course_id)
  if (!homeCourse) {
    return NextResponse.json({ error: '找不到所屬班級的課次設定。' }, { status: 400, headers: noStoreHeaders })
  }

  const testAccount = 'testAccount' in context ? context.testAccount : undefined
  if (testAccount) {
    const now = new Date().toISOString()
    const currentMakeups = Array.isArray(testAccount.sandboxState.studentMakeups)
      ? testAccount.sandboxState.studentMakeups as Array<Record<string, unknown>> : []
    if (intent === 'request_leave') {
      const sessionDate = cleanText(body.sessionDate, 10)
      if (!homeCourse.sessionDates.includes(sessionDate)) return NextResponse.json({ error: '請假課次不屬於測試班級。' }, { status: 400, headers: noStoreHeaders })
      const request = {
        id: `test-makeup:${sessionDate}`, season_id: context.season.id, enrollment_id: enrollment.id,
        original_course_season_course_id: homeCourse.courseSeasonCourseId, original_course_slug: homeCourse.courseSlug,
        original_session_date: sessionDate, target_course_season_course_id: null, target_course_slug: null,
        target_session_date: null, status: 'leave_requested', requested_at: now, updated_at: now,
      }
      await updateIsolatedTestState(testAccount, (state) => ({
        ...state,
        studentMakeups: [...currentMakeups.filter((item) => item.id !== request.id), request],
      }))
      return NextResponse.json({ message: '測試請假已送出，可繼續驗證本季度補課選擇；不會寫入正式名單。', isolatedTest: true }, { headers: noStoreHeaders })
    }
    const requestId = cleanText(body.requestId, 80)
    const existing = currentMakeups.find((item) => item.id === requestId && item.enrollment_id === enrollment.id)
    if (!existing) return NextResponse.json({ error: '找不到測試請假資料。' }, { status: 404, headers: noStoreHeaders })
    let updated: Record<string, unknown> | null = existing
    if (intent === 'schedule_makeup') {
      const targetCourseId = cleanText(body.targetCourseSeasonCourseId, 80)
      const targetSessionDate = cleanText(body.targetSessionDate, 10)
      const targetCourse = context.courses.find((course) => course.courseSeasonCourseId === targetCourseId)
      if (!targetCourse || targetCourseId === homeCourse.courseSeasonCourseId || !targetCourse.sessionDates.includes(targetSessionDate)) {
        return NextResponse.json({ error: '測試補課只能選擇本季度其他班級的有效課次。' }, { status: 400, headers: noStoreHeaders })
      }
      updated = { ...existing, target_course_season_course_id: targetCourseId, target_course_slug: targetCourse.courseSlug, target_session_date: targetSessionDate, status: 'scheduled', updated_at: now }
    } else if (intent === 'cancel_makeup') {
      updated = { ...existing, target_course_season_course_id: null, target_course_slug: null, target_session_date: null, status: 'leave_requested', updated_at: now }
    } else if (intent === 'cancel_leave') {
      updated = null
    } else {
      return NextResponse.json({ error: '無法辨識這次測試點名操作。' }, { status: 400, headers: noStoreHeaders })
    }
    await updateIsolatedTestState(testAccount, (state) => ({
      ...state,
      studentMakeups: updated ? currentMakeups.map((item) => item.id === requestId ? updated! : item) : currentMakeups.filter((item) => item.id !== requestId),
    }))
    return NextResponse.json({ message: intent === 'schedule_makeup' ? '測試補課已安排。' : intent === 'cancel_makeup' ? '測試補課已取消，可重新選擇。' : '測試請假已取消。', isolatedTest: true }, { headers: noStoreHeaders })
  }

  if (intent === 'request_leave') {
    const sessionDate = cleanText(body.sessionDate, 10)
    if (!homeCourse.sessionDates.includes(sessionDate)) {
      return NextResponse.json({ error: '請假課次不屬於你的班級。' }, { status: 400, headers: noStoreHeaders })
    }

    const { data: cancellations, error: cancellationError } = await supabaseAdmin!
      .from('course_session_cancellations')
      .select('session_date')
      .eq('course_season_course_id', homeCourse.courseSeasonCourseId)
    if (cancellationError) return NextResponse.json({ error: cancellationError.message }, { status: 500, headers: noStoreHeaders })

    const cancelledDates = new Set((cancellations ?? []).map((item) => item.session_date))
    if (cancelledDates.has(sessionDate)) {
      return NextResponse.json({ error: '本堂已經停課，不需要另行請假。' }, { status: 409, headers: noStoreHeaders })
    }

    const nearestSessionDate = nearestUpcomingCourseSession(
      homeCourse.sessionDates,
      homeCourse.classTime,
      cancelledDates,
    )

    if (!nearestSessionDate || sessionDate !== nearestSessionDate) {
      return NextResponse.json({ error: '目前只能為最近一堂尚未開始的課程請假。' }, { status: 409, headers: noStoreHeaders })
    }

    const { error } = await supabaseAdmin!.rpc('request_course_leave', {
      p_season_id: context.season.id,
      p_enrollment_id: enrollment.id,
      p_course_season_course_id: homeCourse.courseSeasonCourseId,
      p_course_slug: homeCourse.courseSlug,
      p_session_date: sessionDate,
      p_actor_profile_id: context.user.id,
      p_student_email: enrollment.email,
      p_student_name: enrollment.name,
    })
    if (error) {
      const finalized = /already finalized/i.test(error.message)
      return NextResponse.json({ error: finalized ? '本堂點名已經由教練確認，無法再改為請假。' : error.message }, { status: finalized ? 409 : 500, headers: noStoreHeaders })
    }
    return NextResponse.json({ message: '請假已送出，你可以選擇原課次之後、本季度內其他班級的可用課次補課。' }, { headers: noStoreHeaders })
  }

  const requestId = cleanText(body.requestId, 80)
  const { data: makeupRequest, error: requestError } = await supabaseAdmin!
    .from('course_makeup_requests')
    .select('*')
    .eq('id', requestId)
    .eq('enrollment_id', enrollment.id)
    .eq('season_id', context.season.id)
    .maybeSingle()

  if (requestError) return NextResponse.json({ error: requestError.message }, { status: 500, headers: noStoreHeaders })
  if (!makeupRequest) return NextResponse.json({ error: '找不到這筆請假與補課資料。' }, { status: 404, headers: noStoreHeaders })

  if (intent === 'schedule_makeup') {
    const targetCourseId = cleanText(body.targetCourseSeasonCourseId, 80)
    const targetSessionDate = cleanText(body.targetSessionDate, 10)
    const targetCourse = context.courses.find((course) => course.courseSeasonCourseId === targetCourseId)

    if (!targetCourse) {
      return NextResponse.json(
        { error: '補課只能選擇本季度的其他班級。' },
        { status: 400, headers: noStoreHeaders },
      )
    }
    if (
      makeupRequest.original_course_season_course_id !== homeCourse.courseSeasonCourseId
      || !homeCourse.sessionDates.includes(makeupRequest.original_session_date)
    ) {
      return NextResponse.json({ error: '原請假課次與你的所屬班級不一致。' }, { status: 409, headers: noStoreHeaders })
    }

    const { data: cancellation, error: cancellationError } = await supabaseAdmin!
      .from('course_session_cancellations')
      .select('id')
      .eq('course_season_course_id', targetCourseId)
      .eq('session_date', targetSessionDate)
      .maybeSingle()
    if (cancellationError) return NextResponse.json({ error: cancellationError.message }, { status: 500, headers: noStoreHeaders })

    const targetValidation = validateMakeupTarget({
      seasonId: context.season.id,
      seasonEndsOn: context.season.endsOn,
      homeCourseId: homeCourse.courseSeasonCourseId,
      originalSessionDate: makeupRequest.original_session_date,
      originalClassTime: homeCourse.classTime,
      targetCourse: {
        seasonId: targetCourse.seasonId,
        courseId: targetCourse.courseSeasonCourseId,
        sessionDates: targetCourse.sessionDates,
        classTime: targetCourse.classTime,
      },
      targetSessionDate,
      cancelled: Boolean(cancellation),
    })
    if (!targetValidation.valid) {
      return NextResponse.json(
        { error: targetValidation.message },
        { status: targetValidation.status, headers: noStoreHeaders },
      )
    }

    const { error } = await supabaseAdmin!.rpc('schedule_course_makeup', {
      p_request_id: makeupRequest.id,
      p_target_course_season_course_id: targetCourseId,
      p_target_session_date: targetSessionDate,
      p_actor_profile_id: context.user.id,
    })
    if (error) {
      const capacityReached = /makeup target capacity reached/i.test(error.message)
      return NextResponse.json({ error: capacityReached ? '這一堂已達班級名額上限，請選擇其他補課課次。' : error.message }, { status: capacityReached ? 409 : 500, headers: noStoreHeaders })
    }
    return NextResponse.json({ message: `已安排至 ${targetCourse.courseName} 補課。` }, { headers: noStoreHeaders })
  }

  if (intent === 'cancel_makeup') {
    const targetCourse = context.courses.find((course) => course.courseSeasonCourseId === makeupRequest.target_course_season_course_id)
    if (!makeupRequest.target_session_date || !targetCourse || !isBeforeCourseStart(makeupRequest.target_session_date, targetCourse.classTime)) {
      return NextResponse.json({ error: '補課課次已開始，無法再取消或更換。' }, { status: 409, headers: noStoreHeaders })
    }
    if (makeupRequest.status !== 'scheduled') {
      return NextResponse.json({ error: '這筆補課目前不在已安排狀態。' }, { status: 409, headers: noStoreHeaders })
    }
    const { error } = await supabaseAdmin!
      .from('course_makeup_requests')
      .update({
        target_course_season_course_id: null,
        target_course_slug: null,
        target_session_date: null,
        status: 'leave_requested',
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', makeupRequest.id)
      .eq('status', 'scheduled')
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })
    return NextResponse.json({ message: '已取消原補課安排，可以重新選擇其他課次。' }, { headers: noStoreHeaders })
  }

  if (intent === 'cancel_leave') {
    if (!isBeforeCourseStart(makeupRequest.original_session_date, homeCourse.classTime)) {
      return NextResponse.json({ error: '原課次已開始，無法再取消請假。' }, { status: 409, headers: noStoreHeaders })
    }
    const { error } = await supabaseAdmin!.rpc('cancel_course_leave', {
      p_request_id: makeupRequest.id,
      p_actor_profile_id: context.user.id,
    })
    if (error) {
      const finalized = /already finalized/i.test(error.message)
      return NextResponse.json({ error: finalized ? '本堂點名或補課已經確認，無法取消請假。' : error.message }, { status: finalized ? 409 : 500, headers: noStoreHeaders })
    }
    return NextResponse.json({ message: '請假已取消，本堂恢復為待點名。' }, { headers: noStoreHeaders })
  }

  return NextResponse.json({ error: '無法辨識這次點名操作。' }, { status: 400, headers: noStoreHeaders })
}
