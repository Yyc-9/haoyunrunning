import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
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

function normalizeLastFive(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 5 ? digits.slice(-5) : ''
}

function normalizeDeclaredAmount(value: string) {
  const amount = Number(value.replace(/[^\d]/g, ''))
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as GoogleFormWebhookBody
  const courseSlug = cleanText(body.courseSlug, 120)
  const responseId = cleanText(body.responseId, 300)
  const [currentSeason, managedCourses] = await Promise.all([
    getCurrentCourseSeason(),
    getManagedCourses({ includeInactive: true }),
  ])
  const course = managedCourses.find((item) => item.slug === courseSlug)
  const offeringId = currentSeason?.courseOfferingIds[courseSlug] ?? ''
  if (!course || !responseId || !currentSeason || !offeringId) {
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

  const transferLastFive = normalizeLastFive(findAnswer(responses, [
    /後五碼/i,
    /后五码/i,
    /末五碼/i,
    /末五码/i,
  ]))
  const declaredAmount = normalizeDeclaredAmount(findAnswer(responses, [
    /匯款.*金額/i,
    /汇款.*金额/i,
    /付款.*金額/i,
    /付款.*金额/i,
    /申報.*金額/i,
    /申报.*金额/i,
    /總金額/i,
    /总金额/i,
  ]))
  const readyForReconciliation = Boolean(transferLastFive && declaredAmount)
  const submittedAt = cleanText(body.submittedAt, 80)
  const formSubmittedAt = submittedAt && !Number.isNaN(Date.parse(submittedAt))
    ? new Date(submittedAt).toISOString()
    : new Date().toISOString()
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
    .select('id, status, payload')
    .eq('season_id', currentSeason.id)
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
    if (activeLead.status === 'pending_transfer' && readyForReconciliation) {
      const { data: updatedLead, error: updateError } = await supabaseAdmin
        .from('signup_leads')
        .update({
          calculated_amount: declaredAmount,
          amount_text: `NT$ ${declaredAmount.toLocaleString('en-US')}`,
          transfer_last_five: transferLastFive,
          payment_submitted_at: formSubmittedAt,
          status: 'pending_review',
          external_submission_id: externalSubmissionId,
          payload: {
            ...(activeLead.payload && typeof activeLead.payload === 'object' ? activeLead.payload : {}),
            provider: 'google_forms',
            responseId,
            formTitle: cleanText(body.formTitle, 300),
            submittedAt: formSubmittedAt,
            responses,
          },
        })
        .eq('id', activeLead.id)
        .select('id, status, course_slug, created_at')
        .single()
      if (updateError || !updatedLead) {
        return NextResponse.json({ error: updateError?.message || '更新付款資料失敗。' }, { status: 500 })
      }
      return NextResponse.json({ lead: updatedLead, duplicate: false })
    }
    return NextResponse.json({ lead: activeLead, duplicate: true })
  }

  const name = findAnswer(responses, [/^姓名/i, /中文姓名/i, /真實姓名/i, /真实姓名/i, /報名.*姓名/i]) || email.split('@')[0]
  const phone = findAnswer(responses, [/手機/i, /电话/i, /電話/i, /mobile/i, /phone/i])
  const runningExperience = findAnswer(responses, [/跑步.*經驗/i, /跑步.*经验/i, /跑齡/i, /跑龄/i, /目前.*跑量/i, /最佳.*成績/i])
  const goal = findAnswer(responses, [/訓練.*目標/i, /训练.*目标/i, /參加.*原因/i, /希望.*改善/i, /^目標/i])

  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .insert({
      source: 'course_payment',
      name,
      phone,
      email,
      preferred_course: course.name,
      course_slug: courseSlug,
      season_id: currentSeason.id,
      course_season_course_id: offeringId,
      course_capacity: currentSeason.courseCapacities[courseSlug],
      running_experience: runningExperience,
      goal,
      calculated_amount: declaredAmount || null,
      amount_text: declaredAmount ? `NT$ ${declaredAmount.toLocaleString('en-US')}` : course.feeNote || '尚未申報金額',
      transfer_last_five: transferLastFive,
      payment_submitted_at: readyForReconciliation ? formSubmittedAt : null,
      status: readyForReconciliation ? 'pending_review' : 'pending_transfer',
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
