import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { APP_TIME_ZONE_LABEL } from '@/lib/app-time'
import { auditCoachDuty, coachDutyPunctuality, coachDutyWindow, loadCoachDutyItems } from '@/lib/coach-session-duty'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getIsolatedMondayCourse, getIsolatedTestAccount, updateIsolatedTestState } from '@/lib/test-account'

const headers = { 'Cache-Control': 'no-store' }

function clean(value: unknown, length = 500) {
  return typeof value === 'string' ? value.trim().slice(0, length) : ''
}

async function requireCoach(request: NextRequest) {
  if (!supabaseAdmin) return { error: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers }) }
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return { error: NextResponse.json({ error: '請先登入教練帳號。' }, { status: 401, headers }) }
  const testAccount = await getIsolatedTestAccount(user)
  if (testAccount) {
    if (testAccount.currentMode !== 'coach') return { error: NextResponse.json({ error: '請先切換至教練測試模式。' }, { status: 403, headers }) }
    return { user, isAdmin: false, testAccount }
  }
  const [{ data: profile }, admin] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, role').eq('id', user.id).maybeSingle(),
    getAdminProfile(user),
  ])
  if (!admin && profile?.role !== 'coach') return { error: NextResponse.json({ error: '目前帳號沒有教練權限。' }, { status: 403, headers }) }
  return { user, isAdmin: Boolean(admin) }
}

