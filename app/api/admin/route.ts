import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { shopProductFromRow, type ShopProductRow } from '@/lib/shop-products'

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

type ShopOrderRow = {
  id: string
  order_number: string
  customer_name: string
  contact: string
  email: string | null
  fulfillment_note: string | null
  item_count: number
  status: string
  transfer_last_five: string | null
  payment_submitted_at: string | null
  reviewed_at: string | null
  review_note: string | null
  subtotal: number | null
  total_amount: number | null
  payment_reference: string | null
  payment_account_id: string | null
  payment_account_label: string | null
  inventory_reserved: boolean | null
  created_at: string
}

type ShopOrderItemRow = {
  order_id: string
  product_id: string
  name: string
  quantity: number
  price: number
  variant_id: string | null
  size: string | null
}

type PaymentAccountRow = {
  id: string
  label: string
  account_name: string
  bank_name: string
  bank_code: string
  account_number: string
  active: boolean
  weight: number
  last_assigned_at: string | null
  created_at: string
  updated_at: string
}

type AdminPatchBody =
  | { action?: 'set_coach_role'; userId?: string; enabled?: boolean }
  | { action?: 'review_order'; orderId?: string; orderKind?: 'course' | 'shop'; status?: PaymentOrderStatus; reviewNote?: string }
  | { action?: 'bind_student'; studentId?: string; coachId?: string }
  | { action?: 'unbind_student'; bindingId?: string }
  | { action?: 'update_product_stock'; productId?: string; stockQuantity?: number; active?: boolean }
  | { action?: 'create_payment_account'; label?: string; accountName?: string; bankName?: string; bankCode?: string; accountNumber?: string; weight?: number }
  | { action?: 'toggle_payment_account'; accountId?: string; active?: boolean }

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

function isOptionalSchemaError(error: { code?: string; message?: string } | null) {
  if (!error) return false

  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    /schema cache|does not exist|column .* does not exist/i.test(error.message ?? '')
  )
}

function formatAmount(value: number | null | undefined) {
  if (!value) return '待確認'
  return `NT$${(value / 100).toFixed(0)}`
}

async function sendOptionalEnrollmentEmail(input: { to: string; studentName: string; courseName: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ENROLLMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    console.info('[admin] Enrollment approved email skipped: email env is missing.', {
      to: input.to,
      courseName: input.courseName,
    })
    return '郵件服務尚未設定，已完成核准但未發送郵件。'
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
      subject: '好運跑班課表已開通',
      text: `${input.studentName || '同學'}你好：你的 ${input.courseName || '已報名課程'} 報名付款已經核准，課表已開通。`,
    }),
  })

  if (!response.ok) {
    console.warn('[admin] Enrollment approved email failed.', {
      status: response.status,
      detail: await response.text().catch(() => ''),
    })
    return '核准已完成，但郵件發送失敗，請稍後檢查郵件服務設定。'
  }

  return '核准已完成，並已發送課表開通郵件。'
}

