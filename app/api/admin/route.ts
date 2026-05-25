import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type PaymentOrderStatus = 'pending_transfer' | 'pending_review' | 'approved' | 'rejected'

const paymentOrderStatuses = new Set<string>(['pending_transfer', 'pending_review', 'approved', 'rejected'])

type ProfileRow = {
  id: string
  role: 'student' | 'coach' | 'admin'
  name: string
  email: string
  program: string | null
  goal: string | null
  pb: string | null
  created_at: string
}

type CoachStudentRow = {
  id: string
  coach_id: string
  student_id: string
  active: boolean
  created_at: string
}

type SignupLeadRow = {
  id: string
  source: string
  name: string
  email: string
  preferred_course: string
  amount_text: string
  transfer_last_five: string
  status: string
  notes: string
  review_note: string | null
  created_at: string
  payment_submitted_at: string | null
}

type AdminPatchBody =
  | { action?: 'set_coach_role'; userId?: string; enabled?: boolean }
  | { action?: 'review_order'; orderId?: string; status?: PaymentOrderStatus; reviewNote?: string }
  | { action?: 'bind_student'; studentId?: string; coachId?: string }
  | { action?: 'unbind_student'; bindingId?: string }

const noStoreHeaders = {
  'Cache-Control': 'no-store',
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init?.headers ?? {}),
    },
  })
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isPaymentOrderStatus(value: string): value is PaymentOrderStatus {
  return paymentOrderStatuses.has(value)
}

async function sendOptionalEnrollmentEmail(input: { to: string; studentName: string; courseName: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ENROLLMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    console.info('[admin] Enrollment approved email skipped: email env is missing.', {
      to: input.to,
      courseName: input.courseName,
    })
    return '邮件服务尚未配置，已完成核准但未发送邮件。'
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: '好运跑班课表已开通',
      text: `${input.studentName || '同学'}你好：你的 ${input.courseName || '已报名课程'} 报名付款已经核准，课表已开通。`,
    }),
  })

  if (!response.ok) {
    console.warn('[admin] Enrollment approved email failed.', {
      status: response.status,
      detail: await response.text().catch(() => ''),
    })
    return '核准已完成，但邮件发送失败，请稍后检查邮件服务配置。'
  }

  return '核准已完成，并已发送课表开通邮件。'
}

async function requireAdmin(request: NextRequest) {
  if (!supabaseAdmin) {
    return { error: json({ error: 'Supabase 尚未设置。' }, { status: 500 }) }
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return { error: json({ error: '请先登录管理员账号。' }, { status: 401 }) }
  }

  const adminProfile = await getAdminProfile(user)
  if (!adminProfile) {
    return { error: json({ error: '目前账号没有管理员权限。' }, { status: 403 }) }
  }

  return { user, adminProfile }
}

