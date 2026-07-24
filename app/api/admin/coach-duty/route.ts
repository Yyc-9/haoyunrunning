import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { APP_TIME_ZONE_LABEL } from '@/lib/app-time'
import { ATTENDANCE_ACCEPTANCE_TEST, acceptanceTestPhase } from '@/lib/attendance-acceptance-test'
import { auditCoachDuty, loadCoachDutyItems } from '@/lib/coach-session-duty'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }

function clean(value: unknown, length = 800) {
  return typeof value === 'string' ? value.trim().slice(0, length) : ''
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

  try {
    const now = new Date().toISOString()
    if (action === 'review_leave') {
      const decision = clean(body.decision, 20)
      if (!['approved', 'rejected'].includes(decision)) return NextResponse.json({ error: '請假核對結果無效。' }, { status: 400, headers })
      if (assignment.leave_status !== 'requested') return NextResponse.json({ error: '這堂課目前沒有待核對的請假申請。' }, { status: 409, headers })
      if (decision === 'rejected' && !reason) return NextResponse.json({ error: '拒絕請假時必須填寫原因。' }, { status: 400, headers })
      const { error } = await supabaseAdmin!.from('coach_session_assignments').update({
        leave_status: decision,
        admin_status: decision,
        admin_reviewed_by: auth.user.id,
        admin_reviewed_at: now,
        admin_reason: reason,
        actual_coach_id: decision === 'rejected' ? assignment.scheduled_coach_id : null,
        coach_role: assignment.coach_role,
      }).eq('id', assignmentId)
      if (error) throw error
      await auditCoachDuty(assignmentId, auth.user.id, `leave_${decision}`, reason, { previous: assignment, actualCoachId: decision === 'rejected' ? assignment.scheduled_coach_id : null })
      return NextResponse.json({ message: decision === 'approved' ? '請假已核准；代班仍須完成邀請、接受與最終確認。' : '請假已拒絕，原定教練仍為本堂實際教練。' }, { headers })
    }

    if (action === 'assign_substitute') {
      const substituteCoachId = clean(body.substituteCoachId, 80)
      if (!substituteCoachId || substituteCoachId === assignment.scheduled_coach_id) return NextResponse.json({ error: '請選擇另一位教練作為代班。' }, { status: 400, headers })
      const startsAt = await supabaseAdmin!.from('course_season_courses').select('start_time').eq('id', assignment.course_season_course_id).single()
      const startTime = typeof startsAt.data?.start_time === 'string' ? startsAt.data.start_time.slice(0, 5) : ''
      const isAfterStart = Boolean(startTime && Date.now() > new Date(`${assignment.session_date}T${startTime}:00+08:00`).getTime())
      if (isAfterStart && !reason) return NextResponse.json({ error: '開課後緊急指定或更換代班必須填寫原因。' }, { status: 400, headers })
      const { error } = await supabaseAdmin!.from('coach_session_assignments').update({
        leave_status: assignment.leave_status === 'none' ? 'approved' : assignment.leave_status,
        admin_status: 'pending',
        substitute_coach_id: substituteCoachId,
        substitute_response: 'pending',
        substitute_responded_at: null,
        actual_coach_id: null,
        admin_reviewed_by: auth.user.id,
        admin_reviewed_at: now,
        admin_reason: reason,
      }).eq('id', assignmentId)
      if (error) throw error
      await auditCoachDuty(assignmentId, auth.user.id, 'substitute_assigned', reason, { previous: assignment, substituteCoachId, isAfterStart })
      return NextResponse.json({ message: '代班邀請已送出，等待代班教練回覆後再由管理員最終確認。' }, { headers })
    }

    if (action === 'confirm_substitute') {
      const emergency = body.emergency === true
      if (!assignment.substitute_coach_id) return NextResponse.json({ error: '尚未指定代班教練。' }, { status: 400, headers })
      if (!emergency && assignment.substitute_response !== 'accepted') return NextResponse.json({ error: '代班教練尚未接受邀請，不能最終確認。' }, { status: 409, headers })
      if (emergency && !reason) return NextResponse.json({ error: '緊急代班確認必須填寫原因。' }, { status: 400, headers })
      const { error } = await supabaseAdmin!.from('coach_session_assignments').update({
        leave_status: 'approved',
        admin_status: 'approved',
        substitute_response: emergency ? 'accepted' : assignment.substitute_response,
        substitute_responded_at: emergency ? now : assignment.substitute_responded_at,
        actual_coach_id: assignment.substitute_coach_id,
        coach_role: 'substitute',
        admin_reviewed_by: auth.user.id,
        admin_reviewed_at: now,
        admin_reason: reason,
      }).eq('id', assignmentId)
      if (error) throw error
      await auditCoachDuty(assignmentId, auth.user.id, emergency ? 'emergency_substitute_confirmed' : 'substitute_confirmed', reason, { previous: assignment, actualCoachId: assignment.substitute_coach_id })
      return NextResponse.json({ message: '代班已最終確認；原教練權限已移除，代班教練可簽到並核實學員出席。' }, { headers })
    }

    if (action === 'manual_correction') {
      const state = clean(body.attendanceState, 30)
      if (!['on_time', 'late', 'not_checked_in'].includes(state) || !reason) return NextResponse.json({ error: '人工修正必須選擇狀態並填寫原因。' }, { status: 400, headers })
      if (state === 'not_checked_in') {
        const { error } = await supabaseAdmin!.from('coach_session_checkins').delete().eq('assignment_id', assignmentId)
        if (error) throw error
      } else {
        if (!assignment.actual_coach_id) return NextResponse.json({ error: '尚未確認本堂實際授課教練。' }, { status: 409, headers })
        const { error } = await supabaseAdmin!.from('coach_session_checkins').upsert({
          assignment_id: assignmentId,
          actual_coach_id: assignment.actual_coach_id,
          checked_in_at: now,
          punctuality: state,
          manual_correction: true,
          corrected_by: auth.user.id,
          corrected_at: now,
          correction_reason: reason,
        }, { onConflict: 'assignment_id' })
        if (error) throw error
      }
      await auditCoachDuty(assignmentId, auth.user.id, 'attendance_manually_corrected', reason, { previous: assignment, attendanceState: state })
      return NextResponse.json({ message: '出勤狀態已人工修正，操作人、時間與原因已保留。' }, { headers })
    }

    return NextResponse.json({ error: '不支援的操作。' }, { status: 400, headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '更新教練到課資料失敗。' }, { status: 500, headers })
  }
}
