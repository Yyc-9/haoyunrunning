export type ShopInvoice = { invoiceDelivery: string; invoiceDetail: string; taxInvoiceInfo: string }
export const shopInvoiceMethods = { carrier: '手機條碼載具', email: '電子信箱' } as const
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

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
