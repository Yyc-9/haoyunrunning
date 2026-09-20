// Local-only finance language audit. Bank files, credentials, and transactions are synthetic.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { financeEnglishCopy } from '../lib/english-finance-copy.ts'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN || 'http://127.0.0.1:3202'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local preview required')
if (!process.env.LANGUAGE_CONTENT_FILE || !process.env.LANGUAGE_AUTH_STORAGE_KEY) throw Error('Provide public content and auth storage key')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const output = '/private/tmp/haoyun-english-finance'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const id = '1ed770c5-3666-4f30-bae1-1f6e08bcd9d4'
const now = new Date().toISOString()
const records = [], errors = [], unexpected = [], writes = []
async function open(width, scenario = 'normal') {
  const faults = { previewError: '', importError: '' }
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
  const expiry = Math.floor(Date.now() / 1000) + 3600
  const user = { id, email: 'finance@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: { name: 'Finance QA' } }
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: id, exp: expiry, role: 'authenticated' })).toString('base64url') + '.synthetic'
  await ctx.addInitScript(({ user, expiry, token, key, scenario }) => {
    localStorage.setItem('language', 'en'); localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user }))
    if (['archived', 'readonly', 'empty'].includes(scenario)) sessionStorage.setItem('finance-reconciliation-token', 'synthetic-finance')
  }, { user, expiry, token, key: process.env.LANGUAGE_AUTH_STORAGE_KEY, scenario })
  const transactions = ['matched', 'ambiguous', 'amount_mismatch', 'unmatched', 'already_confirmed', 'manual_match', 'duplicate', 'ignored', 'confirmed'].map((status, i) => ({ id: String(i), batch_id: id, row_number: i + 1, transaction_date: i === 3 ? null : now, transaction_time: '', amount: 3600, direction: 'credit', source_last_five: '54321', source_name: 'Student QA', bank_reference: 'QA-' + i, note: '', match_status: status, match_reason: status === 'matched' ? '後五碼與金額唯一相符，可以確認入帳。' : '', candidate_count: status === 'unmatched' ? 0 : 1, confirmed_at: null }))
  const candidates = transactions.filter(t => t.match_status !== 'unmatched').map(t => ({ id: 'candidate-' + t.id, transaction_id: t.id, order_kind: 'course', order_id: id, order_number: 'QA-order', customer_name: 'Student QA', order_label: '竹北夜跑班', expected_amount: 3600, transfer_last_five: '54321', order_status: 'pending_review', match_quality: 'exact', selected: !['ambiguous','amount_mismatch'].includes(t.match_status) }))
  const data = { seasons: [{ id, name: '2026 Q4', status: scenario === 'archived' ? 'archived' : 'enrolling' }], selectedSeasonId: id, roster: ['approved','pending_transfer','pending_review','rejected'].map((status, i) => ({ id: String(i), name: 'Student QA ' + i, preferred_course: '竹北夜跑班', calculated_amount: 3600, transfer_last_five: '54321', status })), paymentAccounts: [{ id, label: 'QA Account', bank_name: 'QA Bank', account_number: '00000000', active: true }], batches: scenario === 'empty' ? [] : [{ id, file_name: 'synthetic-bank.csv', bank_account_label: 'QA Account', imported_count: 9, duplicate_count: 1, status: 'processed', summary: {}, uploaded_at: now }], selectedBatchId: scenario === 'empty' ? '' : id, transactions: scenario === 'empty' ? [] : transactions, candidates: scenario === 'empty' ? [] : candidates }
  await ctx.routeWebSocket('**/*', socket => socket.close())
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.origin !== base) return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (!['GET','HEAD'].includes(method)) writes.push({ path: url.pathname, method })
    if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
    if (url.pathname === '/api/account/me') return reply({ profile: { ...user, name: 'Finance QA', role: scenario === 'unauthorized' ? 'student' : 'admin' } })
    if (url.pathname === '/api/notifications') return reply({ staff: true, unreadCount: 0, items: [] })
    if (url.pathname === '/api/admin/reconciliation/access') {
      if (method === 'POST') return req.postDataJSON().password === 'bad' ? reply({ error: '目前的財務密碼不正確。' }, 403) : reply({ token: 'synthetic-finance', message: '財務對帳區已解鎖 30 分鐘。' })
      return reply({ configured: scenario !== 'setup', canManagePassword: true, readOnly: scenario === 'readonly', lockedUntil: scenario === 'locked' ? new Date(Date.now() + 900000).toISOString() : null, passwordRequirements: '12 至 128 個字元，至少包含一個英文字母與一個數字。' })
    }
    if (url.pathname === '/api/admin/reconciliation/preview') return faults.previewError ? reply({ error: faults.previewError }, 400) : reply({ preview: { fileName: 'synthetic-bank.csv', fileSize: 100, fileSha256: 'synthetic', sheetName: 'Sheet1', sheetNames: ['Sheet1'], headerRow: 1, rowCount: 1, columns: [{ index: 0, header: '交易日期', samples: ['2026-09-20'] }, { index: 1, header: '入帳金額', samples: ['3600'] }, { index: 2, header: '後五碼', samples: ['54321'] }], suggestedMapping: { date: 0, time: null, amount: 1, lastFive: 2, sourceName: null, reference: null, note: null, direction: null } } })
    if (url.pathname === '/api/admin/reconciliation') {
      if (method === 'POST') return faults.importError ? reply({ error: faults.importError }, 400) : reply({ batchId: id, message: '已匯入 1 筆交易，系統已完成初步比對。' })
      if (method === 'PATCH') {
        const body = req.postDataJSON()
        if (body.action === 'confirm_batch') transactions.filter(t => t.match_status === 'matched').forEach(t => t.match_status = 'confirmed')
        return reply({ message: '已完成 1 筆唯一相符交易的對帳。' })
      }
      return reply(data)
    }
    unexpected.push(url.pathname); return reply({ error: 'Unmocked API blocked' }, 503)
  })
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message))
  return { ctx, page, faults }
}
async function record(page, name) {
  await page.waitForTimeout(400)
  const state = await page.evaluate(() => {
    const missing = [], han = /[\u3400-\u9fff]/u, visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) { const p = w.currentNode.parentElement, s = w.currentNode.nodeValue.trim(); if (p && !p.closest('script,style,textarea,[translate="no"]') && (visible(p) || p.closest('select') && visible(p.closest('select'))) && han.test(s)) missing.push(s) }
    for (const e of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) if (visible(e)) for (const a of ['aria-label','placeholder','title','alt']) if (han.test(e.getAttribute(a) || '')) missing.push(a + ': ' + e.getAttribute(a))
    return { missing: [...new Set(missing)], overflow: document.documentElement.scrollWidth > innerWidth }
  })
  records.push({ name, ...state }); await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2)); console.log(`${name}: ${state.missing.length} untranslated; overflow=${state.overflow}`)
}
try {
  for (const width of [1440,375]) {
    const { ctx, page, faults } = await open(width)
    await page.goto(base + '/finance')
    await page.getByRole('button', { name: 'Unlock reconciliation', exact: true }).waitFor()
    await record(page, width + '-locked')
    await page.getByPlaceholder('Enter finance password', { exact: true }).fill('bad')
    await page.getByRole('button', { name: 'Unlock reconciliation', exact: true }).click()
    await page.getByRole('alert').waitFor(); await record(page, width + '-wrong-password')
    await page.getByPlaceholder('Enter finance password', { exact: true }).fill('SyntheticOnly123')
    await page.getByRole('button', { name: 'Unlock reconciliation', exact: true }).click()
    await page.getByRole('heading', { name: 'Season registration payment overview', exact: true }).waitFor()
    await record(page, width + '-unlocked')
    await page.getByRole('button', { name: 'Step 1: Review all unique matches', exact: true }).click()
    await record(page, width + '-batch-confirmation')
    await page.getByRole('button', { name: 'Step 2: Confirm payments', exact: true }).click()
    await record(page, width + '-batch-confirmed')
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choose file', exact: true }).click()])
    await chooser.setFiles({ name: 'synthetic-bank.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Last5\n2026-09-20,3600,54321') })
    await page.getByText('Header row', { exact: true }).waitFor()
    await record(page, width + '-file-preview')
    await page.screenshot({ path: output + '/' + width + '-finance.png', fullPage: true })
    for (const [name, source] of [
      ['empty', '銀行檔案是空的。'],
      ['size', '銀行檔案不可超過 10 MB。'],
      ['legacy', '舊版 XLS 格式目前不支援，請由銀行系統另存為 XLSX 或 CSV 後再上傳。'],
      ['unreadable', 'CSV 檔案內容無法辨識，請重新下載。'],
      ['header', '標題列設定無效。'],
    ]) {
      faults.previewError = source
      await page.locator('input[type="file"]').setInputFiles({ name: `synthetic-${name}.csv`, mimeType: 'text/csv', buffer: Buffer.from('Synthetic file validation') })
      await page.getByRole('alert').getByText(financeEnglishCopy[source], { exact: true }).waitFor()
      await record(page, `${width}-file-error-${name}`)
    }
    faults.previewError = ''
    await page.locator('input[type="file"]').setInputFiles({ name: 'synthetic-retry.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Last5\n2026-09-20,3600,00123') })
    await page.getByText('Header row', { exact: true }).waitFor()
    await record(page, `${width}-file-recovered`)
    for (const [name, source, translated] of [
      ['mapping', '請指定「匯款帳號或後五碼」欄位。', 'Select the “Transfer account or last five digits” column.'],
      ['limit', '單次最多匯入 5,000 筆交易。', 'You can import up to 5,000 transactions at a time.'],
    ]) {
      faults.importError = source
      await page.getByRole('button', { name: /^Import and match/ }).click()
      await page.getByRole('alert').getByText(translated, { exact: true }).waitFor()
      await page.getByText('Header row', { exact: true }).waitFor()
      await record(page, `${width}-import-error-${name}`)
    }
    faults.importError = ''
    await page.getByRole('button', { name: /^Import and match/ }).click()
    await page.getByText('Header row', { exact: true }).waitFor({ state: 'hidden' })
    await record(page, `${width}-import-recovered`)
    await ctx.close()
  }
  for (const scenario of ['setup','locked','archived','readonly','empty','unauthorized']) {
    const { ctx, page } = await open(375, scenario); await page.goto(base + '/finance'); await page.waitForTimeout(1000); await record(page, scenario); await ctx.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, [])
  if (process.env.LANGUAGE_AUDIT_STRICT === '1') assert.deepEqual(records.filter(r => r.missing.length || r.overflow), [])
} finally { await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2)); await browser.close() }
