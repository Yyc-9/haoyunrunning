import { NextRequest, NextResponse } from 'next/server'
import { COURSE_CAPACITY } from '@/lib/course-registration'
import {
  invoiceDeliveryOptions,
  registrationAmounts,
  type DirectCourseRegistration,
} from '@/lib/course-registration-form'
import { getManagedCourses } from '@/lib/managed-courses-server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

async function getLegacyStudent(email: string) {
  const { data, error } = await supabaseAdmin!
    .from('legacy_students')
    .select('name')
    .eq('email', email)
    .maybeSingle()

  return { data, error }
}

function cleanText(value: unknown, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function containsSensitiveLongNumber(value: string) {
  return /\d{10,}/.test(value.replace(/\s+/g, ''))
}

function enrollmentPayload(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    courseSlug: String(row.course_slug ?? ''),
    courseName: String(row.preferred_course ?? ''),
    status: String(row.status ?? 'pending_transfer'),
    amountText: String(row.amount_text ?? ''),
    transferLastFive: String(row.transfer_last_five ?? ''),
    reviewNote: String(row.review_note ?? ''),
    createdAt: String(row.created_at ?? ''),
    paymentSubmittedAt: row.payment_submitted_at ? String(row.payment_submitted_at) : null,
  }
}

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const courseSlug = cleanText(searchParams.get('courseSlug'), 120)
  const course = (await getManagedCourses()).find((item) => item.slug === courseSlug)
  if (!course) {
    return NextResponse.json({ error: '找不到這個課程。' }, { status: 404 })
  }

  const [paidResult, pendingReviewResult] = await Promise.all([
    supabaseAdmin
      .from('signup_leads')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'course_payment')
      .eq('course_slug', courseSlug)
      .eq('status', 'approved'),
    supabaseAdmin
      .from('signup_leads')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'course_payment')
      .eq('course_slug', courseSlug)
      .eq('status', 'pending_review'),
  ])

  if (paidResult.error || pendingReviewResult.error) {
    return NextResponse.json({ error: paidResult.error?.message || pendingReviewResult.error?.message }, { status: 500 })
  }

  const paidCount = paidResult.count ?? 0
  const availability = {
    courseSlug,
    capacity: COURSE_CAPACITY,
    paidCount,
    pendingReviewCount: pendingReviewResult.count ?? 0,
    remaining: Math.max(0, COURSE_CAPACITY - paidCount),
    full: paidCount >= COURSE_CAPACITY,
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) {
    return NextResponse.json({ availability, enrollment: null, legacyStudent: null })
  }

  const email = user.email.trim().toLowerCase()
  const [enrollmentResult, legacyResult] = await Promise.all([
    supabaseAdmin
      .from('signup_leads')
      .select('id, course_slug, preferred_course, status, amount_text, transfer_last_five, review_note, created_at, payment_submitted_at')
      .eq('source', 'course_payment')
      .eq('course_slug', courseSlug)
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getLegacyStudent(email),
  ])

  if (enrollmentResult.error || legacyResult.error) {
    return NextResponse.json({ error: enrollmentResult.error?.message || legacyResult.error?.message }, { status: 500 })
  }

  return NextResponse.json({
    availability,
    enrollment: enrollmentResult.data ? enrollmentPayload(enrollmentResult.data) : null,
    legacyStudent: {
      matched: Boolean(legacyResult.data),
      name: cleanText(legacyResult.data?.name, 200),
    },
  })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) {
    return NextResponse.json({ error: '請先登入後再提交課程報名。' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    intent?: string
    courseSlug?: string
    registration?: Partial<DirectCourseRegistration>
  }
  const intent = cleanText(body.intent, 80)
  const courseSlug = cleanText(body.courseSlug, 120)
  const course = (await getManagedCourses()).find((item) => item.slug === courseSlug)

  if (intent !== 'direct_site_registration' || !course) {
    return NextResponse.json({ error: '無法確認這筆課程報名。' }, { status: 400 })
  }

  const email = user.email.trim().toLowerCase()
  const { data: activeLead, error: activeLeadError } = await supabaseAdmin
    .from('signup_leads')
    .select('id, course_slug, preferred_course, status, amount_text, transfer_last_five, review_note, created_at, payment_submitted_at')
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
    return NextResponse.json({ enrollment: enrollmentPayload(activeLead), duplicate: true })
  }

  const { count: paidCount, error: paidCountError } = await supabaseAdmin
    .from('signup_leads')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'course_payment')
    .eq('course_slug', courseSlug)
    .eq('status', 'approved')

  if (paidCountError) {
    return NextResponse.json({ error: paidCountError.message }, { status: 500 })
  }
  if ((paidCount ?? 0) >= COURSE_CAPACITY) {
    return NextResponse.json({ error: '本班目前已額滿，暫時無法建立新的付款記錄。' }, { status: 409 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .maybeSingle()

  const formSubmittedAt = new Date().toISOString()

  if (intent === 'direct_site_registration') {
    const registration = body.registration ?? {}
    const legacyResult = await getLegacyStudent(email)
    if (legacyResult.error) {
      return NextResponse.json({ error: legacyResult.error.message }, { status: 500 })
    }
    const studentType = legacyResult.data ? 'returning' : 'new'
    const studentName = cleanText(registration.studentName, 200) || cleanText(legacyResult.data?.name, 200)
    const phone = cleanText(registration.phone, 80)
    const lineId = cleanText(registration.lineId, 120)
    const emergencyContactName = cleanText(registration.emergencyContactName, 200)
    const emergencyContactPhone = cleanText(registration.emergencyContactPhone, 80)
    const referrer = cleanText(registration.referrer, 200)
    const recentChallenge = cleanText(registration.recentChallenge, 1500)
    const recentGoal = cleanText(registration.recentGoal, 1500)
    const injuryHistory = cleanText(registration.injuryHistory, 1500)
    const runningStatus = cleanText(registration.runningStatus, 1500)
    const amount = cleanText(registration.amount, 100)
    const transferLastFive = cleanText(registration.transferLastFive, 5)
    const invoiceDelivery = cleanText(registration.invoiceDelivery, 120)
    const invoiceDetail = cleanText(registration.invoiceDetail, 320)
    const notes = cleanText(registration.notes, 1000)
    const taxInvoiceInfo = cleanText(registration.taxInvoiceInfo, 300)

    if (!studentType || !studentName || !emergencyContactName || !emergencyContactPhone) {
      return NextResponse.json({ error: '請完成學員與緊急聯絡人資料。' }, { status: 400 })
    }
    if (
      studentType === 'new' &&
      (!phone || !lineId || !recentChallenge || !recentGoal || !injuryHistory || !runningStatus)
    ) {
      return NextResponse.json({ error: '請完成所有新生必填資料。' }, { status: 400 })
    }
    const expectedAmount = studentType === 'returning' ? registrationAmounts[0] : registrationAmounts[1]
    const insertAmount = registrationAmounts[2]
    if (amount !== expectedAmount && amount !== insertAmount) {
      return NextResponse.json({ error: '請選擇正確的匯款金額。' }, { status: 400 })
    }
    if (!/^\d{5}$/.test(transferLastFive)) {
      return NextResponse.json({ error: '請填寫正確的匯款帳號後五碼。' }, { status: 400 })
    }
    if (!invoiceDeliveryOptions.includes(invoiceDelivery as (typeof invoiceDeliveryOptions)[number]) || !invoiceDetail) {
      return NextResponse.json({ error: '請完成電子發票資料。' }, { status: 400 })
    }
    if (!registration.coachSubstituteConsent || !registration.rulesConsent || !registration.finalConsent) {
      return NextResponse.json({ error: '請閱讀並同意課程規範後再送出。' }, { status: 400 })
    }
    if (containsSensitiveLongNumber(notes)) {
      return NextResponse.json({ error: '備註中請勿填寫完整帳號、信用卡號或身分證號。' }, { status: 400 })
    }

    const runningExperience = [
      recentChallenge ? `近期挑戰：${recentChallenge}` : '',
      runningStatus ? `跑步近況：${runningStatus}` : '',
      injuryHistory ? `病史或運動傷害：${injuryHistory}` : '',
    ].filter(Boolean).join('\n')

    const { data, error } = await supabaseAdmin
      .from('signup_leads')
      .insert({
        source: 'course_payment',
        name: studentName,
        phone: phone || cleanText(profile?.phone, 80),
        email,
        preferred_course: course.name,
        course_slug: course.slug,
        running_experience: runningExperience,
        goal: recentGoal,
        amount_text: amount,
        notes,
        transfer_last_five: transferLastFive,
        status: 'pending_review',
        form_submitted_at: formSubmittedAt,
        payment_submitted_at: formSubmittedAt,
        payload: {
          provider: 'website_direct_form',
          studentType,
          legacyStudentMatched: Boolean(legacyResult.data),
          lineId,
          emergencyContactName,
          emergencyContactPhone,
          referrer,
          recentChallenge,
          recentGoal,
          injuryHistory,
          runningStatus,
          invoiceDelivery,
          invoiceDetail,
          taxInvoiceInfo,
          agreements: {
            coachSubstituteConsent: true,
            rulesConsent: true,
            finalConsent: true,
          },
        },
      })
      .select('id, course_slug, preferred_course, status, amount_text, transfer_last_five, review_note, created_at, payment_submitted_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || '建立網站報名記錄失敗。' }, { status: 500 })
    }

    return NextResponse.json({ enrollment: enrollmentPayload(data) }, { status: 201 })
  }

  return NextResponse.json({ error: '請使用網站課程報名表。' }, { status: 400 })
}

export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) {
    return NextResponse.json({ error: '請先登入後再提交付款資料。' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    leadId?: string
    transferLastFive?: string
    notes?: string
  }
  const leadId = cleanText(body.leadId, 80)
  const transferLastFive = cleanText(body.transferLastFive, 5)
  const notes = cleanText(body.notes, 1000)

  if (!leadId || !/^\d{5}$/.test(transferLastFive)) {
    return NextResponse.json({ error: '請填寫正確的銀行帳號後五碼。' }, { status: 400 })
  }
  if (containsSensitiveLongNumber(notes)) {
    return NextResponse.json({ error: '備註中請勿填寫完整帳號、信用卡號或身分證號。' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .update({
      transfer_last_five: transferLastFive,
      notes,
      status: 'pending_review',
      payment_submitted_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('source', 'course_payment')
    .eq('email', user.email.trim().toLowerCase())
    .in('status', ['pending_transfer', 'pending_review', 'rejected'])
    .select('id, course_slug, preferred_course, status, amount_text, transfer_last_five, review_note, created_at, payment_submitted_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '找不到可更新的報名記錄，或這筆報名不屬於目前帳號。' }, { status: 404 })
  }

  return NextResponse.json({ enrollment: enrollmentPayload(data) })
}
