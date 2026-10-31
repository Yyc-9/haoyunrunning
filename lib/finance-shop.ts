import type { ShopInvoiceDisplay } from './shop-invoice'

export const shopFinanceStates = {
  pending_review: '待核對', approved: '已入帳', rejected: '待補資料', pending_transfer: '未回報',
} as const
export type ShopFinanceStatus = keyof typeof shopFinanceStates
export type FinanceShopOrder = {
  id: string; order_number: string; customer_name: string; email: string; contact: string;
  total_amount: number; status: ShopFinanceStatus; transfer_last_five: string;
  created_at: string; updated_at: string; payment_submitted_at: string | null;
  payment_account_label: string; payment_method: string; reviewed_at: string | null; review_note: string | null;
  pickup_class_name: string; pickup_status: string; inventory_reserved: boolean;
  invoice_delivery?: 'carrier' | 'email' | null; invoice_detail?: string | null; tax_invoice_info?: string | null;
  invoice?: ShopInvoiceDisplay;
  shop_order_items: Array<{ id: string; name: string; quantity: number; price: number; size: string; variant_id: string; is_preorder: boolean; selected_specifications: Array<{ label?: string; value?: string }> }>;
}
export type FinanceShopAudit = { id: string; actor_id: string | null; action: 'approved' | 'rejected' | 'note'; reason: string; created_at: string }
export function financeShopMonthRange(month: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) return null
  const [year, m] = month.split('-').map(Number)
  return { from: new Date(Date.UTC(year, m - 1, 1) - 8 * 3600000).toISOString(), to: new Date(Date.UTC(year, m, 1) - 8 * 3600000).toISOString() }
}
export function validateShopReview(body: Record<string, unknown>) {
  if (typeof body.orderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.orderId)) return '缺少有效訂單 ID。'
  if (body.status !== 'approved' && body.status !== 'rejected' && body.status !== 'note') return '無效的核帳狀態。'
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 1000) return '請填寫 1 至 1000 字的核對依據或補充原因。'
  if (body.status === 'approved' && body.confirmReceipt !== true) return '請先核實款項實際入帳並勾選確認。'
  if (typeof body.updatedAt !== 'string' || !Number.isFinite(Date.parse(body.updatedAt))) return '訂單版本無效，請重新整理。'
  return ''
}
