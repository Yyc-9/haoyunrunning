export const supplementReasons = {
  missing_info: '資料不完整', unreported: '尚未回報匯款', amount_mismatch: '金額不符', other: '其他',
} as const
export type SupplementReason = keyof typeof supplementReasons
export const supplementTemplates: Record<SupplementReason, string> = {
  missing_info: '目前無法依已提供的資料核對款項，請確認匯款日期與帳號後五碼，並補充實際匯款金額。',
  unreported: '目前尚未收到匯款回報。若已完成匯款，請補填匯款日期與帳號後五碼；若尚未匯款，請完成後回報。',
  amount_mismatch: '目前查到的入帳金額與應繳金額不同，請補充實際匯款金額與日期，讓我們再次核對。',
  other: '',
}
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
export function validateSupplementMessage(reason: unknown, message: unknown, internal: unknown) {
  if (typeof reason !== 'string' || !Object.hasOwn(supplementReasons, reason)) return '請選擇處理原因。'
  if (typeof message !== 'string' || !message.trim() || message.length > 1000) return '請填寫 1 至 1000 字的學生補充說明。'
  if (typeof internal !== 'string' || internal.length > 1000) return '內部備註不可超過 1000 字。'
  return null
}
export function notificationHref(enrollmentId: string, staff: boolean) {
  return `/notifications?enrollment=${encodeURIComponent(enrollmentId)}${staff ? '&view=staff' : ''}`
}
export type EnrollmentNotification = {
  id: string; enrollment_id: string; audience: 'staff' | 'student'; kind: string; title: string; message: string; created_at: string; read_at: string | null
}
export type NotificationFeed = { items: EnrollmentNotification[]; unreadCount: number; staff: boolean }
export type Followup = {
  id: string; reason: SupplementReason; student_message: string; internal_note?: string; student_reply: string | null;
  created_at: string; responded_at: string | null; email_status?: string; email_error?: string | null
}
export type NotificationEnrollment = {
  id: string; name: string; course_slug: string; preferred_course: string; status: string; amount_text: string; season_id: string | null; season_name: string;
  transfer_last_five: string; transfer_date: string | null; student_review_message: string | null;
  payment_submitted_at: string | null; created_at: string; notes: string; archived: boolean
}
