/** Only registration-time billing fields belong in the finance roster. */
export function financeRegistrationDetails(payload: unknown) {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown> : {}
  const text = (key: string) => typeof record[key] === 'string' ? record[key].trim() : ''
  return {
    invoiceDelivery: text('invoiceDelivery'),
    invoiceDetail: text('invoiceDetail'),
    taxInvoiceInfo: text('taxInvoiceInfo'),
  }
}

export function validateFinanceReceipt(input: { enrollmentId?: unknown; reason?: unknown; confirmReceipt?: unknown }) {
  if (typeof input.enrollmentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.enrollmentId)) return '請選擇有效的報名記錄。'
  if (input.confirmReceipt !== true) return '請先核實款項已實際入帳。'
  if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.trim().length > 1000) return '請填寫 1 至 1000 字的核對依據。'
  return null
}
