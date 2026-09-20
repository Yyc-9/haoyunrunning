import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getAdminProfile } from '@/lib/admin-auth'
import { isFinanceViewer } from '@/lib/finance-viewers'
import { authenticateFinanceRequest } from '@/lib/finance-access'
import { getIsolatedTestAccount } from '@/lib/test-account'
import { notificationHref } from '@/lib/enrollment-notification-policy'

export function notificationJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization, X-Finance-Authorization' } })
}

export async function notificationAuth(request: NextRequest, requireStaff = false) {
  if (!supabaseAdmin) return { response: notificationJson({ error: '通知服務尚未設定。' }, 503) }
  const user = await getAuthedUser(request.headers.get('authorization')).catch(() => null)
  if (!user?.email || !user.email_confirmed_at) return { response: notificationJson({ error: '請先登入已驗證的帳號。' }, 401) }
  if (await getIsolatedTestAccount(user)) return { response: notificationJson({ error: '隔離測試帳號不使用正式報名通知。' }, 403) }
  const admin = await getAdminProfile(user)
  const finance = isFinanceViewer(user.email)
  const staff = Boolean(admin || finance)
  if (requireStaff && !staff) return { response: notificationJson({ error: '目前帳號沒有報名核對權限。' }, 403) }
  if (requireStaff && !admin) {
    const access = await authenticateFinanceRequest(request)
    if ('response' in access) return access
  }
  return { user, staff, admin: Boolean(admin), email: user.email.trim().toLowerCase() }
}

export function notificationFailure(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const expected = ['enrollment_changed','enrollment_not_writable','season_not_writable','supplement_already_requested','request_id_conflict']
  if (expected.some(code => message.includes(code))) return notificationJson({ error: '這筆報名已更新、已完成或季度已封存，請重新整理後再試。' }, 409)
  if (message.includes('enrollment_not_found')) return notificationJson({ error: '找不到可存取的報名。' }, 404)
  if (message.includes('invalid_') || ['22007','22008'].includes(code)) return notificationJson({ error: '請檢查匯款日期、後五碼與補充說明。' }, 400)
  console.error('[enrollment-notifications] Request failed', { code: typeof error === 'object' && error && 'code' in error ? error.code : 'unknown' })
  return notificationJson({ error: '通知服務暫時無法使用，請稍後重新整理。' }, 503)
}

export async function sendFollowupEmail(requestId: string) {
  const db = supabaseAdmin!
  const { data: followup, error } = await db.from('enrollment_followups').select('id,enrollment_id,student_message,email_status,responded_at').eq('id', requestId).single()
  if (error) throw error
  if (followup.email_status === 'sent' || followup.responded_at) return
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ENROLLMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    const result = await db.from('enrollment_followups').update({ email_status: 'skipped', email_error: '郵件服務尚未設定；站內通知已保存。' }).eq('id', requestId).in('email_status', ['pending','failed','skipped'])
    if (result.error) throw result.error
    return
  }
  const { data: lead, error: leadError } = await db.from('signup_leads').select('email,preferred_course,status').eq('id', followup.enrollment_id).single()
  if (leadError) throw leadError
  if (lead.status !== 'rejected') return
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nurturerunningteam.com').replace(/\/$/, '')
  const link = origin + notificationHref(followup.enrollment_id, false)
  const payload = { from, to: lead.email, subject: '好運跑班｜請補充報名資料',
    text: `你好：\n\n你的 ${lead.preferred_course || '課程'} 報名需要補充資料：\n\n${followup.student_message}\n\n請登入原報名查看並補充，不需要重新報名：\n${link}\n\n好運跑班` }
  const { data: claims, error: claimError } = await db.rpc('claim_enrollment_followup_email', { p_id: requestId, p_recipient: lead.email, p_payload: payload })
  if (claimError) throw claimError
  const claim = claims?.[0]
  if (!claim) return
  let status = 'failed'
  let failure: string | null = '郵件發送未確認；站內通知仍有效，可安全重試。'
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `enrollment-followup/${requestId}` }, body: JSON.stringify(claim.email_payload) })
    if (response.ok) { status = 'sent'; failure = null }
  } catch { /* Keep the persisted idempotency key and immutable payload for retry. */ }
  const result = await db.from('enrollment_followups').update({ email_status: status, email_error: failure })
    .eq('id', requestId).eq('email_status', 'sending').eq('email_attempt_at', claim.email_attempt_at)
  if (result.error) throw result.error
}
