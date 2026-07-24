import { NextRequest, NextResponse } from 'next/server'
import { sendEnrollmentApprovedEmail } from '@/lib/email'
import { getDefaultCourseCoachKeys } from '@/lib/coach-profiles'
import { getCourseSeasons } from '@/lib/course-seasons-server'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { isPaymentOrderStatus } from '@/lib/payment'
import { transitionRemittanceStatus } from '@/lib/payment-workflow'
import { createCourseOrderAccessToken, verifyCourseOrderAccessToken } from '@/lib/order-access'
import { getIsolatedTestAccount, updateIsolatedTestState } from '@/lib/test-account'

type SignupLeadBody = {
  source?: string
  name?: string
  phone?: string
  email?: string
  instagram?: string
  preferredCourse?: string
  runningExperience?: string
  goal?: string
  companionCount?: string
  amountText?: string
  transferLastFive?: string
  intent?: string
  leadId?: string
  accessToken?: string
  notes?: string
}

const allowedSources = new Set(['anniversary_4th', 'group_class', 'course_payment'])

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function payloadText(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''
  return cleanText((payload as Record<string, unknown>)[key])
}

function safeCoachLead(row: Record<string, unknown>) {
  return {
    id: cleanText(row.id),
    source: cleanText(row.source),
    name: cleanText(row.name),
    phone: cleanText(row.phone),
    email: cleanText(row.email),
    instagram: cleanText(row.instagram),
    preferred_course: cleanText(row.preferred_course),
    running_experience: cleanText(row.running_experience),
    goal: cleanText(row.goal),
    companion_count: cleanText(row.companion_count),
    notes: cleanText(row.notes),
    status: cleanText(row.status),
    created_at: cleanText(row.created_at),
    emergency_contact_name: payloadText(row.payload, 'emergencyContactName'),
    emergency_contact_phone: payloadText(row.payload, 'emergencyContactPhone'),
  }
}

function containsSensitiveLongNumber(value: string) {
  return /\d{10,}/.test(value.replace(/\s+/g, ''))
}

async function getAuthorizedProfile(request: NextRequest) {
  if (!supabaseAdmin) {
    return { error: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 }) }
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return { error: NextResponse.json({ error: '請先登入教練或管理員帳號。' }, { status: 401 }) }
  }

  const testAccount = await getIsolatedTestAccount(user)
  if (testAccount) {
    if (testAccount.currentMode !== 'coach') return { error: NextResponse.json({ error: '請先切換至教練測試模式。' }, { status: 403 }) }
    return { profile: { id: user.id, role: 'coach' }, testAccount }
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
  }

  if (!['coach', 'admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: '目前帳號尚未取得教練或管理員權限。' }, { status: 403 }) }
  }

  return { profile }
}