async function requireAdmin(request: NextRequest) {
  if (!supabaseAdmin) {
    return { error: json({ error: 'Supabase 尚未設定。' }, { status: 500 }) }
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return { error: json({ error: '請先登入管理員帳號。' }, { status: 401 }) }
  }

  const adminProfile = await getAdminProfile(user)
  if (!adminProfile) {
    return { error: json({ error: '目前帳號沒有管理員權限。' }, { status: 403 }) }
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

async function getProductStock(productId: string) {
  const { data, error } = await supabaseAdmin!
    .from('shop_products')
    .select('stock_quantity')
    .eq('id', productId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || `找不到商品 ${productId}。`)
  }

  return Number(data.stock_quantity ?? 0)
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
    shopProductsResult,
    shopOrdersResult,
    shopOrderItemsResult,
    paymentAccountsResult,
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
    supabaseAdmin!
      .from('shop_products')
      .select('id, name, category, price, price_label, image, rating, reviews, tags, variants, sizes, stock_quantity, active')
      .order('category', { ascending: true })
      .order('name', { ascending: true }),
    supabaseAdmin!
      .from('shop_orders')
      .select('id, order_number, customer_name, contact, email, fulfillment_note, item_count, status, transfer_last_five, payment_submitted_at, reviewed_at, review_note, subtotal, total_amount, payment_reference, payment_account_id, payment_account_label, inventory_reserved, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    supabaseAdmin!
      .from('shop_order_items')
      .select('order_id, product_id, name, quantity, price, variant_id, size')
      .limit(2000),
    supabaseAdmin!
      .from('shop_payment_accounts')
      .select('id, label, account_name, bank_name, bank_code, account_number, active, weight, last_assigned_at, created_at, updated_at')
      .order('created_at', { ascending: false }),
  ])

  const firstError = [
    profilesResult.error,
    bindingsResult.error,
    ordersResult.error,
    plansResult.error,
    feedbackResult.error,
    isOptionalSchemaError(shopProductsResult.error) ? null : shopProductsResult.error,
    isOptionalSchemaError(shopOrdersResult.error) ? null : shopOrdersResult.error,
    isOptionalSchemaError(shopOrderItemsResult.error) ? null : shopOrderItemsResult.error,
    isOptionalSchemaError(paymentAccountsResult.error) ? null : paymentAccountsResult.error,
  ].find(Boolean)

  if (firstError) {
    return json({ error: firstError.message }, { status: 500 })
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[]
  const bindings = (bindingsResult.data ?? []) as CoachStudentRow[]
  const orders = (ordersResult.data ?? []) as SignupLeadRow[]
  const plans = plansResult.data ?? []
  const feedback = feedbackResult.data ?? []
  const shopProducts = shopProductsResult.error ? [] : ((shopProductsResult.data ?? []) as ShopProductRow[]).map(shopProductFromRow)
  const shopOrders = shopOrdersResult.error ? [] : (shopOrdersResult.data ?? []) as ShopOrderRow[]
  const shopOrderItems = shopOrderItemsResult.error ? [] : (shopOrderItemsResult.data ?? []) as ShopOrderItemRow[]
  const paymentAccounts = paymentAccountsResult.error ? [] : (paymentAccountsResult.data ?? []) as PaymentAccountRow[]
  const coursePaymentOrders = orders.filter((order) => order.source === 'course_payment')

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const paymentAccountsById = new Map(paymentAccounts.map((account) => [account.id, account]))
  const shopItemsByOrder = new Map<string, ShopOrderItemRow[]>()
  shopOrderItems.forEach((item) => {
    shopItemsByOrder.set(item.order_id, [...(shopItemsByOrder.get(item.order_id) ?? []), item])
  })
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
      name: student.name || student.email || '未填寫姓名',
      email: student.email,
      program: student.program || latestOrder?.preferred_course || '',
      paymentStatus: latestOrder?.status ?? '暫無訂單',
      paymentCourse: latestOrder?.preferred_course ?? '',
      planEnabled: studentsWithPlans.has(student.id) || latestOrder?.status === 'approved',
      lastFeedbackAt: latestFeedbackByStudent.get(student.id)?.created_at ?? null,
      createdAt: student.created_at,
      bindings: studentBindings.map((binding) => ({
        id: binding.id,
        coachId: binding.coach_id,
        coachName: profilesById.get(binding.coach_id)?.name || profilesById.get(binding.coach_id)?.email || '未知教練',
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
      name: coach.name || coach.email || '未填寫姓名',
      email: coach.email,
      role: coach.role,
      coachEnabled: coach.role === 'coach' || coach.role === 'admin',
      boundStudentCount: coachBindings.length,
      courses: Array.from(studentPrograms).join('、'),
      createdAt: coach.created_at,
    }
  })

  const courseDashboardOrders = coursePaymentOrders.map((order) => ({
    id: order.id,
    orderKind: 'course' as const,
    orderNumber: '',
    studentName: order.name,
    email: order.email,
    courseName: order.preferred_course,
    amountText: order.amount_text,
    transferLastFive: order.transfer_last_five,
    status: isPaymentOrderStatus(order.status) ? order.status : 'pending_review',
    submittedAt: order.payment_submitted_at || order.created_at,
    notes: order.notes,
    reviewNote: order.review_note,
    paymentReference: '',
    paymentChannelLabel: '',
    assignedAccount: '',
    inventoryReserved: false,
    items: [] as string[],
  }))

  const shopDashboardOrders = shopOrders.map((order) => {
    const account = order.payment_account_id ? paymentAccountsById.get(order.payment_account_id) : null
    const orderItems = shopItemsByOrder.get(order.id) ?? []

    return {
      id: order.id,
      orderKind: 'shop' as const,
      orderNumber: order.order_number,
      studentName: order.customer_name,
      email: order.email || '',
      courseName: order.order_number,
      amountText: formatAmount(order.total_amount),
      transferLastFive: order.transfer_last_five || '',
      status: isPaymentOrderStatus(order.status) ? order.status : 'pending_transfer',
      submittedAt: order.payment_submitted_at || order.created_at,
      notes: order.fulfillment_note || '',
      reviewNote: order.review_note,
      paymentReference: order.payment_reference || order.order_number,
      paymentChannelLabel: order.payment_account_label || account?.label || '',
      assignedAccount: account
        ? `${account.label}｜${account.bank_name}${account.bank_code ? `(${account.bank_code})` : ''}｜${account.account_name}｜${account.account_number}`
        : '未分配收款帳戶',
      inventoryReserved: order.inventory_reserved ?? true,
      items: orderItems.map((item) => {
        const option = [item.variant_id, item.size ? `尺碼 ${item.size}` : ''].filter(Boolean).join(' / ')
        return `${item.name}${option ? ` - ${option}` : ''} x ${item.quantity}`
      }),
    }
  })

  const dashboardOrders = [...courseDashboardOrders, ...shopDashboardOrders].sort((a, b) =>
    String(b.submittedAt ?? '').localeCompare(String(a.submittedAt ?? ''))
  )

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const overview = {
    studentCount: students.length,
    coachCount: coaches.filter((coach) => coach.role === 'coach').length,
    pendingOrderCount: dashboardOrders.filter((order) => order.status === 'pending_review').length,
    approvedOrderCount: dashboardOrders.filter((order) => order.status === 'approved').length,
    unopenedPlanCount: students.filter((student) => !student.planEnabled).length,
    recentFeedbackCount: feedback.filter((item) => new Date(item.created_at).getTime() >= sevenDaysAgo).length,
    productCount: shopProducts.length,
    lowStockCount: shopProducts.filter((product) => product.stockQuantity <= 3).length,
    paymentAccountCount: paymentAccounts.filter((account) => account.active).length,
  }

  return json({
    admin: auth.adminProfile,
    overview,
    students,
    coaches,
    orders: dashboardOrders,
    products: shopProducts,
    paymentAccounts,
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
      return json({ error: '缺少使用者 ID。' }, { status: 400 })
    }

    const { data: target, error: targetError } = await supabaseAdmin!
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (targetError || !target) {
      return json({ error: targetError?.message || '找不到使用者。' }, { status: 404 })
    }

    if (target.role === 'admin') {
      return json({ error: '管理員角色不能在這裡被改為普通教練或學員。' }, { status: 400 })
    }

    const { data: profile, error } = await supabaseAdmin!
      .from('profiles')
      .update({ role: enabled ? 'coach' : 'student' })
      .eq('id', userId)
      .select('id, role, name, email')
      .single()

    if (error || !profile) {
      return json({ error: error?.message || '更新教練權限失敗。' }, { status: 500 })
    }

    return json({ profile, message: enabled ? '已授予教練權限。' : '已取消教練權限。' })
  }

  if (body.action === 'review_order') {
    const orderId = cleanText(body.orderId)
    const orderKind = cleanText(body.orderKind) || 'course'
    const status = cleanText(body.status)
    const reviewNote = cleanText(body.reviewNote)

    if (!orderId) {
      return json({ error: '缺少訂單 ID。' }, { status: 400 })
    }

    if (!isPaymentOrderStatus(status) || !['approved', 'rejected'].includes(status)) {
      return json({ error: '訂單狀態無效。' }, { status: 400 })
    }

    const finalReviewNote = reviewNote || (status === 'approved' ? '付款核對透過，訂單已核准。' : '付款核對異常，請補充資料。')

    if (orderKind === 'shop') {
      const { data: currentOrder, error: currentOrderError } = await supabaseAdmin!
        .from('shop_orders')
        .select('id, status, inventory_reserved')
        .eq('id', orderId)
        .single()

      if (currentOrderError || !currentOrder) {
        return json({ error: currentOrderError?.message || '找不到商城訂單。' }, { status: 404 })
      }

      const { data: orderItems, error: itemsError } = await supabaseAdmin!
        .from('shop_order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId)

      if (itemsError) {
        return json({ error: itemsError.message }, { status: 500 })
      }

      if (status === 'rejected' && currentOrder.inventory_reserved) {
        try {
          for (const item of orderItems ?? []) {
            const currentStock = await getProductStock(item.product_id)
            const { error: stockError } = await supabaseAdmin!
              .from('shop_products')
              .update({ stock_quantity: currentStock + item.quantity })
              .eq('id', item.product_id)

            if (stockError) {
              return json({ error: stockError.message }, { status: 500 })
            }
          }
        } catch (stockReadError) {
          return json({ error: stockReadError instanceof Error ? stockReadError.message : '庫存讀取失敗。' }, { status: 500 })
        }
      }

      if (status === 'approved' && !currentOrder.inventory_reserved) {
        try {
          for (const item of orderItems ?? []) {
            const currentStock = await getProductStock(item.product_id)
            if (currentStock < item.quantity) {
              return json({ error: `庫存不足，無法重新核准商品 ${item.product_id}。` }, { status: 409 })
            }

            const { error: stockError } = await supabaseAdmin!
              .from('shop_products')
              .update({ stock_quantity: currentStock - item.quantity })
              .eq('id', item.product_id)

            if (stockError) {
              return json({ error: stockError.message }, { status: 500 })
            }
          }
        } catch (stockReadError) {
          return json({ error: stockReadError instanceof Error ? stockReadError.message : '庫存讀取失敗。' }, { status: 500 })
        }
      }

      const { data: order, error } = await supabaseAdmin!
        .from('shop_orders')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          review_note: finalReviewNote,
          inventory_reserved: status === 'approved',
        })
        .eq('id', orderId)
        .select('*')
        .single()

      if (error || !order) {
        return json({ error: error?.message || '商城訂單更新失敗。' }, { status: 500 })
      }

      return json({ order, message: finalReviewNote })
    }

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
      return json({ error: error?.message || '訂單更新失敗。' }, { status: 500 })
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

  if (body.action === 'update_product_stock') {
    const productId = cleanText(body.productId)
    const stockQuantity = Number(body.stockQuantity)
    const active = body.active === true

    if (!productId) {
      return json({ error: '缺少商品 ID。' }, { status: 400 })
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return json({ error: '庫存數量必須是 0 或正整數。' }, { status: 400 })
    }

    const { data: product, error } = await supabaseAdmin!
      .from('shop_products')
      .update({
        stock_quantity: stockQuantity,
        active,
      })
      .eq('id', productId)
      .select('*')
      .single()

    if (error || !product) {
      return json({ error: error?.message || '更新庫存失敗。' }, { status: 500 })
    }

    return json({ product, message: '商品庫存已更新。' })
  }

  if (body.action === 'create_payment_account') {
    const label = cleanText(body.label)
    const accountName = cleanText(body.accountName)
    const bankName = cleanText(body.bankName)
    const bankCode = cleanText(body.bankCode)
    const accountNumber = cleanText(body.accountNumber)
    const weight = Number(body.weight ?? 1)

    if (!label || !accountName || !bankName || !accountNumber) {
      return json({ error: '請填寫通道名稱、戶名、銀行名稱和收款帳號。' }, { status: 400 })
    }

    if (!Number.isInteger(weight) || weight < 1) {
      return json({ error: '權重必須是正整數。' }, { status: 400 })
    }

    const { data: account, error } = await supabaseAdmin!
      .from('shop_payment_accounts')
      .insert({
        label,
        account_name: accountName,
        bank_name: bankName,
        bank_code: bankCode,
        account_number: accountNumber,
        weight,
        active: true,
      })
      .select('*')
      .single()

    if (error || !account) {
      return json({ error: error?.message || '新增收款帳戶失敗。' }, { status: 500 })
    }

    return json({ account, message: '收款帳戶已新增。' })
  }

  if (body.action === 'toggle_payment_account') {
    const accountId = cleanText(body.accountId)
    const active = body.active === true

    if (!accountId) {
      return json({ error: '缺少收款帳戶 ID。' }, { status: 400 })
    }

    const { data: account, error } = await supabaseAdmin!
      .from('shop_payment_accounts')
      .update({ active })
      .eq('id', accountId)
      .select('*')
      .single()

    if (error || !account) {
      return json({ error: error?.message || '更新收款帳戶失敗。' }, { status: 500 })
    }

    return json({ account, message: active ? '收款帳戶已啟用。' : '收款帳戶已停用。' })
  }

  if (body.action === 'bind_student') {
    const studentId = cleanText(body.studentId)
    const coachId = cleanText(body.coachId)

    if (!studentId || !coachId) {
      return json({ error: '請選擇學員和教練。' }, { status: 400 })
    }

    if (studentId === coachId) {
      return json({ error: '不能把同一個帳號同時作為學員和教練綁定。' }, { status: 400 })
    }

    const { data: relatedProfiles, error: relatedProfilesError } = await supabaseAdmin!
      .from('profiles')
      .select('id, role')
      .in('id', [studentId, coachId])

    if (relatedProfilesError) {
      return json({ error: relatedProfilesError.message }, { status: 500 })
    }

    const studentProfile = relatedProfiles?.find((profile) => profile.id === studentId)
    const coachProfile = relatedProfiles?.find((profile) => profile.id === coachId)

    if (!studentProfile || studentProfile.role !== 'student') {
      return json({ error: '請選擇普通學員帳號作為綁定學員。' }, { status: 400 })
    }

    if (!coachProfile || !['coach', 'admin'].includes(coachProfile.role)) {
      return json({ error: '請選擇已啟用教練權限的帳號。' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin!
      .from('coach_students')
      .upsert({ student_id: studentId, coach_id: coachId, active: true }, { onConflict: 'coach_id,student_id' })
      .select('*')
      .single()

    if (error || !data) {
      return json({ error: error?.message || '綁定失敗。' }, { status: 500 })
    }

    return json({ binding: data, message: '學員與教練已綁定。' })
  }

  if (body.action === 'unbind_student') {
    const bindingId = cleanText(body.bindingId)

    if (!bindingId) {
      return json({ error: '缺少綁定 ID。' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin!
      .from('coach_students')
      .update({ active: false })
      .eq('id', bindingId)
      .select('*')
      .single()

    if (error || !data) {
      return json({ error: error?.message || '解綁失敗。' }, { status: 500 })
    }

    return json({ binding: data, message: '綁定關係已取消。' })
  }

  return json({ error: '未知的管理員操作。' }, { status: 400 })
}
