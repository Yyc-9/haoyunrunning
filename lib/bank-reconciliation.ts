import 'server-only'

import { createHash } from 'node:crypto'
import readXlsxFile from 'read-excel-file/node'
import { parse as parseCsv } from 'csv-parse/sync'

export const MAX_BANK_FILE_BYTES = 10 * 1024 * 1024
export const MAX_BANK_ROWS = 5000
const MAX_COLUMNS = 100

type Cell = string | number | boolean | Date | null

export type BankColumnMapping = {
  date: number | null
  time: number | null
  amount: number | null
  lastFive: number | null
  sourceName: number | null
  reference: number | null
  note: number | null
  direction: number | null
}

export type BankWorkbook = {
  sheetName: string
  rows: Cell[][]
}

export type BankFilePreview = {
  fileName: string
  fileSize: number
  fileSha256: string
  sheetName: string
  sheetNames: string[]
  headerRow: number
  rowCount: number
  columns: Array<{
    index: number
    header: string
    samples: string[]
  }>
  suggestedMapping: BankColumnMapping
}

export type ParsedBankTransaction = {
  rowNumber: number
  transactionDate: string | null
  transactionTime: string
  amount: number
  direction: 'credit' | 'debit'
  sourceLastFive: string
  sourceName: string
  bankReference: string
  note: string
  fingerprint: string
}

const headerMatchers: Record<keyof BankColumnMapping, RegExp[]> = {
  date: [/日期/, /交易日/, /入帳日/, /入账日/, /轉帳日/, /转账日/, /^date$/i],
  time: [/時間/, /时间/, /交易時間/, /交易时间/, /^time$/i],
  amount: [/金額/, /金额/, /交易金額/, /入帳金額/, /入账金额/, /存入/, /貸方/, /贷方/, /收入/, /^amount$/i],
  lastFive: [/後五碼/, /后五码/, /末五碼/, /末五码/, /轉出帳號/, /转出账号/, /匯款帳號/, /汇款账号/, /付款帳號/, /付款账号/, /對方帳號/, /对方账号/],
  sourceName: [/戶名/, /户名/, /付款人/, /匯款人/, /汇款人/, /對方名稱/, /对方名称/, /交易對象/, /交易对象/],
  reference: [/交易序號/, /交易编号/, /交易編號/, /參考號/, /参考号/, /流水號/, /流水号/, /摘要序號/, /摘要序号/],
  note: [/摘要/, /備註/, /备注/, /說明/, /说明/, /附言/, /交易內容/, /交易内容/],
  direction: [/收支/, /借貸/, /借贷/, /交易類型/, /交易类型/, /存支/, /方向/, /^type$/i],
}

function cleanCell(value: Cell | undefined) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 500)
}

function maskSensitiveDigits(value: string) {
  return value.replace(/\d{8,}/g, (digits) => `•••••${digits.slice(-5)}`)
}

function normalizeRows(input: unknown[][]) {
  return input
    .slice(0, MAX_BANK_ROWS + 50)
    .map((row) => row.slice(0, MAX_COLUMNS).map((cell) => {
      if (cell instanceof Date || typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
        return cell
      }
      return cell === null || cell === undefined ? null : String(cell)
    }))
}

function decodeCsv(buffer: Buffer) {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length
  if (replacementCount === 0) return utf8

  try {
    return new TextDecoder('big5', { fatal: false }).decode(buffer)
  } catch {
    return utf8
  }
}

export async function readBankWorkbook(buffer: Buffer, fileName: string, requestedSheet?: string) {
  if (buffer.length === 0) throw new Error('銀行檔案是空的。')
  if (buffer.length > MAX_BANK_FILE_BYTES) throw new Error('銀行檔案不可超過 10 MB。')

  const extension = fileName.toLowerCase().split('.').pop() ?? ''
  if (extension === 'xls') {
    throw new Error('舊版 XLS 格式目前不支援，請由銀行系統另存為 XLSX 或 CSV 後再上傳。')
  }

  if (extension === 'xlsx') {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new Error('檔案內容不是有效的 XLSX，請重新由銀行系統下載。')
    }

    const sheets = await readXlsxFile(buffer)
    if (sheets.length === 0) throw new Error('XLSX 內沒有可讀取的工作表。')
    const selected = (requestedSheet && sheets.find((sheet) => sheet.sheet === requestedSheet)) || sheets[0]
    return {
      workbook: {
        sheetName: selected.sheet,
        rows: normalizeRows(selected.data),
      } satisfies BankWorkbook,
      sheetNames: sheets.map((sheet) => sheet.sheet),
    }
  }

  if (extension !== 'csv') {
    throw new Error('請上傳銀行下載的 XLSX 或 CSV 檔案。')
  }
  if (buffer.includes(0)) throw new Error('CSV 檔案內容無法辨識，請重新下載。')

  const rows = parseCsv(decodeCsv(buffer).replace(/^\uFEFF/, ''), {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    max_record_size: 1024 * 1024,
  }) as unknown[][]

  return {
    workbook: {
      sheetName: 'CSV',
      rows: normalizeRows(rows),
    } satisfies BankWorkbook,
    sheetNames: ['CSV'],
  }
}

