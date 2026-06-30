import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { canAccessTrainingContent, getStudentAccessState } from '@/lib/student-access'
import { getTodayInfo } from '@/lib/week-dates'

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '請先登入學員帳號。' }, { status: 401 })
  }

  const accessState = await getStudentAccessState(user.id, user.email)
  if (!canAccessTrainingContent(accessState)) {
    return NextResponse.json({
      plans: [],
      count: 0,
      weekStart: getTodayInfo().weekStart,
      accessState,
      message: '你的報名資料正在等待人工核對，課表將在核准後開通，請耐心等待。',
    })
  }

  const weekStart = request.nextUrl.searchParams.get('weekStart') ?? getTodayInfo().weekStart
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: '課表周参数格式錯誤。' }, { status: 400 })
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
