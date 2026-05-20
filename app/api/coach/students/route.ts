import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type CoachStudentRow = {
  id: string
  active: boolean
  created_at: string
  student_id: string
}

export async function GET(request: NextRequest) {
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

  const { data: bindings, error: bindingsError } = await supabaseAdmin
    .from('coach_students')
    .select('id, active, created_at, student_id')
    .eq('coach_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (bindingsError) {
    return NextResponse.json({ error: bindingsError.message }, { status: 500 })
  }

  const rows = (bindings ?? []) as CoachStudentRow[]
  const studentIds = rows.map((row) => row.student_id)

  if (studentIds.length === 0) {
    return NextResponse.json({ students: [] })
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email, program, goal, pb')
    .in('id', studentIds)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const students = rows.map((row) => ({
    id: row.id,
    active: row.active,
    created_at: row.created_at,
    student: profilesById.get(row.student_id) ?? null,
  }))

  return NextResponse.json({ students })
}