function headerScore(row: Cell[]) {
  const labels = row.map((cell) => cleanCell(cell))
  let score = 0
  for (const matchers of Object.values(headerMatchers)) {
    if (labels.some((label) => matchers.some((matcher) => matcher.test(label)))) score += 1
  }
  return score
}

function findHeaderRow(rows: Cell[][]) {
  const candidates = rows.slice(0, 20).map((row, index) => ({ index, score: headerScore(row) }))
  candidates.sort((left, right) => right.score - left.score || left.index - right.index)
  return candidates[0]?.score ? candidates[0].index : 0
}

function suggestMapping(headers: string[]): BankColumnMapping {
  const mapping: BankColumnMapping = {
    date: null,
    time: null,
    amount: null,
    lastFive: null,
    sourceName: null,
    reference: null,
    note: null,
    direction: null,
  }

  for (const key of Object.keys(mapping) as Array<keyof BankColumnMapping>) {
    const found = headers.findIndex((header) => headerMatchers[key].some((matcher) => matcher.test(header)))
    mapping[key] = found >= 0 ? found : null
  }
  return mapping
}

export function buildBankFilePreview(input: {
  workbook: BankWorkbook
  sheetNames: string[]
  fileName: string
  fileSize: number
  buffer: Buffer
  headerRow?: number
}): BankFilePreview {
  const requestedHeaderIndex = Number(input.headerRow) - 1
  const headerIndex = Number.isInteger(requestedHeaderIndex)
    && requestedHeaderIndex >= 0
    && requestedHeaderIndex < Math.min(input.workbook.rows.length, 50)
    ? requestedHeaderIndex
    : findHeaderRow(input.workbook.rows)
  const headerCells = input.workbook.rows[headerIndex] ?? []
  const columnCount = Math.max(headerCells.length, ...input.workbook.rows.slice(headerIndex + 1, headerIndex + 6).map((row) => row.length), 0)
  const headers = Array.from({ length: columnCount }, (_, index) => cleanCell(headerCells[index]) || `第 ${index + 1} 欄`)

  return {
    fileName: input.fileName,
    fileSize: input.fileSize,
    fileSha256: createHash('sha256').update(input.buffer).digest('hex'),
    sheetName: input.workbook.sheetName,
    sheetNames: input.sheetNames,
    headerRow: headerIndex + 1,
    rowCount: Math.max(0, input.workbook.rows.length - headerIndex - 1),
    columns: headers.map((header, index) => ({
      index,
      header: maskSensitiveDigits(header),
      samples: input.workbook.rows
        .slice(headerIndex + 1, headerIndex + 4)
        .map((row) => maskSensitiveDigits(cleanCell(row[index])))
        .filter(Boolean),
    })),
    suggestedMapping: suggestMapping(headers),
  }
}

function validateColumnIndex(value: number | null, columnCount: number, label: string, required = false) {
  if (value === null) {
    if (required) throw new Error(`請指定「${label}」欄位。`)
    return
  }
  if (!Number.isInteger(value) || value < 0 || value >= columnCount) {
    throw new Error(`「${label}」欄位設定無效。`)
  }
}

function parseAmount(value: Cell | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = cleanCell(value)
  if (!text) return null
  const negative = /^\(.*\)$/.test(text) || /^-/.test(text)
  const parsed = Number(text.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(parsed)) return null
  return negative ? -parsed : parsed
}

function parseDirection(value: Cell | undefined, rawAmount: number) {
  const text = cleanCell(value).toLowerCase()
  if (/支出|轉出|转出|扣款|借方|debit|withdraw/.test(text)) return 'debit' as const
  if (/收入|轉入|转入|存入|貸方|贷方|credit|deposit/.test(text)) return 'credit' as const
  return rawAmount < 0 ? 'debit' as const : 'credit' as const
}

