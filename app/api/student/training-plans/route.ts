import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { canAccessTrainingContent, getStudentAccessState } from '@/lib/student-access'
import { getTodayInfo } from '@/lib/week-dates'
import { getIsolatedTestAccount } from '@/lib/test-account'

function accessMessage(state: string) {
  if (state === 'pending_transfer') {
    return '請先完成匯款並回報後五碼；財務確認入帳後將自動開通課表。'
  }
  if (state === 'rejected') {
    return '你的匯款資料需要補充或重新核對，請聯絡好運跑班協助處理。'
  }
  return '你的匯款資料已回報，正在等待財務人工核對；確認入帳後將自動開通課表。'
}

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '請先登入學員帳號。' }, { status: 401 })
  }

  const testAccount = await getIsolatedTestAccount(user)
  if (testAccount) {
    if (testAccount.currentMode !== 'student') return NextResponse.json({ error: '請先切換至學員測試模式。' }, { status: 403 })
    const week = request.nextUrl.searchParams.get('weekStart') ?? getTodayInfo().weekStart
    const start = new Date(`${week}T12:00:00+08:00`)
    const plans = [
      { offset: 0, label: '週一', title: '輕鬆跑', target: '完成 5 公里輕鬆跑', pace: '可對話配速' },
      { offset: 2, label: '週三', title: '節奏訓練', target: '熱身後完成 3 × 8 分鐘節奏跑', pace: '穩定可控' },
      { offset: 5, label: '週六', title: '長距離', target: '完成 12 公里有氧耐力跑', pace: '輕鬆配速' },
    ].map((item, index) => {
      const date = new Date(start)
      date.setUTCDate(date.getUTCDate() + item.offset)
      return {
        id: `test-plan-${index + 1}`, student_id: user.id, coach_id: 'isolated-test-coach', week_number: 1,
        week_start: week, workout_date: date.toISOString().slice(0, 10), day_label: item.label, title: item.title,
        target: item.target, pace: item.pace, note: '獨立沙盒測試課表', sort_order: index,
      }
    })
    return NextResponse.json({ plans, count: plans.length, weekStart: week, isolatedTest: true })
  }

  const accessState = await getStudentAccessState(user.id, user.email)
  if (!canAccessTrainingContent(accessState)) {
    return NextResponse.json({
      plans: [],
      count: 0,
      weekStart: getTodayInfo().weekStart,
      accessState,
      message: accessMessage(accessState),
    })
  }

  const weekStart = request.nextUrl.searchParams.get('weekStart') ?? getTodayInfo().weekStart
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: '課表周参數格式錯誤。' }, { status: 400 })
  }

  const { data: plans, error } = await supabaseAdmin
    .from('training_plans')
    .select('*')
    .eq('student_id', user.id)
    .eq('week_start', weekStart)
    .order('workout_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(14)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    plans: plans ?? [],
    count: plans?.length ?? 0,
    weekStart,
  })
}