export async function GET(request: NextRequest) {
  const auth = await requireCoach(request)
  if ('error' in auth) return auth.error
  try {
    const testAccount = 'testAccount' in auth ? auth.testAccount : undefined
    if (testAccount) {
      const course = await getIsolatedMondayCourse(testAccount)
      if (!course) return NextResponse.json({ items: [], coaches: [], isolatedTest: true }, { headers })
      const checkins = (testAccount.sandboxState.dutyCheckins ?? {}) as Record<string, { checkedInAt: string; punctuality: 'on_time' | 'late' }>
      const leaves = (testAccount.sandboxState.dutyLeaves ?? {}) as Record<string, { status: 'requested' | 'approved' | 'rejected'; reason: string }>
      const now = new Date()
      const items = course.sessionDates.map((sessionDate) => {
        const id = `test-duty:${sessionDate}`
        const checkin = checkins[sessionDate]
        const leave = leaves[sessionDate]
        const window = coachDutyWindow(sessionDate, course.startTime, now)
        const attendanceState = checkin?.punctuality
          ?? (leave?.status === 'approved' ? 'leave_approved' : window.phase === 'missing' ? 'missing_start_time' : window.phase === 'upcoming' ? 'upcoming' : window.phase === 'open' ? 'check_in_open' : 'not_checked_in')
        return {
          id, seasonId: course.seasonId, seasonName: course.seasonName, courseSeasonCourseId: course.courseSeasonCourseId,
          courseSlug: course.courseSlug, courseName: course.courseName, weekday: course.weekday, location: course.location,
          sessionDate, startTime: course.startTime, timeZone: APP_TIME_ZONE_LABEL, scheduledCoachId: auth.user.id,
          scheduledCoachName: '測試教練', actualCoachId: auth.user.id, actualCoachName: '測試教練', coachRole: 'coach',
          leaveStatus: leave?.status ?? 'none', leaveReason: leave?.reason ?? '', recommendedSubstituteId: '', recommendedSubstituteName: '',
          substituteCoachId: '', substituteCoachName: '', substituteResponse: 'none', adminStatus: leave ? 'pending' : 'not_required', adminReason: '',
          attendanceState, checkedInAt: checkin?.checkedInAt ?? '', punctuality: checkin?.punctuality ?? '', manualCorrection: false,
          canCheckIn: !checkin && !leave && window.phase === 'open', checkInOpensAt: window.opensAt?.toISOString() ?? '',
          canRequestLeave: !checkin && !leave && window.phase !== 'closed', canRespondSubstitute: false,
          salaryStatus: 'pending_rate', salaryStatusLabel: '待設定課酬', isCancelled: false,
        }
      })
      return NextResponse.json({ items, coaches: [], serverTime: now.toISOString(), timeZone: APP_TIME_ZONE_LABEL, isolatedTest: true }, { headers })
    }
    const [items, coachesResult] = await Promise.all([
      loadCoachDutyItems({ userId: auth.user.id, isAdmin: auth.isAdmin }),
      supabaseAdmin!.from('profiles').select('id, name, email').in('role', ['coach', 'admin']).order('name'),
    ])
    if (coachesResult.error) throw coachesResult.error
    return NextResponse.json({
      items,
      coaches: (coachesResult.data ?? []).map((coach) => ({ id: coach.id, name: coach.name || coach.email || '未命名教練' })),
      serverTime: new Date().toISOString(),
      timeZone: APP_TIME_ZONE_LABEL,
    }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '讀取教練到課資料失敗。' }, { status: 500, headers })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCoach(request)
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const intent = clean(body.intent, 40)
  const assignmentId = clean(body.assignmentId, 80)
  if (!assignmentId) return NextResponse.json({ error: '缺少課次安排。' }, { status: 400, headers })

  const testAccount = 'testAccount' in auth ? auth.testAccount : undefined
  if (testAccount) {
    const match = assignmentId.match(/^test-duty:(\d{4}-\d{2}-\d{2})$/)
    if (!match) return NextResponse.json({ error: '測試課次無效。' }, { status: 404, headers })
    const sessionDate = match[1]
    const course = await getIsolatedMondayCourse(testAccount)
    if (!course || !course.sessionDates.includes(sessionDate)) return NextResponse.json({ error: '測試課次無效。' }, { status: 404, headers })
    if (intent === 'check_in') {
      const now = new Date()
      const punctuality = coachDutyPunctuality(sessionDate, course.startTime, now)
      if (!punctuality) return NextResponse.json({ error: '目前不在簽到開放時間內；簽到僅限課前 15 分鐘至開課後 15 分鐘。' }, { status: 409, headers })
      await updateIsolatedTestState(testAccount, (state) => ({
        ...state,
        dutyCheckins: { ...(state.dutyCheckins as Record<string, unknown> | undefined), [sessionDate]: { checkedInAt: now.toISOString(), punctuality } },
      }))
      return NextResponse.json({ message: punctuality === 'on_time' ? '測試沙盒已記錄準時簽到。' : '測試沙盒已記錄遲到簽到。', isolatedTest: true }, { headers })
    }
    if (intent === 'request_leave') {
      const reason = clean(body.reason, 800)
      if (!reason) return NextResponse.json({ error: '請填寫請假原因。' }, { status: 400, headers })
      await updateIsolatedTestState(testAccount, (state) => ({
        ...state,
        dutyLeaves: { ...(state.dutyLeaves as Record<string, unknown> | undefined), [sessionDate]: { status: 'requested', reason } },
      }))
      return NextResponse.json({ message: '測試請假已寫入獨立沙盒，不會通知真實管理員或教練。', isolatedTest: true }, { headers })
    }
    return NextResponse.json({ error: '這項測試操作目前不適用。' }, { status: 400, headers })
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin!
    .from('coach_session_assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle()
  if (assignmentError || !assignment) return NextResponse.json({ error: assignmentError?.message || '找不到課次安排。' }, { status: 404, headers })

  try {
    if (intent === 'check_in') {
      if (assignment.actual_coach_id !== auth.user.id) return NextResponse.json({ error: '只有本堂實際授課教練可以完成本人到課簽到。' }, { status: 403, headers })
      if (assignment.leave_status === 'approved' && assignment.scheduled_coach_id === auth.user.id) return NextResponse.json({ error: '你的本堂請假已核准，不能再進行本人到課簽到。' }, { status: 409, headers })
      const [{ data: cancellation }, { data: course, error: courseError }] = await Promise.all([
        supabaseAdmin!.from('course_session_cancellations').select('id').eq('course_season_course_id', assignment.course_season_course_id).eq('session_date', assignment.session_date).maybeSingle(),
        supabaseAdmin!.from('course_season_courses').select('start_time, time_zone').eq('id', assignment.course_season_course_id).single(),
      ])
      if (courseError || !course) throw courseError || new Error('找不到課程開始時間。')
      if (cancellation) return NextResponse.json({ error: '本堂已停課，不需要簽到。' }, { status: 409, headers })
      const startTime = typeof course.start_time === 'string' ? course.start_time.slice(0, 5) : ''
      if (!startTime) return NextResponse.json({ error: '本堂尚未設定簽到判定開始時間，請聯絡管理員補齊。' }, { status: 409, headers })
      const now = new Date()
      const punctuality = coachDutyPunctuality(assignment.session_date, startTime, now)
      if (!punctuality) return NextResponse.json({ error: '目前不在簽到開放時間內；簽到僅限課前 15 分鐘至開課後 15 分鐘。' }, { status: 409, headers })
      const { data: checkin, error } = await supabaseAdmin!.from('coach_session_checkins').insert({
        assignment_id: assignment.id,
        actual_coach_id: auth.user.id,
        checked_in_at: now.toISOString(),
        punctuality,
      }).select('*').single()
      if (error || !checkin) {
        const duplicate = error?.code === '23505'
        return NextResponse.json({ error: duplicate ? '本堂已經完成簽到。' : error?.message || '簽到失敗。' }, { status: duplicate ? 409 : 500, headers })
      }
      await auditCoachDuty(assignment.id, auth.user.id, 'coach_checked_in', '', { checkedInAt: checkin.checked_in_at, punctuality })
      return NextResponse.json({ message: punctuality === 'on_time' ? '已完成準時簽到。' : '已完成遲到簽到。', checkin }, { headers })
    }

    if (intent === 'request_leave') {
      const reason = clean(body.reason, 800)
      const recommendedSubstituteId = clean(body.recommendedSubstituteId, 80) || null
      if (assignment.scheduled_coach_id !== auth.user.id) return NextResponse.json({ error: '只有原定教練可以提出本堂請假。' }, { status: 403, headers })
      if (!reason) return NextResponse.json({ error: '請填寫請假原因。' }, { status: 400, headers })
      if (assignment.leave_status !== 'none') return NextResponse.json({ error: '本堂已經有請假處理紀錄。' }, { status: 409, headers })
      if (recommendedSubstituteId === auth.user.id) return NextResponse.json({ error: '不能推薦自己作為代班教練。' }, { status: 400, headers })
      const now = new Date().toISOString()
      const { error } = await supabaseAdmin!.from('coach_session_assignments').update({
        leave_status: 'requested',
        leave_reason: reason,
        leave_requested_at: now,
        recommended_substitute_id: recommendedSubstituteId,
        admin_status: 'pending',
      }).eq('id', assignment.id).eq('scheduled_coach_id', auth.user.id)
      if (error) throw error
      await auditCoachDuty(assignment.id, auth.user.id, 'leave_requested', reason, { recommendedSubstituteId })
      return NextResponse.json({ message: '請假申請已送出，等待管理員核對與安排代班。' }, { headers })
    }

    if (intent === 'respond_substitute') {
      const response = clean(body.response, 20)
      if (!['accepted', 'rejected'].includes(response)) return NextResponse.json({ error: '代班回覆無效。' }, { status: 400, headers })
      if (assignment.substitute_coach_id !== auth.user.id || assignment.substitute_response !== 'pending') return NextResponse.json({ error: '這堂課目前沒有等待你回覆的代班邀請。' }, { status: 403, headers })
      const now = new Date().toISOString()
      const { error } = await supabaseAdmin!.from('coach_session_assignments').update({
        substitute_response: response,
        substitute_responded_at: now,
      }).eq('id', assignment.id).eq('substitute_coach_id', auth.user.id)
      if (error) throw error
      await auditCoachDuty(assignment.id, auth.user.id, `substitute_${response}`, '', {})
      return NextResponse.json({ message: response === 'accepted' ? '已接受代班邀請，等待管理員最終確認。' : '已拒絕代班邀請，管理員會另行安排。' }, { headers })
    }

    return NextResponse.json({ error: '不支援的操作。' }, { status: 400, headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '更新教練到課資料失敗。' }, { status: 500, headers })
  }
}
