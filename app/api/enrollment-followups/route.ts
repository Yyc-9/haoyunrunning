import { NextRequest } from 'next/server'
import { notificationAuth, notificationFailure, notificationJson, sendFollowupEmail } from '@/lib/enrollment-notifications-server'
import { isUuid, validateSupplementMessage } from '@/lib/enrollment-notification-policy'
import { supabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    const staff = request.nextUrl.searchParams.get('view') === 'staff'
    const auth = await notificationAuth(request, staff)
    if ('response' in auth) return auth.response
    const id = request.nextUrl.searchParams.get('enrollment')
    if (id && !isUuid(id)) return notificationJson({ error: '報名編號格式不正確。' }, 400)
    const page = Math.floor(Math.max(0, Math.min(10000, Number(request.nextUrl.searchParams.get('page')) || 0)))
    let query = supabaseAdmin!.from('signup_leads').select('id,name,course_slug,preferred_course,status,amount_text,season_id,transfer_last_five,transfer_date,student_review_message,payment_submitted_at,created_at,notes').eq('source', 'course_payment')
    if (!staff) query = query.eq('email', auth.email)
    if (id) query = query.eq('id', id)
    const status = request.nextUrl.searchParams.get('status')
    if (!id && status && status !== 'all') {
      if (!['pending_transfer','pending_review','rejected','approved'].includes(status)) return notificationJson({ error: '報名狀態格式不正確。' }, 400)
      query = query.eq('status', status)
    }
    const { data: rows, error } = await query.order('created_at', { ascending: false }).order('id').range(page * 50, page * 50 + 50)
    if (error) throw error
    const leads = (rows ?? []).slice(0, 50)
    const seasonIds = [...new Set(leads.map(r => r.season_id).filter(Boolean))]
    const { data: seasons, error: seasonError } = seasonIds.length ? await supabaseAdmin!.from('course_seasons').select('id,name,status').in('id', seasonIds) : { data: [], error: null }
    if (seasonError) throw seasonError
    const followups = id ? await supabaseAdmin!.from('enrollment_followups')
      .select(staff ? 'id,reason,student_message,internal_note,student_reply,created_at,responded_at,email_status,email_error' : 'id,reason,student_message,student_reply,created_at,responded_at')
      .eq('enrollment_id', leads[0]?.id ?? '00000000-0000-0000-0000-000000000000').order('created_at', { ascending: false }).limit(30) : { data: [], error: null }
    if (followups.error) throw followups.error
    return notificationJson({ staff, enrollments: leads.map(r => ({ ...r, season_name: seasons?.find(s => s.id === r.season_id)?.name || '未指定季度', archived: !seasons?.some(s => s.id === r.season_id && s.status !== 'archived') })), followups: followups.data, hasMore: (rows?.length ?? 0) > 50 })
  } catch (error) { return notificationFailure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const auth = await notificationAuth(request, true)
    if ('response' in auth) return auth.response
    if (!isUuid(body.requestId)) return notificationJson({ error: '請重新開啟補件表單。' }, 400)
    if (body.action === 'retry_email') {
      await sendFollowupEmail(body.requestId)
      return notificationJson({ message: '已重新檢查郵件寄送狀態。' })
    }
    const invalid = validateSupplementMessage(body.reason, body.message, body.internalNote ?? '')
    if (invalid || !isUuid(body.enrollmentId) || !['pending_transfer','pending_review','rejected'].includes(body.expectedStatus)
      || (body.expectedSubmittedAt !== null && (typeof body.expectedSubmittedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedSubmittedAt))))) {
      return notificationJson({ error: invalid || '報名資料已更新，請重新整理。' }, 400)
    }
    const { data, error } = await supabaseAdmin!.rpc('request_enrollment_supplement', {
      p_id: body.requestId, p_enrollment_id: body.enrollmentId, p_actor_id: auth.user.id, p_reason: body.reason,
      p_message: body.message, p_internal_note: body.internalNote ?? '', p_expected_status: body.expectedStatus, p_expected_submitted_at: body.expectedSubmittedAt,
    })
    if (error) throw error
    try { await sendFollowupEmail(data.id) } catch { return notificationJson({ message: '補件要求與站內通知已保存；郵件狀態尚未確認，請重新整理後重試寄送。' }) }
    return notificationJson({ message: '補件要求與站內通知已保存，請查看下方郵件寄送狀態。' })
  } catch (error) { return notificationFailure(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await notificationAuth(request)
    if ('response' in auth) return auth.response
    const body = await request.json().catch(() => ({}))
    if (!isUuid(body.enrollmentId) || (body.requestId !== null && !isUuid(body.requestId))
      || typeof body.lastFive !== 'string' || !/^\d{5}$/.test(body.lastFive)
      || typeof body.transferDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.transferDate)
      || typeof body.reply !== 'string' || body.reply.length > 1000 || /\d{10,}/.test(body.reply.replace(/\s/g, ''))) {
      return notificationJson({ error: '請填寫有效日期、後五碼與補充說明；勿填完整帳號或身分證號。' }, 400)
    }
    const { error } = await supabaseAdmin!.rpc('submit_enrollment_supplement', {
      p_enrollment_id: body.enrollmentId, p_email: auth.email, p_last_five: body.lastFive, p_transfer_date: body.transferDate,
      p_reply: body.reply, p_request_id: body.requestId,
    })
    if (error) throw error
    return notificationJson({ message: '資料已送出，財務會重新核對。' })
  } catch (error) { return notificationFailure(error) }
}
