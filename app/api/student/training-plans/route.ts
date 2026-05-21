import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未设置。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '请先登录学员账号。' }, { status: 401 })
  }

  const { data: plans, error } = await supabaseAdmin
    .from('training_plans')
    .select('*')
    .eq('student_id', user.id)
    .order('week_start', { ascending: false })
    .order('workout_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(35)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    plans: plans ?? [],
    count: plans?.length ?? 0,
  })
}
