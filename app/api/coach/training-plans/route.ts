import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type WorkoutInput = {
  workoutDate?: string
  dayLabel?: string
  title?: string
  target?: string
  pace?: string
  note?: string
  sortOrder?: number
}

type SavePlansBody = {
  studentId?: string
  weekNumber?: number
  weekStart?: string
  workouts?: WorkoutInput[]
}

function isIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未设置。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '请先登录教练账号。' }, { status: 401 })
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
    return NextResponse.json({ error: '目前账号尚未取得教练权限。' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as SavePlansBody
  const studentId = body.studentId?.trim()
  const weekNumber = Number(body.weekNumber)
  const weekStart = body.weekStart?.trim()
  const workouts = body.workouts ?? []

  if (!studentId) {
    return NextResponse.json({ error: '请选择要派发课表的学员。' }, { status: 400 })
  }

  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    return NextResponse.json({ error: '请填写有效周数。' }, { status: 400 })
  }

  if (!isIsoDate(weekStart)) {
    return NextResponse.json({ error: '请填写有效的周起始日期。' }, { status: 400 })
  }

  const { data: binding, error: bindingError } = await supabaseAdmin
    .from('coach_students')
    .select('id')
    .eq('coach_id', user.id)
    .eq('student_id', studentId)
    .eq('active', true)
    .maybeSingle()

  if (bindingError) {
    return NextResponse.json({ error: bindingError.message }, { status: 500 })
  }

  if (!binding && coachProfile.role !== 'admin') {
    return NextResponse.json({ error: '只能给已绑定学员派发课表。' }, { status: 403 })
  }

  const cleanedWorkouts = workouts
    .filter((workout) => workout.target?.trim() || workout.title?.trim())
    .map((workout, index) => ({
      student_id: studentId,
      coach_id: user.id,
      week_number: weekNumber,
      week_start: weekStart,
      workout_date: isIsoDate(workout.workoutDate) ? workout.workoutDate : weekStart,
      day_label: workout.dayLabel?.trim() || '训练日',
      title: workout.title?.trim() || '训练课表',
      target: workout.target?.trim() || workout.title?.trim() || '按教练安排完成训练',
      pace: workout.pace?.trim() || '',
      note: workout.note?.trim() || '',
      sort_order: workout.sortOrder ?? index,
    }))

  if (cleanedWorkouts.length === 0) {
    return NextResponse.json({ error: '请至少填写一项训练内容。' }, { status: 400 })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('training_plans')
    .delete()
    .eq('coach_id', user.id)
    .eq('student_id', studentId)
    .eq('week_start', weekStart)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const { data, error: insertError } = await supabaseAdmin
    .from('training_plans')
    .insert(cleanedWorkouts)
    .select('*')

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ plans: data ?? [], count: data?.length ?? 0 })
}
