import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { shopProductFromRow, type ShopProductRow } from '@/lib/shop-products'
import { allCourses } from '@/lib/goodluck-data'
import { coachPublicProfilesFromRows, getDefaultCourseCoachKeys, type CoachPublicProfileRow } from '@/lib/coach-profiles'
import { applyCourseSeasonToContent, nextCourseSeasonIdentity, type CourseSeasonStatus } from '@/lib/course-seasons'
import { getCourseSeasons } from '@/lib/course-seasons-server'
import { defaultCourseBillingConfig, normalizeCourseBillingConfig } from '@/lib/course-pricing'
import { applyCourseOverrides } from '@/lib/managed-courses'
import {
  awardCourseEnrollmentAchievement,
  sendCourseEnrollmentApprovedEmail,
} from '@/lib/admin-payment-notifications'
import {
  defaultSiteContent,
  isSafePublicUrl,
  normalizeActivities,
  normalizeAboutContent,
  normalizeBrandContent,
  normalizeCourseOverrides,
  normalizeHeroSlides,
  normalizeHomeContent,
  normalizePageMedia,
  normalizeSeasonalUpdate,
  normalizeTestimonialsContent,
  siteContentFromRows,
} from '@/lib/site-content'

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
  phone: string
  preferred_course: string
  course_slug: string
  season_id: string | null
  course_season_course_id: string | null
  course_capacity: number
  registration_identity: string | null
  enrollment_timing: string | null
  calculated_amount: number | null
  pricing_snapshot: Record<string, unknown> | null
  price_locked_until: string | null
  billing_start_session_date: string | null
  prior_attendance_claimed: boolean
  attendance_verification_status: string | null
  amount_text: string
  transfer_last_five: string
  status: string
  notes: string
  running_experience: string
  goal: string
  payload: Record<string, unknown> | null
  review_note: string | null
  created_at: string
  payment_submitted_at: string | null
}

type CourseAttendanceRow = {
  id: string
  enrollment_id: string
  course_season_course_id: string
  session_date: string
  status: 'present' | 'absent' | 'excused' | 'makeup'
  note: string
  marked_at: string
}

type CourseAttendanceDeductionRow = {
  enrollment_id: string
  session_date: string
  deducted_by: string
  deducted_at: string
}

type CourseSessionCancellationRow = {
  course_season_course_id: string
  session_date: string
}

type CourseAttendanceResolutionRow = {
  attendance_id: string
  enrollment_id: string
  outcome: 'supplement_paid' | 'waived'
  note: string
  resolved_at: string
}

function payloadText(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function recordText(value: Record<string, unknown> | null, key: string) {
  const item = value?.[key]
  return typeof item === 'string' ? item.trim() : ''
}

function recordNumber(value: Record<string, unknown> | null, key: string) {
  const item = Number(value?.[key])
  return Number.isFinite(item) ? item : null
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

type CoachInviteRow = {
  id: string
  code: string
  used_by: string | null
  used_at: string | null
  expires_at: string | null
  created_at: string
}

type CourseSeasonSyncSourceRow = {
  id: string
  season_id: string
  provider: 'google_sheets'
  external_id: string
  source_url: string
  active: boolean
  last_synced_at: string | null
  last_result: Record<string, unknown> | null
  last_error: string
  updated_at: string
}

type AdminPatchBody =
  | { action?: 'set_coach_role'; userId?: string; enabled?: boolean }
  | { action?: 'link_coach_public_profile'; userId?: string; coachKey?: string }
  | { action?: 'create_coach_invite' }
  | { action?: 'review_order'; orderId?: string; orderKind?: 'course' | 'shop'; status?: PaymentOrderStatus; reviewNote?: string }
  | { action?: 'resolve_attendance_anomaly'; attendanceId?: string; outcome?: 'supplement_paid' | 'waived' | 'reopen'; resolutionNote?: string }
  | { action?: 'delete_order'; orderId?: string; orderKind?: 'course' | 'shop' }
  | { action?: 'bind_student'; studentId?: string; coachId?: string }
  | { action?: 'unbind_student'; bindingId?: string }
  | { action?: 'update_product'; productId?: string; name?: string; category?: string; stockQuantity?: number; price?: number; active?: boolean; image?: string; video?: string; tags?: string; sizes?: string; variants?: Array<{ id?: string; name?: string; image?: string; detailImages?: string[] }>; summary?: string; description?: string; gallery?: string[]; highlights?: string; specifications?: Array<{ label?: string; value?: string }>; usageNotes?: string; externalUrl?: string }
  | { action?: 'create_product'; name?: string; category?: string; stockQuantity?: number; price?: number; active?: boolean; image?: string; video?: string; tags?: string; sizes?: string; variants?: Array<{ id?: string; name?: string; image?: string; detailImages?: string[] }>; summary?: string; description?: string; gallery?: string[]; highlights?: string; specifications?: Array<{ label?: string; value?: string }>; usageNotes?: string; externalUrl?: string }
  | { action?: 'delete_product'; productId?: string }
  | { action?: 'save_site_content'; section?: string; value?: unknown }
  | { action?: 'save_season_course'; seasonId?: string; courseSlug?: string; value?: unknown; capacity?: number; billingConfig?: unknown }
  | { action?: 'create_next_course_season'; sourceSeasonId?: string }
  | { action?: 'activate_course_season'; seasonId?: string }
  | { action?: 'update_course_season_status'; seasonId?: string; status?: CourseSeasonStatus }
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

function commaSeparated(value: unknown) {
  return cleanText(value)
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20)
}

function lineSeparated(value: unknown) {
  return cleanText(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30)
}

function cleanSpecifications(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.slice(0, 30).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as { label?: unknown; value?: unknown }
    const label = cleanText(row.label).slice(0, 80)
    const specificationValue = cleanText(row.value).slice(0, 300)
    return label && specificationValue ? [{ label, value: specificationValue }] : []
  })
}

function cleanGallery(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => cleanText(item))
    .filter((item) => item && isSafePublicUrl(item) && isSafeProductMedia(item))
    .slice(0, 12)
}

