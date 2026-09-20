export type PaymentDisplay = { bankName: string; bankCode: string; accountNumber: string; qrCodeUrl: string; useLegacyQr?: boolean }

export const legacyPaymentDisplay: PaymentDisplay = { bankName: '中國信託', bankCode: '822', accountNumber: '0000554540468221', qrCodeUrl: '' }

export function validatePaymentDisplay(value: unknown): PaymentDisplay {
  const input = (value ?? {}) as Record<string, unknown>
  const bankName = typeof input.bankName === 'string' ? input.bankName.trim() : ''
  const bankCode = typeof input.bankCode === 'string' ? input.bankCode.trim() : ''
  const accountNumber = typeof input.accountNumber === 'string' ? input.accountNumber.trim() : ''
  const qrCodeUrl = typeof input.qrCodeUrl === 'string' ? input.qrCodeUrl.trim() : ''
  if (!bankName || bankName.length > 80 || !/^\d{3}$/.test(bankCode) || !/^\d{6,24}$/.test(accountNumber)) throw new Error('請填寫銀行名稱、三位銀行代碼與 6 至 24 位數字帳號。')
  if (qrCodeUrl && (!/^https:\/\//.test(qrCodeUrl) || qrCodeUrl.length > 2048)) throw new Error('二維碼圖片請使用 HTTPS 網址，或留空不顯示。')
  if (qrCodeUrl) {
    const url = new URL(qrCodeUrl)
    if (url.username || url.password) throw new Error('二維碼網址不能包含登入資訊。')
  }
  const useLegacyQr = input.useLegacyQr === true
  if (useLegacyQr && (bankName !== legacyPaymentDisplay.bankName || bankCode !== legacyPaymentDisplay.bankCode || accountNumber !== legacyPaymentDisplay.accountNumber || qrCodeUrl)) throw new Error('銀行資料已變更，請清除舊二維碼並提供新圖片或留空。')
  return { bankName, bankCode, accountNumber, qrCodeUrl, useLegacyQr }
}

export function paymentDisplaySvg(info: PaymentDisplay) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="380" viewBox="0 0 900 380"><rect width="900" height="380" fill="white"/><g fill="#171717" font-family="sans-serif"><text x="40" y="65" font-size="28">好運跑班匯款資料</text><text x="40" y="135" font-size="25">銀行機構：${escape(info.bankName)}</text><text x="40" y="195" font-size="25">銀行代碼：${escape(info.bankCode)}</text><text x="40" y="255" font-size="25">匯款帳號：${escape(info.accountNumber)}</text><text x="40" y="325" font-size="20">匯款時請勿填寫備註欄內容</text></g></svg>`
}
