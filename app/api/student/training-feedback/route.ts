import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { canAccessTrainingContent, getStudentAccessState } from '@/lib/student-access'

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

function accessMessage(state: string) {
  if (state === 'pending_transfer') {
    return '請先完成匯款並回報後五碼；財務確認入帳後將自動開通課表。'
  }
  if (state === 'rejected') {
    return '你的匯款資料需要補充或重新核對，請聯絡好運跑班協助處理。'
  }
  return '你的匯款資料已回報，正在等待財務人工核對；確認入帳後將自動開通課表。'
}

async function getStudent(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return null
  }

  return user
}

async function awardBadge(profileId: string, slug: string, reason: string) {
  if (!supabaseAdmin) return
  const { data: badge } = await supabaseAdmin
    .from('achievement_badges')
    .select('id')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()
  if (!badge) return

  await supabaseAdmin.from('profile_achievements').upsert(
    { profile_id: profileId, badge_id: badge.id, reason },
    { onConflict: 'profile_id,badge_id', ignoreDuplicates: true }
  )
}

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getStudent(request)
  if (!user) {
    return NextResponse.json({ error: '請先登入學員帳號。' }, { status: 401 })
  }

  const accessState = await getStudentAccessState(user.id, user.email)
  if (!canAccessTrainingContent(accessState)) {
    return NextResponse.json({
      feedback: [],
      count: 0,
      accessState,
      message: accessMessage(accessState),
    })
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
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getStudent(request)
  if (!user) {
    return NextResponse.json({ error: '請先登入學員帳號。' }, { status: 401 })
  }

  const accessState = await getStudentAccessState(user.id, user.email)
  if (!canAccessTrainingContent(accessState)) {
    return NextResponse.json(
      { error: accessMessage(accessState), accessState },
      { status: 403 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as FeedbackBody
  const rpe = cleanNumber(body.rpe)

  if (rpe !== null && (rpe < 1 || rpe > 10)) {
    return NextResponse.json({ error: 'RPE 必須在 1 到 10 之間。' }, { status: 400 })
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
      return NextResponse.json({ error: '這份課表不屬於目前學員，不能提交回饋。' }, { status: 403 })
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

  await awardBadge(user.id, 'first-feedback', '完成第一次訓練回報')

  const { data: distances } = await supabaseAdmin
    .from('training_feedback')
    .select('distance_km')
    .eq('student_id', user.id)
  const totalDistance = (distances ?? []).reduce((sum, item) => sum + (Number(item.distance_km) || 0), 0)
  if (totalDistance >= 100) {
    await awardBadge(user.id, 'hundred-km', `累積訓練里程 ${totalDistance.toFixed(1)} 公里`)
  }

  return NextResponse.json({ feedback })
}
