// Local-only browser regression. All APIs and identities are synthetic; no email is sent.
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const exports = {}
const lines = (await readFile(new URL('../lib/site-content.ts', import.meta.url), 'utf8')).split('\n')
const source = [...lines.filter(line => line.startsWith('import ')), ...lines.filter(line => !line.startsWith('import '))].join('\n')
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: () => ({ GROUP_DESCRIPTION: '測試', GROUP_LINE_URL: '#', defaultCoachPublicProfiles: {} }) })
const content = exports.defaultSiteContent
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = 'http://127.0.0.1:3201'
const id = '00000000-0000-4000-8000-000000000100'
const seasonId = '00000000-0000-4000-8000-000000000004'
await mkdir('output/playwright', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
    const user = { id, email: 'finance@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: { name: '測試財務' } }
    const expiry = Math.floor(Date.now() / 1000) + 3600
    const token = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: id, exp: expiry })).toString('base64url') + '.synthetic'
    await context.addInitScript(({ user, expiry, token }) => {
      localStorage.setItem('sb-notification-qa-auth-token', JSON.stringify({ access_token: token, refresh_token: 'synthetic', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user }))
      sessionStorage.setItem('finance-reconciliation-token', 'synthetic-finance')
    }, { user, expiry, token })
    const row = { id, name: '測試學員', email: 'student@example.invalid', phone: '0900000000', preferred_course: '星期一測試班', calculated_amount: 3600, transfer_last_five: '00123', status: 'pending_review', invoiceDelivery: '手機條碼載具', invoiceDetail: '/ABC1234', taxInvoiceInfo: '', notes: '第一行備註\n第二行備註', payment_submitted_at: null, created_at: '2026-09-22T00:00:00Z', amount_text: 'NT$ 3,600', season_id: seasonId, archived: false }
    let confirmations = 0
    const followups = []
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
      if (url.origin !== base) return route.abort()
      if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
      if (url.pathname === '/api/account/me') return reply({ profile: { ...user, role: 'admin', name: '測試財務' } })
      if (url.pathname === '/api/admin/reconciliation/access') return reply({ configured: true, canManagePassword: false })
      if (url.pathname === '/api/admin/reconciliation') {
        if (route.request().method() === 'PATCH') {
          const body = route.request().postDataJSON()
          assert.equal(body.action, 'confirm_enrollment'); assert.equal(body.enrollmentId, id)
          assert.equal(body.confirmReceipt, true); assert.ok(body.reason.trim())
          confirmations++; row.status = 'approved'
          return reply({ message: '已確認課程匯款入帳' })
        }
        return reply({ seasons: [{ id: seasonId, name: '第四季', status: 'enrolling' }], selectedSeasonId: seasonId, roster: [row], batches: [], transactions: [], candidates: [], paymentAccounts: [] })
      }
      if (url.pathname === '/api/enrollment-followups') {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON()
          assert.ok(body.message); assert.equal(body.enrollmentId, id)
          followups.push({ id: body.requestId, reason: body.reason, student_message: body.message, internal_note: body.internalNote, created_at: row.created_at, email_status: 'skipped' })
          row.status = 'rejected'
          return reply({ message: '補件要求已保存' })
        }
        return reply({ staff: true, enrollments: [row], followups, hasMore: false })
      }
      if (url.pathname.startsWith('/api/')) return reply({ items: [], unreadCount: 0 })
      return route.continue()
    })
    const page = await context.newPage()
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + `/finance?seasonId=${seasonId}&enrollment=${id}#finance-roster`)
    await page.getByRole('heading', { name: '報名與開票資料' }).waitFor().catch(async error => { console.log(await page.locator('body').innerText()); throw error })
    await page.getByText('/ABC1234', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '確認入帳', exact: true }).isDisabled(), true)
    await page.getByRole('button', { name: '帶入常用說明' }).click()
    await page.getByRole('button', { name: '發送通知與郵件', exact: true }).click()
    await page.getByText('已通知學生補充。學生補交後，會重新進入待核對。').waitFor()
    await page.getByLabel('核對依據', { exact: true }).fill('銀行記錄已核對：3600 元')
    await page.getByRole('checkbox').check()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    const form = await page.getByLabel('核對依據', { exact: true }).boundingBox().catch(async error => { console.log(await page.locator('body').innerText()); throw error })
    assert.ok(form.x >= 0 && form.x + form.width <= width, 'form fits viewport')
    await page.screenshot({ path: `output/playwright/finance-roster-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: '確認入帳', exact: true }).click()
    await page.getByText('這筆報名已確認入帳。', { exact: true }).waitFor()
    assert.equal(confirmations, 1)
    assert.equal(await page.getByRole('button', { name: '確認入帳', exact: true }).count(), 0)
    await page.goto(base + `/notifications?view=staff&enrollment=${id}`)
    await page.getByRole('link', { name: '前往本季報名繳費一覽處理' }).waitFor()
    assert.equal(await page.getByRole('button', { name: '發送通知與郵件', exact: true }).count(), 0)
    assert.deepEqual(errors, [])
    console.log(`PASS ${width}px: invoice/email/notes, supplement, manual receipt, mobile fit, old page read-only`)
    await context.close()
  }
} finally { await browser.close() }
