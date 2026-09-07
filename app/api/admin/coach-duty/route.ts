import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { APP_TIME_ZONE_LABEL } from '@/lib/app-time'
import { ATTENDANCE_ACCEPTANCE_TEST, acceptanceTestPhase } from '@/lib/attendance-acceptance-test'
import { canChangeSubstituteAtState, canReviewLeaveAtState, coachDutyWindow } from '@/lib/coach-duty-policy'
import { loadCoachDutyItems } from '@/lib/coach-session-duty'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }

function clean(value: unknown, length = 800) {
  return typeof value === 'string' ? value.trim().slice(0, length) : ''
}

async function applyAtomicDutyTransition(assignmentId: string, actorProfileId: string, action: string, payload: Record<string, unknown>) {
  return supabaseAdmin!.rpc('apply_coach_duty_transition', {
    p_assignment_id: assignmentId,
    p_action: action,
    p_actor_profile_id: actorProfileId,
    p_payload: payload,
  })
}

async function requireAdmin(request: NextRequest) {
  if (!supabaseAdmin) return { error: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers }) }
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return { error: NextResponse.json({ error: '請先登入管理員帳號。' }, { status: 401, headers }) }
  const profile = await getAdminProfile(user)
  if (!profile) return { error: NextResponse.json({ error: '只有管理員可以管理教練到課紀錄。' }, { status: 403, headers }) }
  return { user, profile }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  try {
    const [items, coachResult, auditResult, acceptanceResult] = await Promise.all([
      loadCoachDutyItems({ isAdmin: true }),
      supabaseAdmin!.from('profiles').select('id, name, email').in('role', ['coach', 'admin']).order('name'),
      supabaseAdmin!.from('coach_session_duty_audit_log').select('assignment_id, action, reason, actor_profile_id, created_at').order('created_at', { ascending: false }).limit(300),
      supabaseAdmin!
        .from('site_acceptance_test_checkins')
        .select('participant_profile_id, participant_role, checked_in_at')
        .eq('test_key', ATTENDANCE_ACCEPTANCE_TEST.key)
        .order('checked_in_at', { ascending: true }),
    ])
    const error = [coachResult.error, auditResult.error, acceptanceResult.error].find(Boolean)
    if (error) throw error
    const participantIds = [...new Set((acceptanceResult.data ?? []).map((row) => row.participant_profile_id))]
    const participantResult = participantIds.length
      ? await supabaseAdmin!.from('profiles').select('id, name, email').in('id', participantIds)
      : { data: [], error: null }
    if (participantResult.error) throw participantResult.error
    const participants = new Map((participantResult.data ?? []).map((profile) => [
      profile.id,
      { name: profile.name || profile.email || '未命名帳號', email: profile.email || '' },
    ]))
    return NextResponse.json({
      items,
      coaches: (coachResult.data ?? []).map((coach) => ({ id: coach.id, name: coach.name || coach.email || '未命名教練', email: coach.email || '' })),
      audits: auditResult.data ?? [],
      acceptanceTest: {
        test: ATTENDANCE_ACCEPTANCE_TEST,
        phase: acceptanceTestPhase(),
        checkins: (acceptanceResult.data ?? []).map((row) => ({
          participantProfileId: row.participant_profile_id,
          participantRole: row.participant_role,
          checkedInAt: row.checked_in_at,
          name: participants.get(row.participant_profile_id)?.name ?? '未命名帳號',
          email: participants.get(row.participant_profile_id)?.email ?? '',
        })),
      },
      serverTime: new Date().toISOString(),
      timeZone: APP_TIME_ZONE_LABEL,
    }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '讀取教練到課管理資料失敗。' }, { status: 500, headers })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const action = clean(body.action, 50)
  const assignmentId = clean(body.assignmentId, 80)
  const reason = clean(body.reason)
  if (!assignmentId) return NextResponse.json({ error: '缺少課次安排。' }, { status: 400, headers })
  const { data: assignment, error: assignmentError } = await supabaseAdmin!.from('coach_session_assignments').select('*').eq('id', assignmentId).maybeSingle()
  if (assignmentError || !assignment) return NextResponse.json({ error: assignmentError?.message || '找不到課次安排。' }, { status: 404, headers })

  const [{ data: existingCheckin, error: checkinError }, { data: cancellation, error: cancellationError }, { data: course, error: courseError }] = await Promise.all([
    supabaseAdmin!.from('coach_session_checkins').select('*').eq('assignment_id', assignment.id).maybeSingle(),
    supabaseAdmin!.from('course_session_cancellations').select('id').eq('course_season_course_id', assignment.course_season_course_id).eq('session_date', assignment.session_date).maybeSingle(),
    supabaseAdmin!.from('course_season_courses').select('start_time, time_zone').eq('id', assignment.course_season_course_id).single(),
  ])
  if (checkinError || cancellationError || courseError || !course) {
    const error = checkinError || cancellationError || courseError
    return NextResponse.json({ error: error?.message || '找不到課程開始時間。' }, { status: 500, headers })
  }
  const startTime = typeof course.start_time === 'string' ? course.start_time.slice(0, 5) : ''
  const window = coachDutyWindow(assignment.session_date, startTime, new Date())

  try {
    if (action === 'review_leave') {
      const decision = clean(body.decision, 20)
      if (!['approved', 'rejected'].includes(decision)) return NextResponse.json({ error: '請假核對結果無效。' }, { status: 400, headers })
      if (assignment.leave_status !== 'requested') return NextResponse.json({ error: '這堂課目前沒有待核對的請假申請。' }, { status: 409, headers })
      if (cancellation) return NextResponse.json({ error: '本堂已停課，不能再核對請假。' }, { status: 409, headers })
      if (existingCheckin) return NextResponse.json({ error: '本堂已完成簽到，不能再核對一般請假。' }, { status: 409, headers })
      if (decision === 'rejected' && !reason) return NextResponse.json({ error: '拒絕請假時必須填寫原因。' }, { status: 400, headers })
      if (window.phase === 'closed' && !reason) return NextResponse.json({ error: '課次已結束，核對請假必須填寫異常處理原因。' }, { status: 400, headers })
      if (!canReviewLeaveAtState({
        cancelled: Boolean(cancellation),
        hasCheckin: Boolean(existingCheckin),
        leaveStatus: assignment.leave_status,
        decision: decision as 'approved' | 'rejected',
        windowPhase: window.phase,
        hasReason: Boolean(reason),
      })) return NextResponse.json({ error: '請假狀態已過期或課次已結束，請重新整理後確認。' }, { status: 409, headers })
      const { data: transition, error } = await applyAtomicDutyTransition(assignmentId, auth.user.id, 'review_leave', { decision, reason })
      if (error) return NextResponse.json({ error: error.message || '請假狀態已被其他操作更新，請重新整理。' }, { status: 409, headers })
      return NextResponse.json({ message: decision === 'approved' ? '請假已核准；代班仍須完成邀請、接受與最終確認。' : '請假已拒絕，原定教練仍為本堂實際教練。', transition }, { headers })
    }

    if (action === 'assign_substitute') {
      const substituteCoachId = clean(body.substituteCoachId, 80)
      if (!substituteCoachId || substituteCoachId === assignment.scheduled_coach_id) return NextResponse.json({ error: '請選擇另一位教練作為代班。' }, { status: 400, headers })
      const { data: substituteCoach, error: substituteCoachError } = await supabaseAdmin!
        .from('profiles')
        .select('id, role')
        .eq('id', substituteCoachId)
        .in('role', ['coach', 'admin'])
        .maybeSingle()
      if (substituteCoachError) throw substituteCoachError
      if (!substituteCoach) return NextResponse.json({ error: '代班帳號目前沒有啟用的教練權限。' }, { status: 400, headers })
      if (cancellation) return NextResponse.json({ error: '本堂已停課，不能安排或更換代班。' }, { status: 409, headers })
      if (existingCheckin) return NextResponse.json({ error: '本堂已完成簽到，不能安排或更換代班。' }, { status: 409, headers })
      const isAfterStart = Boolean(startTime && Date.now() > new Date(`${assignment.session_date}T${startTime}:00+08:00`).getTime())
      if (isAfterStart && !reason) return NextResponse.json({ error: '開課後緊急指定或更換代班必須填寫原因。' }, { status: 400, headers })
      if (!canChangeSubstituteAtState({ cancelled: Boolean(cancellation), hasCheckin: Boolean(existingCheckin), isAdmin: true, windowPhase: window.phase, hasReason: Boolean(reason) })) {
        return NextResponse.json({ error: '課次狀態已結束或已變更；請填寫原因並重新整理後再處理。' }, { status: 409, headers })
      }
      const { data: transition, error } = await applyAtomicDutyTransition(assignmentId, auth.user.id, 'assign_substitute', { substituteCoachId, reason })
      if (error) return NextResponse.json({ error: error.message || '代班狀態已被其他操作更新，請重新整理。' }, { status: 409, headers })
      return NextResponse.json({ message: '代班邀請已送出，等待代班教練回覆後再由管理員最終確認。', transition }, { headers })
    }

    if (action === 'confirm_substitute') {
      const emergency = body.emergency === true
      if (!assignment.substitute_coach_id) return NextResponse.json({ error: '尚未指定代班教練。' }, { status: 400, headers })
      if (!emergency && assignment.substitute_response !== 'accepted') return NextResponse.json({ error: '代班教練尚未接受邀請，不能最終確認。' }, { status: 409, headers })
      if (emergency && !reason) return NextResponse.json({ error: '緊急代班確認必須填寫原因。' }, { status: 400, headers })
      const { data: substituteCoach, error: substituteCoachError } = await supabaseAdmin!
        .from('profiles')
        .select('id, role')
        .eq('id', assignment.substitute_coach_id)
        .in('role', ['coach', 'admin'])
        .maybeSingle()
      if (substituteCoachError) throw substituteCoachError
      if (!substituteCoach) return NextResponse.json({ error: '目前代班帳號已沒有啟用的教練權限。' }, { status: 409, headers })
      if (cancellation) return NextResponse.json({ error: '本堂已停課，不能確認代班。' }, { status: 409, headers })
      if (existingCheckin) return NextResponse.json({ error: '本堂已完成簽到，不能再變更代班。' }, { status: 409, headers })
      if (window.phase === 'closed' && !emergency) return NextResponse.json({ error: '課次已結束，請使用有原因的緊急確認。' }, { status: 409, headers })
      if (!canChangeSubstituteAtState({ cancelled: Boolean(cancellation), hasCheckin: Boolean(existingCheckin), isAdmin: true, windowPhase: window.phase, hasReason: Boolean(reason) })) {
        return NextResponse.json({ error: '課次狀態已過期，請重新整理後再處理。' }, { status: 409, headers })
      }
      const { data: transition, error } = await applyAtomicDutyTransition(assignmentId, auth.user.id, 'confirm_substitute', { emergency, reason })
      if (error) return NextResponse.json({ error: error.message || '代班狀態已被其他操作更新，請重新整理。' }, { status: 409, headers })
      return NextResponse.json({ message: '代班已最終確認；原教練權限已移除，代班教練可簽到並核實學員出席。', transition }, { headers })
    }

    if (action === 'manual_correction') {
      const state = clean(body.attendanceState, 30)
      if (!['on_time', 'late', 'not_checked_in'].includes(state) || !reason) return NextResponse.json({ error: '人工修正必須選擇狀態並填寫原因。' }, { status: 400, headers })
      const { data: transition, error } = await applyAtomicDutyTransition(assignmentId, auth.user.id, 'manual_correction', { attendanceState: state, reason })
      if (error) return NextResponse.json({ error: error.message || '出勤狀態已變更，請重新整理。' }, { status: 409, headers })
      return NextResponse.json({ message: '出勤狀態已人工修正，操作人、時間與原因已保留。', transition }, { headers })
    }

    return NextResponse.json({ error: '不支援的操作。' }, { status: 400, headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '更新教練到課資料失敗。' }, { status: 500, headers })
  }
}
