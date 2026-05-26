import { supabaseAdmin } from '@/lib/supabase-server'
import { isPaymentOrderStatus, type PaymentOrderStatus } from '@/lib/payment'

export type StudentAccessState = 'approved' | 'pending_transfer' | 'pending_review' | 'rejected' | 'legacy_open'

export type StudentAccessSummary = {
  state: StudentAccessState
  coachBound: boolean
  coachName: string
}

type StatusRecord = {
  status: string | null
  created_at: string | null
}

function normalizeStatus(value: string | null | undefined): PaymentOrderStatus | null {
  if (!value || !isPaymentOrderStatus(value)) return null
  return value
}

function newestStatus(records: StatusRecord[]) {
  return records
    .filter((record) => normalizeStatus(record.status))
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0]
}

function isOptionalSchemaError(error: { code?: string; message?: string } | null) {
  if (!error) return false

  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    /schema cache|does not exist|column .* does not exist/i.test(error.message ?? '')
  )
}

export async function getStudentAccessState(userId: string, email?: string | null): Promise<StudentAccessState> {
  const summary = await getStudentAccessSummary(userId, email)
  return summary.state
}

export async function getStudentAccessSummary(userId: string, email?: string | null): Promise<StudentAccessSummary> {
  if (!supabaseAdmin) {
    return { state: 'legacy_open', coachBound: false, coachName: '' }
  }

  const normalizedEmail = email?.trim().toLowerCase()
  const records: StatusRecord[] = []
  let coachBound = false
  let coachName = ''

  if (normalizedEmail) {
    const { data: paymentLeads, error: leadError } = await supabaseAdmin
      .from('signup_leads')
      .select('status, created_at')
      .eq('source', 'course_payment')
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(5)

    if (leadError && !isOptionalSchemaError(leadError)) throw leadError
    records.push(...(paymentLeads ?? []))
  }

  const { data: userOrders, error: userOrderError } = await supabaseAdmin
    .from('shop_orders')
    .select('status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (userOrderError && !isOptionalSchemaError(userOrderError)) throw userOrderError
  records.push(...(userOrders ?? []))

  if (normalizedEmail) {
    const { data: emailOrders, error: emailOrderError } = await supabaseAdmin
      .from('shop_orders')
      .select('status, created_at')
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(5)

    if (emailOrderError && !isOptionalSchemaError(emailOrderError)) throw emailOrderError
    records.push(...(emailOrders ?? []))
  }

  const { data: binding, error: bindingError } = await supabaseAdmin
    .from('coach_students')
    .select('coach_id')
    .eq('student_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (bindingError && !isOptionalSchemaError(bindingError)) throw bindingError

  if (binding?.coach_id) {
    coachBound = true

    const { data: coach, error: coachError } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', binding.coach_id)
      .maybeSingle()

    if (coachError && !isOptionalSchemaError(coachError)) throw coachError
    coachName = coach?.name || coach?.email || ''
  }

  const latest = newestStatus(records)
  const status = normalizeStatus(latest?.status)

  return {
    state: status ?? 'legacy_open',
    coachBound,
    coachName,
  }
}

export function canAccessTrainingContent(state: StudentAccessState) {
  return state === 'approved' || state === 'legacy_open'
}
