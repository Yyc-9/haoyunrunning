import { supabase } from '@/lib/supabase'

export class NotificationRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'NotificationRequestError' }
}

export async function notificationFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!data.session) throw new NotificationRequestError('請先登入後查看通知。', 401)
  const financeToken = window.sessionStorage.getItem('finance-reconciliation-token')
  const response = await fetch(url, { ...init, cache: 'no-store', headers: {
    Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json',
    ...(financeToken ? { 'X-Finance-Authorization': financeToken } : {}), ...init.headers,
  } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new NotificationRequestError(payload.error || '讀取通知失敗，請稍後重試。', response.status)
  return payload as T
}

export function refreshNotifications() { window.dispatchEvent(new Event('enrollment-notifications-changed')) }
