import { NextRequest, NextResponse } from 'next/server'
import { COURSE_CAPACITY } from '@/lib/course-registration'
import { allCourses } from '@/lib/goodluck-data'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

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
  const course = allCourses.find((item) => item.slug === courseSlug)
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
    return NextResponse.json({ availability, enrollment: null })
  }

  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .select('id, course_slug, preferred_course, status, amount_text, transfer_last_five, review_note, created_at, payment_submitted_at')
    .eq('source', 'course_payment')
    .eq('course_slug', courseSlug)
    .eq('email', user.email.trim().toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ availability, enrollment: data ? enrollmentPayload(data) : null })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) {
    return NextResponse.json({ error: '請先使用與 Google 表單相同的信箱登入。' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    intent?: string
    courseSlug?: string
  }
  const intent = cleanText(body.intent, 80)
  const courseSlug = cleanText(body.courseSlug, 120)
  const course = allCourses.find((item) => item.slug === courseSlug)

  if (intent !== 'confirm_form_submission' || !course) {
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
    .select('name, phone')
    .eq('id', user.id)
    .maybeSingle()

  const formSubmittedAt = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .insert({
      source: 'course_payment',
      name:
        cleanText(profile?.name, 200) ||
        cleanText(user.user_metadata?.name, 200) ||
        email.split('@')[0],
      phone: cleanText(profile?.phone, 80),
      email,
      preferred_course: course.name,
      course_slug: course.slug,
      amount_text: course.feeNote || '依 Google 表單所示金額',
      status: 'pending_transfer',
      form_submitted_at: formSubmittedAt,
      payload: {
        provider: 'google_form_return_link',
        confirmationMethod: 'authenticated_return_link',
        formSubmissionVerified: false,
      },
    })
    .select('id, course_slug, preferred_course, status, amount_text, transfer_last_five, review_note, created_at, payment_submitted_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || '建立待付款記錄失敗。' }, { status: 500 })
  }

  return NextResponse.json({ enrollment: enrollmentPayload(data) }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) {
    return NextResponse.json({ error: '請先使用與 Google 表單相同的信箱登入。' }, { status: 401 })
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
