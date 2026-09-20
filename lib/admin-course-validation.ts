/** Reject invalid input instead of silently replacing it with default prices/dates. */
export function courseBillingInputError(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '請填寫報名計價設定。'
  const source = value as Record<string, unknown>
  if (typeof source.scheduleReady !== 'boolean' || !Array.isArray(source.sessionDates)) return '請填寫實際收費課次日期。'
  for (const date of source.sessionDates) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return '收費日期必須是真實日期，格式為 YYYY-MM-DD；請修正後再儲存。'
  }
  for (const key of ['returningFullPrice', 'newFullPrice', 'returningLateRate', 'referredLateRate', 'standardLateRate']) {
    const number = source[key]
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 0 || number > 1_000_000) return '價格必須是 0 至 1,000,000 之間的整數。'
  }
  for (const [key, max] of [['regularUntilSessionNumber', 20], ['priceLockHours', 168]] as const) {
    const number = source[key]
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1 || number > max) return key === 'regularUntilSessionNumber' ? '全期收費截止堂次必須介於 1 至 20 堂。' : '報價保留時數必須介於 1 至 168 小時。'
  }
  return null
}
