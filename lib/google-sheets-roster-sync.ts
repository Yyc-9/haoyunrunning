import 'server-only'

import { createHash } from 'node:crypto'

export type RosterSheetPayload = {
  name?: unknown
  rows?: unknown
}

export type NormalizedRosterRecord = {
  sheetName: string
  courseSlug: string
  sourceRow: number
  submittedAt: string
  email: string
  identity: 'new' | 'returning' | null
  name: string
  phone: string
  emergencyName: string
  emergencyPhone: string
  lineId: string
  referrer: string
  recentChallenge: string
  recentGoal: string
  injuryHistory: string
  runningStatus: string
  amountText: string
  transferLastFive: string
  invoiceMethod: string
  invoiceTarget: string
  notes: string
  taxId: string
  confirmedName: string
  confirmedAmount: string
  stableKey: string
}

export const q3RosterSheetCourses: Record<string, string> = {
  '週一竹北班': 'zhubei-night-run-monday',
  '週二台北班': 'taipei-pb-tuesday',
  '週二竹市班': 'hsinchu-beginner-tuesday',
  '週三竹市班': 'hsinchu-morning-run-wednesday',
  '週三竹北班': 'zhubei-night-run-wednesday',
  '週三台北班': 'taipei-night-run-wednesday',
  '週四竹市班': 'hsinchu-night-run-thursday',
  '週四竹南班': 'zhunan-beginner-thursday',
  '週六台北班': 'taipei-morning-run-saturday',
}

function cleanText(value: unknown, maxLength = 3000) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim().slice(0, maxLength)
  }
  return ''
}

