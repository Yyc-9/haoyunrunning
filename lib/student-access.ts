import { supabaseAdmin } from '@/lib/supabase-server'
import { isPaymentOrderStatus, type PaymentOrderStatus } from '@/lib/payment'

export type StudentAccessState = 'approved' | 'pending_transfer' | 'pending_review' | 'rejected' | 'legacy_open'

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

export async function getStudentAccessState(userId: string, email?: string | null): Promise<StudentAccessState> {
  if (!supabaseAdmin) {
    return 'legacy_open'
  }

  const normalizedEmail = email?.trim().toLowerCase()
  const records: StatusRecord[] = []

  if (normalizedEmail) {
    const { data: paymentLeads, error: leadError } = await supabaseAdmin
      .from('signup_leads')
      .select('status, created_at')
      .eq('source', 'course_payment')
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(5)

    if (leadError) throw leadError
    records.push(...(paymentLeads ?? []))
  }

  let shopOrderQuery = supabaseAdmin
    .from('shop_orders')
    .select('status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (normalizedEmail) {
    shopOrderQuery = shopOrderQuery.or(`user_id.eq.${userId},email.ilike.${normalizedEmail}`)
  } else {
    shopOrderQuery = shopOrderQuery.eq('user_id', userId)
  }

  const { data: shopOrders, error: orderError } = await shopOrderQuery
  if (orderError) throw orderError
  records.push(...(shopOrders ?? []))

  const latest = newestStatus(records)
  const status = normalizeStatus(latest?.status)

  if (!status) return 'legacy_open'
  return status
}

export function canAccessTrainingContent(state: StudentAccessState) {
  return state === 'approved' || state === 'legacy_open'
}
