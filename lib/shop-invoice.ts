export type ShopInvoice = { invoiceDelivery: string; invoiceDetail: string; taxInvoiceInfo: string }
export const shopInvoiceMethods = { carrier: '手機條碼載具', email: '電子信箱' } as const
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export type ShopInvoiceDisplay = ShopInvoice & { source: 'order' | 'registration' | 'missing'; referenceDate: string | null }
type InvoiceOrder = { email?: string | null; created_at: string; invoice_delivery?: string | null; invoice_detail?: string | null; tax_invoice_info?: string | null }
type InvoiceRegistration = { email: string; created_at: string; source: string; registration_status?: string | null; status?: string; payload: unknown }

/** Reference only: never merge current registration data into an order snapshot. */
export function shopInvoiceDisplay(order: InvoiceOrder, registrations: readonly InvoiceRegistration[] = []): ShopInvoiceDisplay {
  if (order.invoice_delivery || order.invoice_detail || order.tax_invoice_info) {
    return { ...readShopInvoice({ invoiceDelivery: order.invoice_delivery, invoiceDetail: order.invoice_detail, taxInvoiceInfo: order.tax_invoice_info }), source: 'order', referenceDate: null }
  }
  const email = text(order.email).toLowerCase()
  const registration = registrations.filter(row => email && text(row.email).toLowerCase() === email
    && row.source === 'course_payment'
    && (row.registration_status === 'active' || (!row.registration_status && row.status !== 'rejected'))
    && Date.parse(row.created_at) <= Date.parse(order.created_at))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]
  const invoice = readShopInvoice(registration?.payload)
  if (registration && (invoice.invoiceDetail || invoice.taxInvoiceInfo)) return { ...invoice, source: 'registration', referenceDate: registration.created_at }
  return { invoiceDelivery: '', invoiceDetail: '', taxInvoiceInfo: '', source: 'missing', referenceDate: null }
}

export function shopInvoiceDetails(invoice: ShopInvoiceDisplay) {
  return [
    { label: '發票方式', value: shopInvoiceMethods[invoice.invoiceDelivery as keyof typeof shopInvoiceMethods] || '未提供' },
    { label: '載具號碼／發票信箱', value: invoice.invoiceDetail || '未提供，請向學員確認' },
    { label: '統編與抬頭', value: invoice.taxInvoiceInfo || '未提供' },
    { label: '發票資料來源', value: invoice.source === 'order' ? '本次訂單留存資料' : invoice.source === 'registration' ? '下單前同信箱的報名資料，僅供參考，請財務再次核對' : '訂單未留存，亦無可參考的報名資料' },
  ]
}

export function readShopInvoice(value: unknown): ShopInvoice {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const method = text(row.invoiceDelivery)
  const invoiceDelivery = method === 'carrier' || method.includes('手機') ? 'carrier' : method === 'email' || method.includes('信箱') ? 'email' : ''
  const detail = text(row.invoiceDetail)
  return { invoiceDelivery, invoiceDetail: invoiceDelivery === 'carrier' ? detail.toUpperCase() : detail, taxInvoiceInfo: text(row.taxInvoiceInfo) }
}

export function shopInvoiceError(invoice: ShopInvoice) {
  if (!Object.hasOwn(shopInvoiceMethods, invoice.invoiceDelivery)) return '請選擇發票寄送方式。'
  // Ministry of Finance: slash followed by seven carrier characters.
  if (invoice.invoiceDelivery === 'carrier' && !/^\/[A-Z0-9+.-]{7}$/.test(invoice.invoiceDetail)) return '請確認手機條碼：以 / 開頭，後接 7 碼大寫英文、數字或符號（+ - .）。'
  if (invoice.invoiceDelivery === 'email' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoice.invoiceDetail) || invoice.invoiceDetail.length > 320)) return '請填寫有效的發票電子信箱。'
  if (invoice.taxInvoiceInfo.length > 300) return '統編與抬頭請勿超過 300 字。'
  return ''
}