function normalizeEmail(value: unknown) {
  const email = cleanText(value, 320).toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function findHeaderIndexes(headers: string[], predicate: (header: string, index: number) => boolean) {
  return headers.flatMap((header, index) => predicate(header, index) ? [index] : [])
}

function firstValue(row: unknown[], indexes: number[]) {
  for (const index of indexes) {
    const value = cleanText(row[index])
    if (value) return value
  }
  return ''
}

function findIndex(headers: string[], predicate: (header: string, index: number) => boolean) {
  return headers.findIndex(predicate)
}

function valueAt(row: unknown[], index: number) {
  return index >= 0 ? cleanText(row[index]) : ''
}

function normalizeIdentity(value: string): NormalizedRosterRecord['identity'] {
  if (value.includes('舊生')) return 'returning'
  if (value.includes('新生')) return 'new'
  return null
}

function normalizeTimestamp(value: unknown) {
  const text = cleanText(value, 100)
  if (!text) return ''
  const timestamp = new Date(text)
  return Number.isNaN(timestamp.getTime()) ? text : timestamp.toISOString()
}

function stableKey(submittedAt: string, email: string, name: string) {
  return createHash('sha256')
    .update(`${submittedAt}|${email}|${name.trim()}`)
    .digest('hex')
}

export function normalizeRosterSheets(value: unknown) {
  if (!Array.isArray(value)) return [] as NormalizedRosterRecord[]

  const records: NormalizedRosterRecord[] = []
  for (const rawSheet of value.slice(0, 12)) {
    if (!rawSheet || typeof rawSheet !== 'object') continue
    const sheet = rawSheet as RosterSheetPayload
    const sheetName = cleanText(sheet.name, 100)
    const courseSlug = q3RosterSheetCourses[sheetName]
    if (!courseSlug || !Array.isArray(sheet.rows) || sheet.rows.length < 2) continue

    const rows = sheet.rows.slice(0, 250).map((row) => Array.isArray(row) ? row.slice(0, 60) : [])
    const headers = rows[0].map((header) => cleanText(header, 300))
    const emailIndex = findIndex(headers, (header) => /電子郵件地址|電子信箱|email/i.test(header))
    const identityIndex = findIndex(headers, (header) => /你的身份|請問你是/.test(header))
    const nameIndexes = findHeaderIndexes(headers, (header, index) => index < 28 && /^(學員姓名|你的姓名)$/.test(header))
    const phoneIndex = findIndex(headers, (header, index) => index < 28 && header === '手機電話')
    const emergencyNameIndexes = findHeaderIndexes(headers, (header, index) => index < 28 && header === '緊急聯絡人姓名')
    const emergencyPhoneIndexes = findHeaderIndexes(headers, (header, index) => index < 28 && /緊急聯絡人.*(電話|聯絡電話)/.test(header))
    const lineIndex = findIndex(headers, (header, index) => index < 28 && /LINE ID/i.test(header))
    const referrerIndex = findIndex(headers, (header, index) => index < 28 && header === '推薦人')
    const challengeIndex = findIndex(headers, (header, index) => index < 28 && header === '近期挑戰')
    const goalIndex = findIndex(headers, (header, index) => index < 28 && header === '近期目標')
    const injuryIndex = findIndex(headers, (header, index) => index < 28 && /病史或運動傷害/.test(header))
    const runningIndex = findIndex(headers, (header, index) => index < 28 && header === '跑步近況')
    const amountIndex = findIndex(headers, (header, index) => index < 28 && header === '您的匯款總金額')
    const lastFiveIndex = findIndex(headers, (header, index) => index < 28 && /匯款後五碼/.test(header))
    const invoiceMethodIndex = findIndex(headers, (header, index) => index < 28 && header === '電子發票開立方式')
    const invoiceTargetIndex = findIndex(headers, (header, index) => index < 28 && /手機載具條碼/.test(header))
    const notesIndex = findIndex(headers, (header, index) => index < 28 && header === '備註')
    const taxIdIndex = findIndex(headers, (header, index) => index < 28 && /統一編號|統編與發票抬頭/.test(header))
    const confirmedNameIndex = findIndex(headers, (header, index) => index >= 28 && header === '姓名')
    const confirmedAmountIndex = findIndex(headers, (header, index) => index > confirmedNameIndex && header === '金額')

    rows.slice(1).forEach((row, rowIndex) => {
      const email = normalizeEmail(row[emailIndex])
      const name = firstValue(row, nameIndexes)
      if (!email || !name || name.toLowerCase() === 'test') return

      const submittedAt = normalizeTimestamp(row[0])
      records.push({
        sheetName,
        courseSlug,
        sourceRow: rowIndex + 2,
        submittedAt,
        email,
        identity: normalizeIdentity(valueAt(row, identityIndex)),
        name: name.slice(0, 200),
        phone: valueAt(row, phoneIndex).slice(0, 80),
        emergencyName: firstValue(row, emergencyNameIndexes).slice(0, 200),
        emergencyPhone: firstValue(row, emergencyPhoneIndexes).slice(0, 80),
        lineId: valueAt(row, lineIndex).slice(0, 200),
        referrer: valueAt(row, referrerIndex).slice(0, 200),
        recentChallenge: valueAt(row, challengeIndex),
        recentGoal: valueAt(row, goalIndex),
        injuryHistory: valueAt(row, injuryIndex),
        runningStatus: valueAt(row, runningIndex),
        amountText: valueAt(row, amountIndex).slice(0, 300),
        transferLastFive: valueAt(row, lastFiveIndex).slice(0, 300),
        invoiceMethod: valueAt(row, invoiceMethodIndex).slice(0, 300),
        invoiceTarget: valueAt(row, invoiceTargetIndex).slice(0, 500),
        notes: valueAt(row, notesIndex),
        taxId: valueAt(row, taxIdIndex).slice(0, 500),
        confirmedName: valueAt(row, confirmedNameIndex).slice(0, 200),
        confirmedAmount: valueAt(row, confirmedAmountIndex).slice(0, 100),
        stableKey: stableKey(submittedAt, email, name),
      })
    })
  }

  return records
}

export function isRosterManagedPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  const provider = cleanText((payload as Record<string, unknown>).provider, 100)
  return provider === 'q3_excel_roster_import' || provider === 'google_sheets_roster_sync'
}