async function getCoachCourseAccess(profileId: string) {
  const [{ data: publicProfile, error: profileError }, seasons] = await Promise.all([
    supabaseAdmin!
      .from('coach_public_profiles')
      .select('coach_key')
      .eq('owner_profile_id', profileId)
      .maybeSingle(),
    getCourseSeasons({ includeRegistrationStats: false }),
  ])
  if (profileError) throw new Error(profileError.message)

  const offeringIds = new Set<string>()
  const seasonCourseKeys = new Set<string>()
  for (const season of seasons.filter((item) => item.isCurrent || ['enrolling', 'active'].includes(item.status))) {
    for (const course of applyCourseOverrides(season.courseOverrides)) {
      const coachKeys = season.courseOverrides[course.slug]?.coachKeys ?? getDefaultCourseCoachKeys(course.slug)
      if (!publicProfile?.coach_key || !coachKeys.includes(publicProfile.coach_key)) continue
      const offeringId = season.courseOfferingIds[course.slug]
      if (offeringId) offeringIds.add(offeringId)
      seasonCourseKeys.add(`${season.id}:${course.slug}`)
    }
  }
  return { offeringIds, seasonCourseKeys }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthorizedProfile(request)
  if (auth.error) return auth.error

  const testAccount = 'testAccount' in auth ? auth.testAccount : undefined
  if (testAccount) {
    const saved = Array.isArray(testAccount.sandboxState.signupLeads) ? testAccount.sandboxState.signupLeads : null
    const leads = saved ?? [{
      id: 'test-signup-1', source: 'group_class', name: '測試報名者', phone: '0900-000-000', email: 'signup@invalid.test', instagram: 'test.runner',
      preferred_course: '週一測試班', running_experience: '測試資料', goal: '驗證教練端報名流程', companion_count: '0', notes: '獨立沙盒資料',
      status: 'pending_transfer', created_at: new Date().toISOString(), emergency_contact_name: '測試聯絡人', emergency_contact_phone: '0900-000-001',
    }]
    return NextResponse.json({ leads, isolatedTest: true })
  }

  const { searchParams } = new URL(request.url)
  const source = cleanText(searchParams.get('source'))
  const status = cleanText(searchParams.get('status'))

  let query = supabaseAdmin!
    .from('signup_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  if (source && allowedSources.has(source)) {
    query = query.eq('source', source)
  }

  if (status && isPaymentOrderStatus(status)) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let visibleRows = (data ?? []) as Array<Record<string, unknown>>
  if (auth.profile.role === 'coach') {
    try {
      const access = await getCoachCourseAccess(auth.profile.id)
      visibleRows = visibleRows.filter((row) => {
        if (row.source !== 'course_payment') return true
        const offeringId = cleanText(row.course_season_course_id)
        const seasonCourseKey = `${cleanText(row.season_id)}:${cleanText(row.course_slug)}`
        return access.offeringIds.has(offeringId) || access.seasonCourseKeys.has(seasonCourseKey)
      })
    } catch (accessError) {
      return NextResponse.json({ error: accessError instanceof Error ? accessError.message : '讀取教練課程權限失敗。' }, { status: 500 })
    }
  }

  return NextResponse.json({ leads: visibleRows.map(safeCoachLead) })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定，暫時無法收集資料。' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as SignupLeadBody
  const source = cleanText(body.source)
  const name = cleanText(body.name)
  const phone = cleanText(body.phone)
  const email = cleanText(body.email)
  const instagram = cleanText(body.instagram)
  const preferredCourse = cleanText(body.preferredCourse)
  const runningExperience = cleanText(body.runningExperience)
  const goal = cleanText(body.goal)
  const companionCount = cleanText(body.companionCount)
  const amountText = cleanText(body.amountText)
  const transferLastFive = cleanText(body.transferLastFive)
  const intent = cleanText(body.intent)
  const notes = cleanText(body.notes)
  const isCoursePayment = source === 'course_payment'
  const isConfirmTransfer = isCoursePayment && intent === 'confirm_transfer'

  if (!allowedSources.has(source)) {
    return NextResponse.json({ error: '報名來源無效。' }, { status: 400 })
  }

  if (!name) {
    return NextResponse.json({ error: '請填寫姓名。' }, { status: 400 })
  }

  if (isCoursePayment && !email) {
    return NextResponse.json({ error: '請填寫信箱。' }, { status: 400 })
  }

  if (isCoursePayment && !preferredCourse) {
    return NextResponse.json({ error: '請選擇報名課程。' }, { status: 400 })
  }

  if (isCoursePayment && !amountText) {
    return NextResponse.json({ error: '請填寫匯款金額。' }, { status: 400 })
  }

  if (isCoursePayment && !isConfirmTransfer && !/^\d{5}$/.test(transferLastFive)) {
    return NextResponse.json({ error: '銀行帳號後五碼必須是 5 位數字。' }, { status: 400 })
  }

  if (isCoursePayment && containsSensitiveLongNumber(notes)) {
    return NextResponse.json(
      { error: '請不要填寫完整銀行卡號、身分證號或信用卡資料；這裡只需要銀行帳號後五碼。' },
      { status: 400 }
    )
  }

  if (isCoursePayment && !isConfirmTransfer) {
    return NextResponse.json({ error: '請先建立課程報名記錄，再更新同一筆匯款資料。' }, { status: 400 })
  }

  if (source !== 'course_payment' && !phone && !email && !instagram) {
    return NextResponse.json({ error: '請至少填寫一種聯絡方式。' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .insert({
      source,
      name,
      phone,
      email,
      instagram,
      preferred_course: preferredCourse,
      running_experience: runningExperience,
      goal,
      companion_count: companionCount,
      amount_text: amountText,
      notes,
      status: isCoursePayment && !isConfirmTransfer ? 'pending_review' : 'pending_transfer',
      transfer_last_five: transferLastFive,
      payment_submitted_at: isCoursePayment && !isConfirmTransfer ? new Date().toISOString() : null,
      payload: {
        source,
        name,
        phone,
        email,
        instagram,
        preferredCourse,
        runningExperience,
        goal,
        companionCount,
        amountText,
        transferLastFive,
        intent,
        notes,
      },
    })
    .select('id, source, status, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || '報名資料提交失敗。' }, { status: 500 })
  }

  const accessToken = isCoursePayment ? createCourseOrderAccessToken(data.id) : ''
  if (isCoursePayment && !accessToken) {
    return NextResponse.json({ error: '課程報名記錄已建立，但安全憑證產生失敗，請聯絡客服。' }, { status: 500 })
  }

  return NextResponse.json({ lead: { ...data, ...(accessToken ? { accessToken } : {}) } })
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as SignupLeadBody & {
    id?: string
    status?: string
    reviewNote?: string
  }

  if (cleanText(body.intent) === 'submit_transfer') {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
    }

    const leadId = cleanText(body.leadId)
    const accessToken = cleanText(body.accessToken)
    const transferLastFive = cleanText(body.transferLastFive)
    const notes = cleanText(body.notes)

    if (!leadId || !verifyCourseOrderAccessToken(leadId, accessToken)) {
      return NextResponse.json({ error: '課程報名安全憑證無效，請重新建立報名記錄。' }, { status: 403 })
    }

    if (!/^\d{5}$/.test(transferLastFive)) {
      return NextResponse.json({ error: '銀行帳號後五碼必須是 5 位數字。' }, { status: 400 })
    }

    if (containsSensitiveLongNumber(notes)) {
      return NextResponse.json(
        { error: '請不要填寫完整銀行卡號、身分證號或信用卡資料；這裡只需要銀行帳號後五碼。' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('signup_leads')
      .update({
        transfer_last_five: transferLastFive,
        notes,
        status: transitionRemittanceStatus('pending_transfer', 'report_transfer'),
        payment_submitted_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .eq('source', 'course_payment')
      .in('status', ['pending_transfer', 'pending_review'])
      .select('id, source, status, transfer_last_five, payment_submitted_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || '匯款資料更新失敗。' }, { status: 500 })
    }

    return NextResponse.json({ lead: data })
  }

  const auth = await getAuthorizedProfile(request)
  if (auth.error) return auth.error

  const id = cleanText(body.id)
  const status = cleanText(body.status)
  const notes = cleanText(body.notes)
  const reviewNote = cleanText(body.reviewNote)

  if (!id) {
    return NextResponse.json({ error: '缺少報名資料 ID。' }, { status: 400 })
  }

  if (!isPaymentOrderStatus(status)) {
    return NextResponse.json({ error: '狀態無效。' }, { status: 400 })
  }

  const testAccount = 'testAccount' in auth ? auth.testAccount : undefined
  if (testAccount) {
    const current = Array.isArray(testAccount.sandboxState.signupLeads)
      ? testAccount.sandboxState.signupLeads as Array<Record<string, unknown>>
      : [{
          id: 'test-signup-1', source: 'group_class', name: '測試報名者', phone: '0900-000-000', email: 'signup@invalid.test', instagram: 'test.runner',
          preferred_course: '週一測試班', running_experience: '測試資料', goal: '驗證教練端報名流程', companion_count: '0', notes: '獨立沙盒資料',
          status: 'pending_transfer', created_at: new Date().toISOString(), emergency_contact_name: '測試聯絡人', emergency_contact_phone: '0900-000-001',
        }]
    const existing = current.find((lead) => lead.id === id)
    if (!existing) return NextResponse.json({ error: '找不到測試報名資料。' }, { status: 404 })
    const updated = { ...existing, status, ...(typeof body.notes === 'string' ? { notes } : {}) }
    await updateIsolatedTestState(testAccount, (state) => ({ ...state, signupLeads: current.map((lead) => lead.id === id ? updated : lead) }))
    return NextResponse.json({ lead: updated, emailMessage: '', isolatedTest: true })
  }

  const { data: existingLead, error: existingLeadError } = await supabaseAdmin!
    .from('signup_leads')
    .select('id, source')
    .eq('id', id)
    .single()
  if (existingLeadError || !existingLead) {
    return NextResponse.json({ error: existingLeadError?.message || '找不到報名資料。' }, { status: 404 })
  }
  if (existingLead.source === 'course_payment' && auth.profile.role !== 'admin') {
    return NextResponse.json({ error: '課程匯款只能由管理員在管理後台核對。' }, { status: 403 })
  }
  if (existingLead.source === 'course_payment' && status === 'approved') {
    return NextResponse.json({ error: '課程匯款必須由銀行對帳確認，不能直接改為已確認入帳。' }, { status: 409 })
  }

  const updatePayload: { status: string; notes?: string; reviewed_at?: string; review_note?: string } = { status }
  if (typeof body.notes === 'string') {
    updatePayload.notes = notes
  }
  if (status === 'approved' || status === 'rejected') {
    updatePayload.reviewed_at = new Date().toISOString()
    updatePayload.review_note = reviewNote
  }

  const reviewResult = status === 'approved' && existingLead.source === 'course_payment'
    ? await supabaseAdmin!.rpc('approve_course_enrollment', {
        p_lead_id: id,
        p_review_note: reviewNote,
      })
    : await supabaseAdmin!
        .from('signup_leads')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single()

  const data = reviewResult.data as Record<string, string> | null
  const error = reviewResult.error

  if (error || !data) {
    const capacityReached = /course capacity reached/i.test(error?.message ?? '')
    return NextResponse.json(
      { error: capacityReached ? '這個班級已達目前設定的名額上限，不能再確認新的匯款。' : error?.message || '報名資料更新失敗。' },
      { status: capacityReached ? 409 : 500 }
    )
  }

  let emailMessage = ''
  if (status === 'approved' && data.source === 'course_payment' && data.email) {
    const emailResult = await sendEnrollmentApprovedEmail({
      to: data.email,
      studentName: data.name,
      courseName: data.preferred_course,
    })
    emailMessage = emailResult.message
  }

  return NextResponse.json({ lead: safeCoachLead(data), emailMessage })
}