function cleanProductVariants(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as { id?: unknown; name?: unknown; image?: unknown; detailImages?: unknown }
    const id = cleanText(row.id).slice(0, 100)
    const name = cleanText(row.name).slice(0, 100)
    const image = cleanText(row.image)
    const rawDetailImages = Array.isArray(row.detailImages) ? row.detailImages : []
    const detailImages = cleanGallery(rawDetailImages)
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || !name || !image || !isSafePublicUrl(image) || !isSafeProductMedia(image) || detailImages.length !== rawDetailImages.length) return []
    return [{ id, name, image, detailImages }]
  })
}

function isSafeProductMedia(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return true

  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.supabase.co') &&
      url.pathname.startsWith('/storage/v1/object/public/site-media/products/')
    )
  } catch {
    return false
  }
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

  const { error: inviteCleanupError } = await supabaseAdmin!
    .from('coach_invites')
    .delete()
    .not('used_at', 'is', null)
  if (inviteCleanupError) {
    console.warn('[admin] Used coach invite cleanup failed.', inviteCleanupError.message)
  }

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
    siteContentResult,
    coachInvitesResult,
    coachPublicProfilesResult,
    courseAttendanceResult,
    attendanceResolutionsResult,
    attendanceDeductionsResult,
    sessionCancellationsResult,
    seasonSyncSourcesResult,
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
      .limit(3000),
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
      .select('id, name, category, price, price_label, image, video, rating, reviews, tags, summary, description, gallery, highlights, specifications, usage_notes, external_url, variants, sizes, stock_quantity, active')
      .is('deleted_at', null)
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
    supabaseAdmin!
      .from('site_content')
      .select('key, value')
      .in('key', ['hero_slides', 'home_activities', 'seasonal_update', 'course_overrides', 'brand_content', 'home_content', 'about_content', 'testimonials_content', 'page_media']),
    supabaseAdmin!
      .from('coach_invites')
      .select('id, code, used_by, used_at, expires_at, created_at')
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin!
      .from('coach_public_profiles')
      .select('*'),
    supabaseAdmin!
      .from('course_attendance_records')
      .select('id, enrollment_id, course_season_course_id, session_date, status, note, marked_at')
      .order('session_date', { ascending: false })
      .limit(5000),
    supabaseAdmin!
      .from('course_attendance_resolutions')
      .select('attendance_id, enrollment_id, outcome, note, resolved_at')
      .order('resolved_at', { ascending: false })
      .limit(5000),
    supabaseAdmin!
      .from('course_attendance_deductions')
      .select('enrollment_id, session_date, deducted_by, deducted_at')
      .order('session_date', { ascending: false })
      .limit(5000),
    supabaseAdmin!
      .from('course_session_cancellations')
      .select('course_season_course_id, session_date')
      .limit(1000),
    supabaseAdmin!
      .from('course_season_sync_sources')
      .select('id, season_id, provider, external_id, source_url, active, last_synced_at, last_result, last_error, updated_at')
      .order('updated_at', { ascending: false }),
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
    isOptionalSchemaError(siteContentResult.error) ? null : siteContentResult.error,
    coachInvitesResult.error,
    coachPublicProfilesResult.error,
    courseAttendanceResult.error,
    attendanceResolutionsResult.error,
    attendanceDeductionsResult.error,
    sessionCancellationsResult.error,
    isOptionalSchemaError(seasonSyncSourcesResult.error) ? null : seasonSyncSourcesResult.error,
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
  const courseSeasons = await getCourseSeasons()
  const currentSeason = courseSeasons.find((season) => season.isCurrent) ?? null
  const baseSiteContent = siteContentResult.error ? defaultSiteContent : siteContentFromRows(siteContentResult.data)
  const publicCoachProfiles = coachPublicProfilesFromRows(coachPublicProfilesResult.data as CoachPublicProfileRow[] | null)
  const publicCoachRows = (coachPublicProfilesResult.data ?? []) as CoachPublicProfileRow[]
  const courseAttendance = (courseAttendanceResult.data ?? []) as CourseAttendanceRow[]
  const attendanceResolutions = (attendanceResolutionsResult.data ?? []) as CourseAttendanceResolutionRow[]
  const attendanceDeductions = (attendanceDeductionsResult.data ?? []) as CourseAttendanceDeductionRow[]
  const sessionCancellations = (sessionCancellationsResult.data ?? []) as CourseSessionCancellationRow[]
  const seasonSyncSources = seasonSyncSourcesResult.error
    ? []
    : (seasonSyncSourcesResult.data ?? []) as CourseSeasonSyncSourceRow[]
  const siteContent = {
    ...applyCourseSeasonToContent(baseSiteContent, currentSeason),
    coachProfiles: publicCoachProfiles,
  }
  const managedCourses = applyCourseOverrides(siteContent.courseOverrides, { includeInactive: true, coachProfiles: publicCoachProfiles })
  const coachInvites = (coachInvitesResult.data ?? []) as CoachInviteRow[]
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
  const attendanceByEnrollment = new Map<string, CourseAttendanceRow[]>()
  courseAttendance.forEach((record) => {
    attendanceByEnrollment.set(record.enrollment_id, [...(attendanceByEnrollment.get(record.enrollment_id) ?? []), record])
  })
  const resolutionByAttendance = new Map(attendanceResolutions.map((resolution) => [resolution.attendance_id, resolution]))
  const deductionsByEnrollment = new Map<string, CourseAttendanceDeductionRow[]>()
  attendanceDeductions.forEach((record) => {
    deductionsByEnrollment.set(record.enrollment_id, [...(deductionsByEnrollment.get(record.enrollment_id) ?? []), record])
  })
  const cancelledSessions = new Set(sessionCancellations.map((record) => `${record.course_season_course_id}:${record.session_date}`))

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
    const publicProfileRow = publicCoachRows.find((row) => row.owner_profile_id === coach.id)
    const assignedCourses = publicProfileRow
      ? managedCourses.filter((course) => {
          const coachKeys = siteContent.courseOverrides[course.slug]?.coachKeys
            ?? getDefaultCourseCoachKeys(course.slug)
          return coachKeys.includes(publicProfileRow.coach_key)
        })
      : []

    return {
      id: coach.id,
      name: coach.name || coach.email || '未填寫姓名',
      email: coach.email,
      role: coach.role,
      coachEnabled: coach.role === 'coach' || coach.role === 'admin',
      boundStudentCount: coachBindings.length,
      courses: assignedCourses.map((course) => course.name).join('、'),
      publicCoachKey: publicProfileRow?.coach_key ?? '',
      publicProfileName: publicProfileRow ? publicCoachProfiles[publicProfileRow.coach_key]?.displayName ?? publicProfileRow.display_name ?? '' : '',
      createdAt: coach.created_at,
    }
  })

  const courseDashboardOrders = coursePaymentOrders.map((order) => {
    const studentType = order.registration_identity || payloadText(order.payload, 'studentType')
    const enrollmentTiming = order.enrollment_timing || payloadText(order.payload, 'enrollmentTiming')
    const pricing = order.pricing_snapshot && Object.keys(order.pricing_snapshot).length > 0
      ? order.pricing_snapshot
      : order.payload?.pricing && typeof order.payload.pricing === 'object'
        ? order.payload.pricing as Record<string, unknown>
        : null
    const chargedSessionCount = recordNumber(pricing, 'chargedSessionCount')
    const unitRate = recordNumber(pricing, 'unitRate')
    const chargedSessionDates = Array.isArray(pricing?.chargedSessionDates)
      ? pricing.chargedSessionDates.filter((date): date is string => typeof date === 'string')
      : []
    const referrerStatus = recordText(pricing, 'referrerStatus')
    const billingStartSessionDate = order.billing_start_session_date || recordText(pricing, 'billingStartSessionDate')
    const billingStartSessionNumber = recordNumber(pricing, 'billingStartSessionNumber')
    const priorAttendanceClaimed = order.prior_attendance_claimed || pricing?.priorAttendanceClaimed === true
    const attendanceVerificationStatus = order.attendance_verification_status || recordText(pricing, 'attendanceVerificationStatus')
    const attendanceAnomalies = billingStartSessionDate
      ? (attendanceByEnrollment.get(order.id) ?? [])
          .filter((record) => record.status === 'present' && record.session_date < billingStartSessionDate)
          .filter((record) => !cancelledSessions.has(`${record.course_season_course_id}:${record.session_date}`))
          .map((record) => {
            const resolution = resolutionByAttendance.get(record.id)
            return {
              attendanceId: record.id,
              sessionDate: record.session_date,
              billingStartSessionDate,
              status: resolution ? 'resolved' as const : 'open' as const,
              outcome: resolution?.outcome ?? '',
              resolutionNote: resolution?.note ?? '',
              resolvedAt: resolution?.resolved_at ?? null,
              markedAt: record.marked_at,
            }
          })
      : []
    const emergencyContactName = payloadText(order.payload, 'emergencyContactName')
    const emergencyContactPhone = payloadText(order.payload, 'emergencyContactPhone')
    const deductedSessions = (deductionsByEnrollment.get(order.id) ?? []).map((record) => {
      const coach = profilesById.get(record.deducted_by)
      const coachName = coach?.name || coach?.email || '教練'
      const sessionDate = record.session_date.replace(/^\d{4}-/, '').replace('-', '/')
      const deductedAt = new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Taipei' }).format(new Date(record.deducted_at))
      return `${sessionDate}（${coachName}，${deductedAt}）`
    })
    const registrationDetails = [
      { label: '學員身分', value: studentType === 'returning' ? '舊生' : studentType === 'new' ? '新生' : '' },
      { label: '報名時點', value: enrollmentTiming === 'late' ? '插班報名' : enrollmentTiming === 'regular' ? '本期正常報名' : '' },
      { label: '計費起始課次', value: billingStartSessionDate ? `${billingStartSessionNumber ? `第 ${billingStartSessionNumber} 堂｜` : ''}${billingStartSessionDate}` : '' },
      { label: '最近一堂到課申報', value: priorAttendanceClaimed ? (attendanceVerificationStatus === 'verified' ? '教練點名已確認到課' : attendanceVerificationStatus === 'rejected' ? '教練點名未到，需人工處理' : '待教練完成該堂點名') : '' },
      { label: '計價方式', value: chargedSessionCount ? (unitRate ? `${chargedSessionCount} 堂 × NT$${unitRate}` : `完整 ${chargedSessionCount} 堂`) : '' },
      { label: '收費課次', value: chargedSessionDates.map((date) => date.replace(/^\d{4}-/, '').replace('-', '/')).join('、') },
      { label: '已扣除課次', value: deductedSessions.join('、') },
      { label: '推薦資格', value: referrerStatus === 'verified' ? '已核對' : referrerStatus === 'not_verified' ? '未通過核對' : '' },
      { label: '報價鎖定至', value: order.price_locked_until ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Taipei' }).format(new Date(order.price_locked_until)) : '' },
      { label: '手機電話', value: order.phone || '' },
      { label: 'LINE ID', value: payloadText(order.payload, 'lineId') },
      { label: '緊急聯絡人', value: [emergencyContactName, emergencyContactPhone].filter(Boolean).join('｜') },
      { label: '推薦人', value: payloadText(order.payload, 'referrer') },
      { label: '近期挑戰', value: payloadText(order.payload, 'recentChallenge') },
      { label: '近期目標', value: payloadText(order.payload, 'recentGoal') || order.goal || '' },
      { label: '病史或運動傷害', value: payloadText(order.payload, 'injuryHistory') },
      { label: '跑步近況', value: payloadText(order.payload, 'runningStatus') },
      { label: '發票方式', value: payloadText(order.payload, 'invoiceDelivery') },
      { label: '載具或信箱', value: payloadText(order.payload, 'invoiceDetail') },
      { label: '統編與抬頭', value: payloadText(order.payload, 'taxInvoiceInfo') },
    ].filter((detail) => detail.value)

    return {
      id: order.id,
      orderKind: 'course' as const,
      orderNumber: '',
      studentName: order.name,
      email: order.email,
      courseName: order.preferred_course,
      courseSlug: order.course_slug || '',
      seasonId: order.season_id || '',
      seasonName: courseSeasons.find((season) => season.id === order.season_id)?.name || '舊版報名',
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
      registrationDetails,
      attendanceAnomalies,
      openAttendanceAnomalyCount: attendanceAnomalies.filter((anomaly) => anomaly.status === 'open').length,
    }
  })

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
      courseSlug: '',
      seasonId: '',
      seasonName: '',
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
      registrationDetails: [] as Array<{ label: string; value: string }>,
      attendanceAnomalies: [],
      openAttendanceAnomalyCount: 0,
    }
  })

  const dashboardOrders = [...courseDashboardOrders, ...shopDashboardOrders].sort((a, b) =>
    String(b.submittedAt ?? '').localeCompare(String(a.submittedAt ?? ''))
  )

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const overview = {
    studentCount: students.length,
    coachCount: coaches.filter((coach) => coach.coachEnabled).length,
    pendingOrderCount: dashboardOrders.filter((order) => order.status === 'pending_review').length,
    approvedOrderCount: dashboardOrders.filter((order) => order.status === 'approved').length,
    unopenedPlanCount: students.filter((student) => !student.planEnabled).length,
    recentFeedbackCount: feedback.filter((item) => new Date(item.created_at).getTime() >= sevenDaysAgo).length,
    productCount: shopProducts.length,
    lowStockCount: shopProducts.filter((product) => product.stockQuantity <= 3).length,
    paymentAccountCount: paymentAccounts.filter((account) => account.active).length,
    openAttendanceAnomalyCount: courseDashboardOrders.reduce((sum, order) => sum + order.openAttendanceAnomalyCount, 0),
  }

  const courseCapacity = courseSeasons.flatMap((season) =>
    applyCourseOverrides(season.courseOverrides, { includeInactive: true }).map((course) => {
      const courseOrders = coursePaymentOrders.filter((order) =>
        order.course_slug === course.slug && order.season_id === season.id
      )
      const paidCount = courseOrders.filter((order) => order.status === 'approved').length
      const capacity = season.courseCapacities[course.slug] ?? 40
      return {
        slug: course.slug,
        name: course.name,
        seasonId: season.id,
        seasonName: season.name,
        capacity,
        paidCount,
        pendingTransferCount: courseOrders.filter((order) => order.status === 'pending_transfer').length,
        pendingReviewCount: courseOrders.filter((order) => order.status === 'pending_review').length,
        remaining: Math.max(0, capacity - paidCount),
      }
    })
  )

  return json({
    admin: auth.adminProfile,
    overview,
    students,
    coaches,
    orders: dashboardOrders,
    courseCapacity,
    products: shopProducts,
    paymentAccounts,
    courseSeasons,
    seasonSyncSources: seasonSyncSources.map((source) => ({
      id: source.id,
      seasonId: source.season_id,
      provider: source.provider,
      spreadsheetId: source.external_id,
      sourceUrl: source.source_url,
      active: source.active,
      lastSyncedAt: source.last_synced_at,
      lastResult: source.last_result ?? {},
      lastError: source.last_error,
      updatedAt: source.updated_at,
    })),
    siteContent,
    courses: managedCourses.map((course) => ({
      slug: course.slug,
      name: course.name,
      weekday: course.weekday,
      location: course.location,
      period: course.period,
      classTime: course.classTime,
      meetingPoint: course.meetingPoint,
      feeNote: course.feeNote,
      targetAudience: course.targetAudience,
      focus: course.focus,
      signupUrl: course.signupUrl || '',
      coachKeys: siteContent.courseOverrides[course.slug]?.coachKeys
        ?? getDefaultCourseCoachKeys(course.slug),
    })),
    coachOptions: coaches
      .filter((coach) => coach.coachEnabled)
      .map((coach) => ({ id: coach.id, name: coach.name, email: coach.email })),
    coachInvites: coachInvites.map((invite) => ({
      id: invite.id,
      code: invite.code,
      usedBy: invite.used_by
        ? profilesById.get(invite.used_by)?.name || profilesById.get(invite.used_by)?.email || '已使用'
        : '',
      usedAt: invite.used_at,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
    })),
    coachPublicProfiles: publicCoachRows.map((row) => ({
      coachKey: row.coach_key,
      displayName: publicCoachProfiles[row.coach_key]?.displayName || row.display_name || row.coach_key,
      ownerProfileId: row.owner_profile_id ?? null,
    })),
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const body = (await request.json().catch(() => ({}))) as AdminPatchBody

  if (body.action === 'save_season_course') {
    const seasonId = cleanText(body.seasonId)
    const courseSlug = cleanText(body.courseSlug)
    const capacity = Number(body.capacity)
    const validSlugs = new Set(allCourses.map((course) => course.slug))
    const normalized = normalizeCourseOverrides({ [courseSlug]: body.value })[courseSlug]

    if (!seasonId || !validSlugs.has(courseSlug) || !normalized) {
      return json({ error: '季度或課程資料無效。' }, { status: 400 })
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
      return json({ error: '班級名額必須是 1 至 500 之間的整數。' }, { status: 400 })
    }

    const { data: season, error: seasonError } = await supabaseAdmin!
      .from('course_seasons')
      .select('code, is_current')
      .eq('id', seasonId)
      .single()
    if (seasonError || !season) {
      return json({ error: seasonError?.message || '找不到這個季度。' }, { status: 404 })
    }
    const baseCourse = allCourses.find((course) => course.slug === courseSlug)
    const billingConfig = normalizeCourseBillingConfig(
      body.billingConfig,
      defaultCourseBillingConfig({
        period: String(normalized.period || baseCourse?.period || ''),
        weekday: String(normalized.weekday || baseCourse?.weekday || ''),
      }, season.code)
    )
    if (season.is_current && (!billingConfig.scheduleReady || billingConfig.sessionDates.length === 0)) {
      return json({ error: '前台招生季度必須先完成實際收費課次設定。' }, { status: 400 })
    }

    const { data: seasonCourse, error } = await supabaseAdmin!
      .from('course_season_courses')
      .upsert({
        season_id: seasonId,
        course_slug: courseSlug,
        course_data: normalized,
        capacity,
        billing_config: billingConfig,
      }, { onConflict: 'season_id,course_slug' })
      .select('id, season_id, course_slug, course_data, capacity, billing_config')
      .single()

    if (error || !seasonCourse) {
      return json({ error: error?.message || '季度課程儲存失敗。' }, { status: 500 })
    }

    return json({ seasonCourse, message: '已儲存到這一季；若為當前招生季度，前台也已同步。' })
  }

  if (body.action === 'create_next_course_season') {
    const sourceSeasonId = cleanText(body.sourceSeasonId)
    const { data: sourceSeason, error: sourceError } = await supabaseAdmin!
      .from('course_seasons')
      .select('id, code, name')
      .eq('id', sourceSeasonId)
      .single()

    if (sourceError || !sourceSeason) {
      return json({ error: sourceError?.message || '找不到要複製的季度。' }, { status: 404 })
    }

    const identity = nextCourseSeasonIdentity(sourceSeason.code)
    const { data: existing } = await supabaseAdmin!
      .from('course_seasons')
      .select('id')
      .eq('code', identity.code)
      .maybeSingle()

    if (existing) {
      return json({ error: `${identity.name} 已經存在，請直接切換管理。` }, { status: 409 })
    }

    const { data: newSeason, error: seasonError } = await supabaseAdmin!
      .from('course_seasons')
      .insert({
        code: identity.code,
        name: identity.name,
        status: 'draft',
        is_current: false,
        created_by: auth.user.id,
      })
      .select('id, code, name')
      .single()

    if (seasonError || !newSeason) {
      return json({ error: seasonError?.message || '建立下一季失敗。' }, { status: 500 })
    }

    const { data: sourceCourses, error: sourceCoursesError } = await supabaseAdmin!
      .from('course_season_courses')
      .select('course_slug, course_data, capacity, billing_config')
      .eq('season_id', sourceSeasonId)

    if (sourceCoursesError) {
      await supabaseAdmin!.from('course_seasons').delete().eq('id', newSeason.id)
      return json({ error: sourceCoursesError.message || '讀取上一季課程失敗。' }, { status: 500 })
    }

    const copiedCourses = (sourceCourses ?? []).map((course) => ({
      season_id: newSeason.id,
      course_slug: course.course_slug,
      course_data: course.course_data,
      capacity: course.capacity,
      billing_config: {
        ...(course.billing_config && typeof course.billing_config === 'object' ? course.billing_config : {}),
        scheduleReady: false,
        sessionDates: [],
      },
    }))

    if (copiedCourses.length > 0) {
      const { error: copyError } = await supabaseAdmin!.from('course_season_courses').insert(copiedCourses)
      if (copyError) {
        await supabaseAdmin!.from('course_seasons').delete().eq('id', newSeason.id)
        return json({ error: copyError.message || '複製課程失敗。' }, { status: 500 })
      }
    }

    return json({ season: newSeason, message: `${identity.name} 已建立為草稿，第三季資料仍完整保留。` })
  }

  if (body.action === 'activate_course_season') {
    const seasonId = cleanText(body.seasonId)
    if (!seasonId) return json({ error: '缺少季度 ID。' }, { status: 400 })

    const { data: season, error } = await supabaseAdmin!.rpc('activate_course_season', { p_season_id: seasonId })
    if (error || !season) {
      return json({ error: error?.message || '切換前台招生季度失敗。' }, { status: 500 })
    }
    return json({ season, message: '前台訓練課程、日程表與報名頁已切換到新季度。' })
  }

  if (body.action === 'update_course_season_status') {
    const seasonId = cleanText(body.seasonId)
    const status = cleanText(body.status) as CourseSeasonStatus
    const allowedStatuses = new Set<CourseSeasonStatus>(['draft', 'enrolling', 'active', 'completed', 'archived'])
    if (!seasonId || !allowedStatuses.has(status)) {
      return json({ error: '季度狀態無效。' }, { status: 400 })
    }

    const { data: current } = await supabaseAdmin!.from('course_seasons').select('is_current').eq('id', seasonId).single()
    if (current?.is_current && status === 'archived') {
      return json({ error: '請先將前台招生切換到其他季度，再封存這一季。' }, { status: 409 })
    }

    const { data: season, error } = await supabaseAdmin!
      .from('course_seasons')
      .update({ status })
      .eq('id', seasonId)
      .select('id, code, name, status, is_current')
      .single()
    if (error || !season) {
      return json({ error: error?.message || '更新季度狀態失敗。' }, { status: 500 })
    }
    return json({ season, message: '季度狀態已更新，報名資料不會被刪除。' })
  }

  if (body.action === 'create_coach_invite') {
    const code = `HYCOACH-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: invite, error } = await supabaseAdmin!
      .from('coach_invites')
      .insert({
        code,
        created_by: auth.user.id,
        expires_at: expiresAt,
      })
      .select('id, code, expires_at, created_at')
      .single()

    if (error || !invite) {
      return json({ error: error?.message || '生成教練認證碼失敗。' }, { status: 500 })
    }

    return json({ invite, message: `教練認證碼 ${code} 已生成，有效期 30 天。` })
  }

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

  if (body.action === 'link_coach_public_profile') {
    const userId = cleanText(body.userId)
    const coachKey = cleanText(body.coachKey)
    if (!userId) return json({ error: '缺少使用者 ID。' }, { status: 400 })

    const { data: target, error: targetError } = await supabaseAdmin!
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()
    if (targetError || !target) return json({ error: targetError?.message || '找不到使用者。' }, { status: 404 })
    if (!['coach', 'admin'].includes(target.role)) return json({ error: '請先授予這個帳號教練權限。' }, { status: 400 })

    if (coachKey) {
      const { data: publicProfile, error: publicProfileError } = await supabaseAdmin!
        .from('coach_public_profiles')
        .select('coach_key')
        .eq('coach_key', coachKey)
        .maybeSingle()
      if (publicProfileError || !publicProfile) {
        return json({ error: publicProfileError?.message || '找不到要連結的公開教練資料。' }, { status: 404 })
      }
    }

    const { error: clearOwnerError } = await supabaseAdmin!
      .from('coach_public_profiles')
      .update({ owner_profile_id: null })
      .eq('owner_profile_id', userId)
    if (clearOwnerError) return json({ error: clearOwnerError.message }, { status: 500 })

    if (coachKey) {
      const { error: clearSelectedError } = await supabaseAdmin!
        .from('coach_public_profiles')
        .update({ owner_profile_id: null })
        .eq('coach_key', coachKey)
      if (clearSelectedError) return json({ error: clearSelectedError.message }, { status: 500 })

      const { data: linked, error: linkError } = await supabaseAdmin!
        .from('coach_public_profiles')
        .update({ owner_profile_id: userId })
        .eq('coach_key', coachKey)
        .select('coach_key')
        .single()
      if (linkError || !linked) return json({ error: linkError?.message || '找不到要連結的公開教練資料。' }, { status: 404 })
    }

    return json({ message: coachKey ? '教練帳號與公開資料已連結。' : '已解除公開教練資料連結。' })
  }

  if (body.action === 'resolve_attendance_anomaly') {
    const attendanceId = cleanText(body.attendanceId)
    const outcome = cleanText(body.outcome)
    const resolutionNote = cleanText(body.resolutionNote).slice(0, 1000)
    if (!attendanceId || !['supplement_paid', 'waived', 'reopen'].includes(outcome)) {
      return json({ error: '點名異常處理資料無效。' }, { status: 400 })
    }

    const { data: attendance, error: attendanceError } = await supabaseAdmin!
      .from('course_attendance_records')
      .select('id, enrollment_id, session_date, status')
      .eq('id', attendanceId)
      .single()
    if (attendanceError || !attendance) {
      return json({ error: attendanceError?.message || '找不到這筆點名資料。' }, { status: 404 })
    }

    const { data: enrollment, error: enrollmentError } = await supabaseAdmin!
      .from('signup_leads')
      .select('id, billing_start_session_date')
      .eq('id', attendance.enrollment_id)
      .eq('source', 'course_payment')
      .single()
    if (enrollmentError || !enrollment) {
      return json({ error: enrollmentError?.message || '找不到這筆課程報名。' }, { status: 404 })
    }
    if (attendance.status !== 'present' || !enrollment.billing_start_session_date || attendance.session_date >= enrollment.billing_start_session_date) {
      return json({ error: '這筆點名目前不構成計費起點異常。' }, { status: 409 })
    }

    if (outcome === 'reopen') {
      const { error } = await supabaseAdmin!
        .from('course_attendance_resolutions')
        .delete()
        .eq('attendance_id', attendanceId)
      if (error) return json({ error: error.message }, { status: 500 })
      return json({ message: '已重新開啟這筆計費異常。' })
    }

    const now = new Date().toISOString()
    const { error } = await supabaseAdmin!
      .from('course_attendance_resolutions')
      .upsert({
        attendance_id: attendanceId,
        enrollment_id: attendance.enrollment_id,
        outcome,
        note: resolutionNote,
        resolved_by: auth.user.id,
        resolved_at: now,
        updated_at: now,
      }, { onConflict: 'attendance_id' })
    if (error) return json({ error: error.message }, { status: 500 })

    return json({ message: outcome === 'supplement_paid' ? '已記錄補繳完成。' : '已記錄本次免除補繳。' })
  }

  if (body.action === 'delete_order') {
    const orderId = cleanText(body.orderId)
    const orderKind = cleanText(body.orderKind)

    if (!orderId || !['course', 'shop'].includes(orderKind)) {
      return json({ error: '訂單資料不完整。' }, { status: 400 })
    }

    if (orderKind === 'shop') {
      const { data: deleted, error } = await supabaseAdmin!.rpc('delete_shop_order_with_inventory', {
        p_order_id: orderId,
      })

      if (error) {
        const approved = /approved|核准/i.test(error.message)
        return json(
          { error: approved ? '已核准的商城訂單不能刪除。' : error.message || '刪除商城訂單失敗。' },
          { status: approved ? 409 : 500 }
        )
      }
      if (deleted !== true) {
        return json({ error: '找不到商城訂單。' }, { status: 404 })
      }

      return json({ message: '商城訂單已刪除；如有預留庫存，系統已自動歸還。' })
    }

    const { data: currentOrder, error: currentOrderError } = await supabaseAdmin!
      .from('signup_leads')
      .select('id, status')
      .eq('id', orderId)
      .eq('source', 'course_payment')
      .maybeSingle()

    if (currentOrderError) {
      return json({ error: currentOrderError.message }, { status: 500 })
    }
    if (!currentOrder) {
      return json({ error: '找不到課程報名訂單。' }, { status: 404 })
    }
    if (currentOrder.status === 'approved') {
      return json({ error: '已核准的課程報名不能刪除。' }, { status: 409 })
    }

    const { error } = await supabaseAdmin!
      .from('signup_leads')
      .delete()
      .eq('id', orderId)
      .eq('source', 'course_payment')

    if (error) {
      return json({ error: error.message || '刪除課程報名失敗。' }, { status: 500 })
    }

    return json({ message: '未完成的課程報名記錄已刪除。' })
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

    const courseReviewResult = status === 'approved'
      ? await supabaseAdmin!.rpc('approve_course_enrollment', {
          p_lead_id: orderId,
          p_review_note: finalReviewNote,
        })
      : await supabaseAdmin!
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

    const order = courseReviewResult.data as SignupLeadRow | null
    const error = courseReviewResult.error

    if (error || !order) {
      const capacityReached = /course capacity reached/i.test(error?.message ?? '')
      return json(
        { error: capacityReached ? '這個班級已達目前設定的名額上限，不能再核准新的付款。' : error?.message || '訂單更新失敗。' },
        { status: capacityReached ? 409 : 500 }
      )
    }

    let emailMessage = ''
    if (status === 'approved' && order.email) {
      await awardCourseEnrollmentAchievement({
        email: order.email,
        courseName: order.preferred_course,
        awardedBy: auth.adminProfile.id,
      })
      emailMessage = await sendCourseEnrollmentApprovedEmail({
        to: order.email,
        studentName: order.name,
        courseName: order.preferred_course,
      })
    }

    return json({ order, message: emailMessage || finalReviewNote })
  }

  if (body.action === 'delete_product') {
    const productId = cleanText(body.productId)
    if (!productId) {
      return json({ error: '缺少商品 ID。' }, { status: 400 })
    }

    const { data: currentProduct, error: currentProductError } = await supabaseAdmin!
      .from('shop_products')
      .select('id, name')
      .eq('id', productId)
      .is('deleted_at', null)
      .maybeSingle()

    if (currentProductError) {
      return json({ error: currentProductError.message || '讀取商品失敗。' }, { status: 500 })
    }
    if (!currentProduct) {
      return json({ error: '找不到商品，或商品已經刪除。' }, { status: 404 })
    }

    const { data: deletedProduct, error } = await supabaseAdmin!
      .from('shop_products')
      .update({
        active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: auth.adminProfile.id,
      })
      .eq('id', productId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error) {
      return json({ error: error.message || '刪除商品失敗。' }, { status: 500 })
    }
    if (!deletedProduct) {
      return json({ error: '商品已被其他管理員刪除，請重新整理。' }, { status: 409 })
    }

    return json({
      product: deletedProduct,
      message: `商品「${currentProduct.name}」已刪除；既有訂單記錄與刪除紀錄仍會保留。`,
    })
  }

  if (body.action === 'update_product') {
    const productId = cleanText(body.productId)
    const name = cleanText(body.name).slice(0, 180)
    const category = cleanText(body.category).slice(0, 100)
    const image = cleanText(body.image)
    const video = cleanText(body.video)
    const stockQuantity = Number(body.stockQuantity)
    const price = Number(body.price)
    const active = body.active === true
    const summary = cleanText(body.summary).slice(0, 500)
    const description = cleanText(body.description).slice(0, 5000)
    const externalUrl = cleanText(body.externalUrl)
    const rawGallery = Array.isArray(body.gallery) ? body.gallery : []
    const gallery = cleanGallery(rawGallery)
    const specifications = cleanSpecifications(body.specifications)
    const rawVariants = Array.isArray(body.variants) ? body.variants : []
    const variants = cleanProductVariants(rawVariants)

    if (!productId || !name || !category || !image) {
      return json({ error: '請完整填寫商品名稱、分類與主圖。' }, { status: 400 })
    }
    if (!isSafePublicUrl(image) || !isSafeProductMedia(image)) {
      return json({ error: '商品圖片網址無效。' }, { status: 400 })
    }
    if (video && (!isSafePublicUrl(video) || !isSafeProductMedia(video))) {
      return json({ error: '商品影片網址無效。' }, { status: 400 })
    }
    if (gallery.length !== rawGallery.length) {
      return json({ error: '商品詳情圖片網址無效。' }, { status: 400 })
    }
    if (externalUrl && !isSafePublicUrl(externalUrl)) {
      return json({ error: '商品官方連結網址無效。' }, { status: 400 })
    }
    if (variants.length !== rawVariants.length || rawVariants.length > 20) {
      return json({ error: '請完整填寫每一個商品款式、款式主圖與有效的詳情圖片。' }, { status: 400 })
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return json({ error: '庫存數量必須是 0 或正整數。' }, { status: 400 })
    }

    if (!Number.isInteger(price) || price < 0 || price > 10_000_000) {
      return json({ error: '商品售價必須是有效的新台幣整數金額。' }, { status: 400 })
    }

    const { data: product, error } = await supabaseAdmin!
      .from('shop_products')
      .update({
        name,
        category,
        stock_quantity: stockQuantity,
        price,
        price_label: price > 0 ? `NT$${Math.round(price / 100)}` : '洽詢售價',
        image,
        video,
        tags: commaSeparated(body.tags),
        summary,
        description,
        gallery,
        highlights: lineSeparated(body.highlights),
        specifications,
        usage_notes: lineSeparated(body.usageNotes),
        external_url: externalUrl,
        sizes: commaSeparated(body.sizes),
        variants,
        active,
      })
      .eq('id', productId)
      .is('deleted_at', null)
      .select('*')
      .single()

    if (error || !product) {
      return json({ error: error?.message || '更新商品失敗。' }, { status: 500 })
    }

    return json({ product, message: '商品內容、圖片、影片、售價與庫存已更新。' })
  }

  if (body.action === 'create_product') {
    const name = cleanText(body.name).slice(0, 180)
    const category = cleanText(body.category).slice(0, 100)
    const image = cleanText(body.image)
    const video = cleanText(body.video)
    const stockQuantity = Number(body.stockQuantity)
    const price = Number(body.price)
    const active = body.active === true
    const summary = cleanText(body.summary).slice(0, 500)
    const description = cleanText(body.description).slice(0, 5000)
    const externalUrl = cleanText(body.externalUrl)
    const rawGallery = Array.isArray(body.gallery) ? body.gallery : []
    const gallery = cleanGallery(rawGallery)
    const specifications = cleanSpecifications(body.specifications)
    const rawVariants = Array.isArray(body.variants) ? body.variants : []
    const variants = cleanProductVariants(rawVariants)

    if (!name || !category || !image) {
      return json({ error: '請填寫商品名稱、分類並上傳主圖。' }, { status: 400 })
    }
    if (!isSafePublicUrl(image) || !isSafeProductMedia(image)) {
      return json({ error: '商品圖片網址無效。' }, { status: 400 })
    }
    if (video && (!isSafePublicUrl(video) || !isSafeProductMedia(video))) {
      return json({ error: '商品影片網址無效。' }, { status: 400 })
    }
    if (gallery.length !== rawGallery.length) {
      return json({ error: '商品詳情圖片網址無效。' }, { status: 400 })
    }
    if (variants.length !== rawVariants.length || rawVariants.length > 20) {
      return json({ error: '請完整填寫每一個商品款式、款式主圖與有效的詳情圖片。' }, { status: 400 })
    }
    if (externalUrl && !isSafePublicUrl(externalUrl)) {
      return json({ error: '商品官方連結網址無效。' }, { status: 400 })
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 1_000_000) {
      return json({ error: '庫存數量必須是有效整數。' }, { status: 400 })
    }
    if (!Number.isInteger(price) || price < 0 || price > 10_000_000) {
      return json({ error: '商品售價必須是有效的新台幣整數金額。' }, { status: 400 })
    }

    const { data: product, error } = await supabaseAdmin!
      .from('shop_products')
      .insert({
        id: `product-${randomUUID()}`,
        name,
        category,
        price,
        price_label: price > 0 ? `NT$${Math.round(price / 100)}` : '洽詢售價',
        image,
        video,
        rating: 5,
        reviews: 0,
        tags: commaSeparated(body.tags),
        summary,
        description,
        gallery,
        highlights: lineSeparated(body.highlights),
        specifications,
        usage_notes: lineSeparated(body.usageNotes),
        external_url: externalUrl,
        variants,
        sizes: commaSeparated(body.sizes),
        stock_quantity: stockQuantity,
        active,
      })
      .select('*')
      .single()

    if (error || !product) {
      return json({ error: error?.message || '新增商品失敗。' }, { status: 500 })
    }

    return json({ product, message: '商品已建立並加入商城管理。' })
  }

  if (body.action === 'save_site_content') {
    const section = cleanText(body.section)
    let value: unknown

    if (section === 'hero_slides') {
      const normalized = normalizeHeroSlides(body.value)
      if (!Array.isArray(body.value) || normalized.length !== body.value.length) {
        return json({ error: '輪播圖片資料不完整，請重新選擇圖片。' }, { status: 400 })
      }
      value = normalized
    } else if (section === 'home_activities') {
      const normalized = normalizeActivities(body.value)
      if (!Array.isArray(body.value) || normalized.length !== body.value.length) {
        return json({ error: '請完整填寫每一則活動的名稱、說明、按鈕文字與連結。' }, { status: 400 })
      }
      value = normalized
    } else if (section === 'seasonal_update') {
      const normalized = normalizeSeasonalUpdate(body.value)
      if (normalized.active && (!normalized.title || !normalized.summary)) {
        return json({ error: '顯示季度資訊前，請先填寫標題與摘要。' }, { status: 400 })
      }
      value = normalized
    } else if (section === 'course_overrides') {
      const validSlugs = new Set(allCourses.map((course) => course.slug))
      value = Object.fromEntries(
        Object.entries(normalizeCourseOverrides(body.value)).filter(([slug]) => validSlugs.has(slug))
      )
    } else if (section === 'brand_content') {
      value = normalizeBrandContent(body.value)
    } else if (section === 'home_content') {
      value = normalizeHomeContent(body.value)
    } else if (section === 'about_content') {
      value = normalizeAboutContent(body.value)
    } else if (section === 'testimonials_content') {
      value = normalizeTestimonialsContent(body.value)
    } else if (section === 'page_media') {
      value = normalizePageMedia(body.value)
    } else {
      return json({ error: '網站內容區塊無效。' }, { status: 400 })
    }

    const { data: content, error } = await supabaseAdmin!
      .from('site_content')
      .upsert({ key: section, value, updated_by: auth.user.id }, { onConflict: 'key' })
      .select('key, value, updated_at')
      .single()

    if (error || !content) {
      return json({ error: error?.message || '網站內容儲存失敗。' }, { status: 500 })
    }

    const { data: contentRows, error: contentRowsError } = await supabaseAdmin!
      .from('site_content')
      .select('key, value')
      .in('key', ['hero_slides', 'home_activities', 'seasonal_update', 'course_overrides', 'brand_content', 'home_content', 'about_content', 'testimonials_content', 'page_media'])

    if (contentRowsError) {
      return json({ error: contentRowsError.message || '內容已儲存，但重新讀取失敗。' }, { status: 500 })
    }

    const { data: coachRows, error: coachRowsError } = await supabaseAdmin!
      .from('coach_public_profiles')
      .select('*')
    if (coachRowsError) {
      return json({ error: coachRowsError.message || '內容已儲存，但教練資料重新讀取失敗。' }, { status: 500 })
    }

    const seasons = await getCourseSeasons()
    const publicCoachProfiles = coachPublicProfilesFromRows(coachRows as CoachPublicProfileRow[] | null)
    const siteContent = {
      ...applyCourseSeasonToContent(
        siteContentFromRows(contentRows),
        seasons.find((season) => season.isCurrent) ?? null
      ),
      coachProfiles: publicCoachProfiles,
    }
    const courses = applyCourseOverrides(siteContent.courseOverrides, { includeInactive: true, coachProfiles: publicCoachProfiles }).map((course) => ({
      slug: course.slug,
      name: course.name,
      weekday: course.weekday,
      location: course.location,
      period: course.period,
      classTime: course.classTime,
      meetingPoint: course.meetingPoint,
      feeNote: course.feeNote,
      targetAudience: course.targetAudience,
      focus: course.focus,
      signupUrl: course.signupUrl || '',
      coachKeys: siteContent.courseOverrides[course.slug]?.coachKeys
        ?? getDefaultCourseCoachKeys(course.slug),
    }))

    return json({ content, siteContent, courses, message: '網站內容已儲存並同步發布。' })
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
