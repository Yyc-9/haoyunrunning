import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type FeedbackBody = {
  training_plan_id?: string | null
  distance_km?: number | null
  duration_text?: string
  pace_text?: string
  average_heart_rate?: number | null
  rpe?: number | null
  feeling?: string
}

function cleanText(value: string | undefined) {
  return value?.trim() ?? ''
}

function cleanNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

async function getStudent(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return null
  }

  return user
}

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未设置。' }, { status: 500 })
  }

  const user = await getStudent(request)
  if (!user) {
    return NextResponse.json({ error: '请先登录学员账号。' }, { status: 401 })
  }

  const { data: feedback, error } = await supabaseAdmin
    .from('training_feedback')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    feedback: feedback ?? [],
    count: feedback?.length ?? 0,
  })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未设置。' }, { status: 500 })
  }

  const user = await getStudent(request)
  if (!user) {
    return NextResponse.json({ error: '请先登录学员账号。' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as FeedbackBody
  const rpe = cleanNumber(body.rpe)

  if (rpe !== null && (rpe < 1 || rpe > 10)) {
    return NextResponse.json({ error: 'RPE 必须在 1 到 10 之间。' }, { status: 400 })
  }

  let coachId: string | null = null
  const trainingPlanId = body.training_plan_id?.trim() || null

  if (trainingPlanId) {
    const { data: plan, error: planError } = await supabaseAdmin
      .from('training_plans')
      .select('id, student_id, coach_id')
      .eq('id', trainingPlanId)
      .maybeSingle()

    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 })
    }

    if (!plan || plan.student_id !== user.id) {
      return NextResponse.json({ error: '这份课表不属于当前学员，不能提交回馈。' }, { status: 403 })
    }

    coachId = plan.coach_id
  }

  const feedbackInput = {
    training_plan_id: trainingPlanId,
    student_id: user.id,
    coach_id: coachId,
    distance_km: cleanNumber(body.distance_km),
    duration_text: cleanText(body.duration_text),
    pace_text: cleanText(body.pace_text),
    average_heart_rate: cleanNumber(body.average_heart_rate),
    rpe,
    feeling: cleanText(body.feeling),
    status: rpe !== null && rpe >= 8 ? 'flagged' : 'new',
  }

  const { data: feedback, error } = await supabaseAdmin
    .from('training_feedback')
    .insert(feedbackInput)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ feedback })
}
