import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getManagedCourses } from '@/lib/managed-courses-server'
import { supabaseAdmin } from '@/lib/supabase-server'

type GoogleFormWebhookBody = {
  courseSlug?: string
  responseId?: string
  respondentEmail?: string
  submittedAt?: string
  formTitle?: string
  responses?: Record<string, unknown>
}

function cleanText(value: unknown, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

function cleanResponses(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, string>

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 100)
      .map(([key, answer]) => [cleanText(key, 200), cleanText(Array.isArray(answer) ? answer.join('、') : answer, 3000)])
      .filter(([key]) => Boolean(key))
  )
}

function findAnswer(responses: Record<string, string>, patterns: RegExp[]) {
  const match = Object.entries(responses).find(([question]) => patterns.some((pattern) => pattern.test(question)))
  return match?.[1]?.trim() ?? ''
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as GoogleFormWebhookBody
  const courseSlug = cleanText(body.courseSlug, 120)
  const responseId = cleanText(body.responseId, 300)
  const course = (await getManagedCourses({ includeInactive: true })).find((item) => item.slug === courseSlug)
  if (!course || !responseId) {
    return NextResponse.json({ error: '課程或 Google 表單回覆編號無效。' }, { status: 400 })
  }

  const masterSecret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET?.trim() ?? ''
  const expectedSecret = masterSecret ? createHmac('sha256', masterSecret).update(courseSlug).digest('hex') : ''
  const receivedSecret = request.headers.get('x-goodluck-form-secret')?.trim() ?? ''
  if (!expectedSecret || !receivedSecret || !secretsMatch(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: '表單串接憑證無效。' }, { status: 401 })
  }

  const responses = cleanResponses(body.responses)
  const questionEmail = findAnswer(responses, [/電子.*(信箱|郵件)/i, /email/i, /e-mail/i])
  const email = normalizeEmail(cleanText(body.respondentEmail, 320) || questionEmail)
  if (!email) {
    return NextResponse.json({ error: 'Google 表單必須收集電子信箱，才能建立付款狀態。' }, { status: 400 })
  }

  const externalSubmissionId = `${courseSlug}:${responseId}`
  const { data: duplicateByResponse, error: duplicateError } = await supabaseAdmin
    .from('signup_leads')
    .select('id, status')
    .eq('external_submission_id', externalSubmissionId)
    .maybeSingle()

  if (duplicateError) {
    return NextResponse.json({ error: duplicateError.message }, { status: 500 })
  }
  if (duplicateByResponse) {
    return NextResponse.json({ lead: duplicateByResponse, duplicate: true })
  }

  const { data: activeLead, error: activeLeadError } = await supabaseAdmin
    .from('signup_leads')
    .select('id, status')
    .eq('source', 'course_payment')
    .eq('course_slug', courseSlug)
    .eq('email', email)
    .in('status', ['pending_transfer', 'pending_review', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activeLeadError) {
    return NextResponse.json({ error: activeLeadError.message }, { status: 500 })
  }
  if (activeLead) {
    return NextResponse.json({ lead: activeLead, duplicate: true })
  }

  const name = findAnswer(responses, [/^姓名/i, /中文姓名/i, /真實姓名/i, /真实姓名/i, /報名.*姓名/i]) || email.split('@')[0]
  const phone = findAnswer(responses, [/手機/i, /电话/i, /電話/i, /mobile/i, /phone/i])
  const runningExperience = findAnswer(responses, [/跑步.*經驗/i, /跑步.*经验/i, /跑齡/i, /跑龄/i, /目前.*跑量/i, /最佳.*成績/i])
  const goal = findAnswer(responses, [/訓練.*目標/i, /训练.*目标/i, /參加.*原因/i, /希望.*改善/i, /^目標/i])
  const submittedAt = cleanText(body.submittedAt, 80)
  const formSubmittedAt = submittedAt && !Number.isNaN(Date.parse(submittedAt)) ? new Date(submittedAt).toISOString() : new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .insert({
      source: 'course_payment',
      name,
      phone,
      email,
      preferred_course: course.name,
      course_slug: courseSlug,
      running_experience: runningExperience,
      goal,
      amount_text: course.feeNote || '依 Google 表單所示金額',
      status: 'pending_transfer',
      external_submission_id: externalSubmissionId,
      form_submitted_at: formSubmittedAt,
      payload: {
        provider: 'google_forms',
        responseId,
        formTitle: cleanText(body.formTitle, 300),
        submittedAt: formSubmittedAt,
        responses,
      },
    })
    .select('id, status, course_slug, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || '建立報名付款記錄失敗。' }, { status: 500 })
  }

  return NextResponse.json({ lead: data }, { status: 201 })
}