function firstByKey<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const map = new Map<string, T>()
  rows.forEach((row) => {
    const value = row[key]
    if (typeof value === 'string' && value && !map.has(value)) {
      map.set(value, row)
    }
  })
  return map
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const [
    profilesResult,
    bindingsResult,
    ordersResult,
    plansResult,
    feedbackResult,
  ] = await Promise.all([
    supabaseAdmin!
      .from('profiles')
      .select('id, role, name, email, program, goal, pb, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin!
      .from('coach_students')
      .select('id, coach_id, student_id, active, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false }),
    supabaseAdmin!
      .from('signup_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabaseAdmin!
      .from('training_plans')
      .select('student_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabaseAdmin!
      .from('training_feedback')
      .select('student_id, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const firstError = [
    profilesResult.error,
    bindingsResult.error,
    ordersResult.error,
    plansResult.error,
    feedbackResult.error,
  ].find(Boolean)

  if (firstError) {
    return json({ error: firstError.message }, { status: 500 })
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[]
  const bindings = (bindingsResult.data ?? []) as CoachStudentRow[]
  const orders = (ordersResult.data ?? []) as SignupLeadRow[]
  const plans = plansResult.data ?? []
  const feedback = feedbackResult.data ?? []
  const coursePaymentOrders = orders.filter((order) => order.source === 'course_payment')

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const latestOrderByEmail = firstByKey(
    coursePaymentOrders.filter((order) => order.email).map((order) => ({
      ...order,
      email: order.email.trim().toLowerCase(),
    })),
    'email'
  )
  const latestFeedbackByStudent = firstByKey(feedback, 'student_id')
  const studentsWithPlans = new Set(plans.map((plan) => plan.student_id).filter(Boolean))

  const bindingsByStudent = new Map<string, CoachStudentRow[]>()
  const bindingsByCoach = new Map<string, CoachStudentRow[]>()
  bindings.forEach((binding) => {
    bindingsByStudent.set(binding.student_id, [...(bindingsByStudent.get(binding.student_id) ?? []), binding])
    bindingsByCoach.set(binding.coach_id, [...(bindingsByCoach.get(binding.coach_id) ?? []), binding])
  })

  const studentProfiles = profiles.filter((profile) => profile.role === 'student')
  const coachProfiles = profiles

  const students = studentProfiles.map((student) => {
    const normalizedEmail = student.email.trim().toLowerCase()
    const latestOrder = latestOrderByEmail.get(normalizedEmail)
    const studentBindings = bindingsByStudent.get(student.id) ?? []
    const boundCoaches = studentBindings
      .map((binding) => profilesById.get(binding.coach_id))
      .filter(Boolean) as ProfileRow[]

    return {
      id: student.id,
      name: student.name || student.email || '未填写姓名',
      email: student.email,
      program: student.program || latestOrder?.preferred_course || '',
      paymentStatus: latestOrder?.status ?? '暂无订单',
      paymentCourse: latestOrder?.preferred_course ?? '',
      planEnabled: studentsWithPlans.has(student.id) || latestOrder?.status === 'approved',
      lastFeedbackAt: latestFeedbackByStudent.get(student.id)?.created_at ?? null,
      createdAt: student.created_at,
      bindings: studentBindings.map((binding) => ({
        id: binding.id,
        coachId: binding.coach_id,
        coachName: profilesById.get(binding.coach_id)?.name || profilesById.get(binding.coach_id)?.email || '未知教练',
        coachEmail: profilesById.get(binding.coach_id)?.email || '',
      })),
      boundCoachNames: boundCoaches.map((coach) => coach.name || coach.email).join('、'),
    }
  })

  const coaches = coachProfiles.map((coach) => {
    const coachBindings = bindingsByCoach.get(coach.id) ?? []
    const studentPrograms = new Set(
      coachBindings
        .map((binding) => profilesById.get(binding.student_id)?.program)
        .filter(Boolean) as string[]
    )

    return {
      id: coach.id,
      name: coach.name || coach.email || '未填写姓名',
      email: coach.email,
      role: coach.role,
      coachEnabled: coach.role === 'coach' || coach.role === 'admin',
      boundStudentCount: coachBindings.length,
      courses: Array.from(studentPrograms).join('、'),
      createdAt: coach.created_at,
    }
  })

  const dashboardOrders = coursePaymentOrders.map((order) => ({
    id: order.id,
    studentName: order.name,
    email: order.email,
    courseName: order.preferred_course,
    amountText: order.amount_text,
    transferLastFive: order.transfer_last_five,
      status: isPaymentOrderStatus(order.status) ? order.status : 'pending_review',
    submittedAt: order.payment_submitted_at || order.created_at,
    notes: order.notes,
    reviewNote: order.review_note,
  }))

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const overview = {
    studentCount: students.length,
    coachCount: coaches.filter((coach) => coach.role === 'coach').length,
    pendingOrderCount: dashboardOrders.filter((order) => order.status === 'pending_review').length,
    approvedOrderCount: dashboardOrders.filter((order) => order.status === 'approved').length,
    unopenedPlanCount: students.filter((student) => !student.planEnabled).length,
    recentFeedbackCount: feedback.filter((item) => new Date(item.created_at).getTime() >= sevenDaysAgo).length,
  }

  return json({
    admin: auth.adminProfile,
    overview,
    students,
    coaches,
    orders: dashboardOrders,
    coachOptions: coaches
      .filter((coach) => coach.coachEnabled)
      .map((coach) => ({ id: coach.id, name: coach.name, email: coach.email })),
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const body = (await request.json().catch(() => ({}))) as AdminPatchBody

  if (body.action === 'set_coach_role') {
    const userId = cleanText(body.userId)
    const enabled = body.enabled === true

    if (!userId) {
      return json({ error: '缺少用户 ID。' }, { status: 400 })
    }

    const { data: target, error: targetError } = await supabaseAdmin!
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (targetError || !target) {
      return json({ error: targetError?.message || '找不到用户。' }, { status: 404 })
    }

    if (target.role === 'admin') {
      return json({ error: '管理员角色不能在这里被改为普通教练或学员。' }, { status: 400 })
    }

    const { data: profile, error } = await supabaseAdmin!
      .from('profiles')
      .update({ role: enabled ? 'coach' : 'student' })
      .eq('id', userId)
      .select('id, role, name, email')
      .single()

    if (error || !profile) {
      return json({ error: error?.message || '更新教练权限失败。' }, { status: 500 })
    }

    return json({ profile, message: enabled ? '已授予教练权限。' : '已取消教练权限。' })
  }

  if (body.action === 'review_order') {
    const orderId = cleanText(body.orderId)
    const status = cleanText(body.status)
    const reviewNote = cleanText(body.reviewNote)

    if (!orderId) {
      return json({ error: '缺少订单 ID。' }, { status: 400 })
    }

    if (!isPaymentOrderStatus(status) || !['approved', 'rejected'].includes(status)) {
      return json({ error: '订单状态无效。' }, { status: 400 })
    }

    const finalReviewNote = reviewNote || (status === 'approved' ? '付款核对通过，课表已开通。' : '付款核对异常，请补充资料。')
    const { data: order, error } = await supabaseAdmin!
      .from('signup_leads')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        review_note: finalReviewNote,
      })
      .eq('id', orderId)
      .eq('source', 'course_payment')
      .select('*')
      .single()

    if (error || !order) {
      return json({ error: error?.message || '订单更新失败。' }, { status: 500 })
    }

    let emailMessage = ''
    if (status === 'approved' && order.email) {
      emailMessage = await sendOptionalEnrollmentEmail({
        to: order.email,
        studentName: order.name,
        courseName: order.preferred_course,
      })
    }

    return json({ order, message: emailMessage || finalReviewNote })
  }

  if (body.action === 'bind_student') {
    const studentId = cleanText(body.studentId)
    const coachId = cleanText(body.coachId)

    if (!studentId || !coachId) {
      return json({ error: '请选择学员和教练。' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin!
      .from('coach_students')
      .upsert({ student_id: studentId, coach_id: coachId, active: true }, { onConflict: 'coach_id,student_id' })
      .select('*')
      .single()

    if (error || !data) {
      return json({ error: error?.message || '绑定失败。' }, { status: 500 })
    }

    return json({ binding: data, message: '学员与教练已绑定。' })
  }

  if (body.action === 'unbind_student') {
    const bindingId = cleanText(body.bindingId)

    if (!bindingId) {
      return json({ error: '缺少绑定 ID。' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin!
      .from('coach_students')
      .update({ active: false })
      .eq('id', bindingId)
      .select('*')
      .single()

    if (error || !data) {
      return json({ error: error?.message || '解绑失败。' }, { status: 500 })
    }

    return json({ binding: data, message: '绑定关系已取消。' })
  }

  return json({ error: '未知的管理员操作。' }, { status: 400 })
}
