export const feedbackCategories = ['網站使用問題', '報名與繳費', '課程與教練', '意見建議'] as const
export const feedbackStatuses = ['待處理', '處理中', '已解決'] as const
export type FeedbackCategory = typeof feedbackCategories[number]
export type FeedbackStatus = typeof feedbackStatuses[number]
export type FeedbackAttachment = { name: string; path: string; url?: string }
export type SiteFeedback = {
  id: string; category: FeedbackCategory; description: string; related: string
  source: string; device: string; attachments: FeedbackAttachment[]
  status: FeedbackStatus; read_at: string | null; note: string
  created_at: string; updated_at: string
}
export type FeedbackSummary = { pending: number; inProgress: number; resolved: number; unread: number }
export const FEEDBACK_FILE_LIMIT = 1024 * 1024
export const FEEDBACK_BODY_LIMIT = 3 * FEEDBACK_FILE_LIMIT + 64 * 1024
export function isFeedbackId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
export function validateFeedback(value: { category: unknown; description: unknown; related: unknown }) {
  if (!feedbackCategories.includes(value.category as FeedbackCategory)) return '請選擇回報類型。'
  if (typeof value.description !== 'string' || value.description.trim().length < 5 || value.description.length > 2000) return '請填寫 5 至 2000 字的問題描述。'
  if (typeof value.related !== 'string' || value.related.length > 100) return '相關班級或課次最多 100 字。'
  return null
}
export function isFeedbackImage(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0]===255 && bytes[1]===216 && bytes[2]===255
  if (type === 'image/png') return [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP'
  return false
}

