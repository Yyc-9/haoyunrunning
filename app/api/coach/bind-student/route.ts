import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type BindStudentBody = {
  email?: string
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '請先登入教練帳號。' }, { status: 401 })
  }

  const { data: coachProfile, error: coachError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (coachError) {
    return NextResponse.json({ error: coachError.message }, { status: 500 })
  }

  if (!['coach', 'admin'].includes(coachProfile.role)) {
    return NextResponse.json({ error: '目前帳號尚未取得教練權限。' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as BindStudentBody
  const email = body.email?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: '請輸入學員信箱。' }, { status: 400 })
  }

  const { data: student, error: studentError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email, program, goal, pb')
    .ilike('email', email)
    .maybeSingle()

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 })
  }

  if (!student) {
    return NextResponse.json({ error: '找不到這個學員。請確認對方已註冊。' }, { status: 404 })
  }

  if (student.id === user.id) {
    return NextResponse.json({ error: '不能把自己綁定為學員。' }, { status: 400 })
  }

  const { error: bindError } = await supabaseAdmin
    .from('coach_students')
    .upsert(
      {
        coach_id: user.id,
        student_id: student.id,
        active: true,
      },
      { onConflict: 'coach_id,student_id' }
    )

  if (bindError) {
    return NextResponse.json({ error: bindError.message }, { status: 500 })
  }

  return NextResponse.json({ student })
}
