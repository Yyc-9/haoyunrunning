import { NextRequest } from 'next/server'
import { notificationAuth, notificationFailure, notificationJson } from '@/lib/enrollment-notifications-server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { isUuid } from '@/lib/enrollment-notification-policy'

export async function GET(request: NextRequest) {
  try {
    const auth = await notificationAuth(request)
    if ('response' in auth) return auth.response
    const { data, error } = await supabaseAdmin!.rpc('enrollment_notification_feed', { p_user_id: auth.user.id, p_email: auth.email, p_staff: auth.staff })
    if (error) throw error
    return notificationJson({ ...data, staff: auth.staff })
  } catch (error) { return notificationFailure(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await notificationAuth(request)
    if ('response' in auth) return auth.response
    const body = await request.json().catch(() => ({}))
    if (!Array.isArray(body.ids) || body.ids.length > 100 || !body.ids.every(isUuid)) return notificationJson({ error: '通知清單格式不正確。' }, 400)
    const { error } = await supabaseAdmin!.rpc('read_enrollment_notifications', { p_user_id: auth.user.id, p_email: auth.email, p_staff: auth.staff, p_ids: body.ids })
    if (error) throw error
    return notificationJson({ success: true })
  } catch (error) { return notificationFailure(error) }
}
