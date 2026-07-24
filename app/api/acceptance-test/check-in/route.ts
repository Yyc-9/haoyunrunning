import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import {
  ATTENDANCE_ACCEPTANCE_TEST,
  acceptanceTestPhase,
  canSubmitAcceptanceCheckIn,
  type AcceptanceParticipantRole,
} from '@/lib/attendance-acceptance-test'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }

function participantRole(value: string | null | undefined): AcceptanceParticipantRole | null {
  return value === 'coach' || value === 'student' ? value : null
}

async function loadEligibility(request: NextRequest, role: AcceptanceParticipantRole) {
  if (!supabaseAdmin) return { error: 'Supabase 尚未設定。', status: 500 }
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) return { error: '請先登入網站帳號。', status: 401 }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, name, email')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) return { error: profileError.message, status: 500 }
  if (!profile) return { error: '找不到登入帳號資料。', status: 404 }

  if (role === 'coach') {
    const admin = await getAdminProfile(user)
    if (profile.role !== 'coach' && !admin) {
      return { eligible: false, user, profile, reason: '目前帳號沒有教練權限。' }
    }
    return { eligible: true, user, profile }
  }

  const season = await getCurrentCourseSeason()
  if (!season) return { eligible: false, user, profile, reason: '目前沒有可測試的季度課程。' }
  const { count, error } = await supabaseAdmin
    .from('signup_leads')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'course_payment')
    .eq('season_id', season.id)
    .eq('email', user.email.trim().toLowerCase())
    .eq('status', 'approved')
  if (error) return { error: error.message, status: 500 }
  if (!count) return { eligible: false, user, profile, reason: '目前登入信箱沒有本季度已核准課程。' }
  return { eligible: true, user, profile }
}

async function responsePayload(request: NextRequest, role: AcceptanceParticipantRole) {
  const eligibility = await loadEligibility(request, role)
  if ('error' in eligibility) {
    return { response: NextResponse.json({ error: eligibility.error }, { status: eligibility.status, headers }) }
  }
  if (!eligibility.eligible) {
    return {
      response: NextResponse.json({
        test: ATTENDANCE_ACCEPTANCE_TEST,
        phase: acceptanceTestPhase(),
        eligible: false,
        reason: eligibility.reason,
      }, { headers }),
    }
  }

  const { data, error } = await supabaseAdmin!
    .from('site_acceptance_test_checkins')
    .select('id, checked_in_at')
    .eq('test_key', ATTENDANCE_ACCEPTANCE_TEST.key)
    .eq('participant_profile_id', eligibility.profile.id)
    .eq('participant_role', role)
    .maybeSingle()
  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500, headers }) }
  }
  return { eligibility, checkin: data }
}

export async function GET(request: NextRequest) {
  const role = participantRole(request.nextUrl.searchParams.get('role'))
  if (!role) return NextResponse.json({ error: '測試簽到身分無效。' }, { status: 400, headers })
  const loaded = await responsePayload(request, role)
  if ('response' in loaded) return loaded.response
  return NextResponse.json({
    test: ATTENDANCE_ACCEPTANCE_TEST,
    phase: acceptanceTestPhase(),
    eligible: true,
    checkedInAt: loaded.checkin?.checked_in_at ?? '',
    serverTime: new Date().toISOString(),
  }, { headers })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { role?: string }
  const role = participantRole(body.role)
  if (!role) return NextResponse.json({ error: '測試簽到身分無效。' }, { status: 400, headers })
  const loaded = await responsePayload(request, role)
  if ('response' in loaded) return loaded.response

  const now = new Date()
  if (!canSubmitAcceptanceCheckIn({ now, alreadyCheckedIn: Boolean(loaded.checkin) })) {
    if (loaded.checkin) {
      return NextResponse.json({
        message: '你已經完成本次網站驗收測試簽到。',
        checkedInAt: loaded.checkin.checked_in_at,
      }, { headers })
    }
    return NextResponse.json({
      error: acceptanceTestPhase(now) === 'upcoming'
        ? '測試簽到將於 7 月 25 日 09:00（UTC+8）開放。'
        : '本次測試簽到時段已經結束。',
    }, { status: 409, headers })
  }

  const { data, error } = await supabaseAdmin!
    .from('site_acceptance_test_checkins')
    .insert({
      test_key: ATTENDANCE_ACCEPTANCE_TEST.key,
      participant_profile_id: loaded.eligibility.profile.id,
      participant_role: role,
      checked_in_at: now.toISOString(),
    })
    .select('checked_in_at')
    .single()
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: '你已經完成本次網站驗收測試簽到。' }, { headers })
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers })
  }
  return NextResponse.json({
    message: role === 'coach' ? '教練測試簽到完成。' : '學員測試簽到完成。',
    checkedInAt: data.checked_in_at,
  }, { headers })
}