function parseDate(value: Cell | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  const text = cleanCell(value)
  if (!text) return null

  const match = text.match(/(\d{4})[./年-](\d{1,2})[./月-](\d{1,2})/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const roc = text.match(/(\d{2,3})[./年-](\d{1,2})[./月-](\d{1,2})/)
  if (roc) {
    const [, year, month, day] = roc
    return `${Number(year) + 1911}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return null
}

function parseLastFive(value: Cell | undefined) {
  const digits = cleanCell(value).replace(/\D/g, '')
  return digits.length >= 5 ? digits.slice(-5) : ''
}

export function parseBankTransactions(input: {
  workbook: BankWorkbook
  headerRow: number
  mapping: BankColumnMapping
}) {
  const headerIndex = input.headerRow - 1
  if (!Number.isInteger(headerIndex) || headerIndex < 0 || headerIndex >= Math.min(input.workbook.rows.length, 50)) {
    throw new Error('標題列設定無效。')
  }

  const columnCount = input.workbook.rows[headerIndex]?.length ?? 0
  validateColumnIndex(input.mapping.amount, columnCount, '入帳金額', true)
  validateColumnIndex(input.mapping.lastFive, columnCount, '匯款帳號或後五碼', true)
  validateColumnIndex(input.mapping.date, columnCount, '交易日期')
  validateColumnIndex(input.mapping.time, columnCount, '交易時間')
  validateColumnIndex(input.mapping.sourceName, columnCount, '匯款人')
  validateColumnIndex(input.mapping.reference, columnCount, '交易序號')
  validateColumnIndex(input.mapping.note, columnCount, '摘要')
  validateColumnIndex(input.mapping.direction, columnCount, '收支方向')

  const transactions: ParsedBankTransaction[] = []
  const skippedRows: Array<{ rowNumber: number; reason: string }> = []

  for (const [offset, row] of input.workbook.rows.slice(headerIndex + 1).entries()) {
    const rowNumber = headerIndex + offset + 2
    if (row.every((cell) => !cleanCell(cell))) continue

    const rawAmount = parseAmount(row[input.mapping.amount!])
    if (rawAmount === null || rawAmount === 0) {
      skippedRows.push({ rowNumber, reason: '沒有可辨識的交易金額。' })
      continue
    }

    const amount = Math.round(Math.abs(rawAmount))
    const direction = parseDirection(
      input.mapping.direction === null ? undefined : row[input.mapping.direction],
      rawAmount
    )
    const transactionDate = input.mapping.date === null ? null : parseDate(row[input.mapping.date])
    const transactionTime = input.mapping.time === null ? '' : cleanCell(row[input.mapping.time]).slice(0, 30)
    const sourceLastFive = parseLastFive(row[input.mapping.lastFive!])
    const sourceName = input.mapping.sourceName === null ? '' : cleanCell(row[input.mapping.sourceName]).slice(0, 120)
    const bankReference = input.mapping.reference === null ? '' : cleanCell(row[input.mapping.reference]).slice(0, 160)
    const note = input.mapping.note === null ? '' : cleanCell(row[input.mapping.note]).slice(0, 300)

    if (!sourceLastFive && direction === 'credit') {
      skippedRows.push({ rowNumber, reason: '無法取得匯款帳號後五碼。' })
      continue
    }

    const fingerprint = createHash('sha256')
      .update(JSON.stringify({
        transactionDate,
        transactionTime,
        amount,
        direction,
        sourceLastFive,
        sourceName,
        bankReference,
        note,
        rowDisambiguator: bankReference || transactionTime ? null : rowNumber,
      }))
      .digest('hex')

    transactions.push({
      rowNumber,
      transactionDate,
      transactionTime,
      amount,
      direction,
      sourceLastFive,
      sourceName,
      bankReference,
      note,
      fingerprint,
    })
  }

  if (transactions.length === 0) {
    throw new Error('沒有找到可匯入的交易，請重新確認欄位對應。')
  }
  if (transactions.length > MAX_BANK_ROWS) {
    throw new Error(`單次最多匯入 ${MAX_BANK_ROWS.toLocaleString('zh-TW')} 筆交易。`)
  }

  return { transactions, skippedRows }
}
