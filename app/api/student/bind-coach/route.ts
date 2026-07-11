import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type BindCoachBody = {
  coachId?: string
  email?: string
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(
    request.headers.get('authorization'),
    request.headers.get('user-agent') ?? ''
  )
  if (!user) {
    return NextResponse.json({ error: '請先登入。' }, { status: 401 })
  }

  const { data: studentProfile, error: studentError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 })
  }
  if (!studentProfile || studentProfile.role !== 'student') {
    return NextResponse.json({ error: '只有學員帳號可以在學員看板綁定教練。' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as BindCoachBody
  const coachId = body.coachId?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  if (!coachId && !email) {
    return NextResponse.json({ error: '請選擇教練或填寫教練信箱。' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('profiles')
    .select('id, name, email, role')
    .eq('role', 'coach')

  query = coachId ? query.eq('id', coachId) : query.ilike('email', email)
  const { data: coach, error: coachError } = await query.maybeSingle()

  if (coachError) {
    return NextResponse.json({ error: coachError.message }, { status: 500 })
  }
  if (!coach) {
    return NextResponse.json({ error: '找不到這位教練，請確認信箱是否正確。' }, { status: 404 })
  }
  if (coach.id === user.id) {
    return NextResponse.json({ error: '不能將自己的帳號設定為綁定教練。' }, { status: 400 })
  }

  const { error: deactivateError } = await supabaseAdmin
    .from('coach_students')
    .update({ active: false })
    .eq('student_id', user.id)
    .eq('active', true)

  if (deactivateError) {
    return NextResponse.json({ error: deactivateError.message }, { status: 500 })
  }

  const { error: bindError } = await supabaseAdmin
    .from('coach_students')
    .upsert(
      {
        coach_id: coach.id,
        student_id: user.id,
        active: true,
      },
      { onConflict: 'coach_id,student_id' }
    )

  if (bindError) {
    return NextResponse.json({ error: bindError.message }, { status: 500 })
  }

  return NextResponse.json({
    coach: {
      id: coach.id,
      name: coach.name || coach.email || '好運教練',
      email: coach.email,
    },
    message: '教練綁定完成。',
  })
}
