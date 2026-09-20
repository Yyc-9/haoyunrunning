// Real login/register UI with intercepted authentication. No accounts or email are created.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base || '')) throw Error('Local preview required')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const output = '/private/tmp/haoyun-english-auth'
await mkdir(output, { recursive: true })
const records = [], errors = [], unexpected = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
async function record(page, width, name) {
  await page.waitForTimeout(250)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  const state = await page.evaluate(() => {
    const missing = [], han = /[\u3400-\u9fff]/u, visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) { const p = walker.currentNode.parentElement, s = walker.currentNode.nodeValue.trim(); if (p && !p.closest('script,style,textarea,[translate="no"]') && visible(p) && han.test(s)) missing.push(s) }
    for (const e of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) if (visible(e)) for (const attr of ['aria-label','placeholder','title','alt']) if (han.test(e.getAttribute(attr) || '')) missing.push(attr + ': ' + e.getAttribute(attr))
    const dialog = document.querySelector('[role="dialog"]')
    return { missing, overflow: document.documentElement.scrollWidth > innerWidth || Boolean(dialog && dialog.scrollWidth > dialog.clientWidth), font: getComputedStyle(document.body).fontFamily }
  })
  records.push({ name: `${width}-${name}`, ...state })
  console.log(`${width}-${name}: ${state.missing.length} untranslated; overflow=${state.overflow}`)
  await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected }, null, 2))
  await page.getByRole('dialog').screenshot({ path: `${output}/${width}-${name}.png`, animations: 'disabled' })
}
try {
  for (const width of [1440, 375]) {
    const ctx = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'zh-TW', serviceWorkers: 'block' })
    await ctx.addInitScript(() => localStorage.setItem('language', 'en'))
    const scenario = { direct: 'Invalid login credentials', login: {}, register: {}, submissions: [] }
    await ctx.routeWebSocket('**/*', socket => socket.close())
    await ctx.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url())
      const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      // Fulfill the external auth request locally, before blocking all other external traffic.
      if (url.pathname === '/auth/v1/token' && req.method() === 'POST') return reply({ error: 'invalid_grant', error_description: scenario.direct, msg: scenario.direct }, 400)
      if (url.origin !== base) return route.abort()
      if (!url.pathname.startsWith('/api/')) return route.continue()
      if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
      if (url.pathname === '/api/auth/login' || url.pathname === '/api/auth/register') {
        const body = req.postDataJSON(); scenario.submissions.push({ path: url.pathname, body })
        assert.equal(body.email, 'qa-auth@example.invalid')
        assert.equal(body.password, 'Synthetic-only-123')
        const result = url.pathname.endsWith('/login') ? scenario.login : scenario.register
        if (result.abort) return route.abort('failed')
        return reply(result.body ?? {}, result.status ?? 400)
      }
      if (url.pathname === '/api/notifications') return reply({ items: [], unreadCount: 0, staff: false })
      unexpected.push(url.pathname); return route.abort()
    })
    const page = await ctx.newPage(); page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + '/?auth=login', { waitUntil: 'domcontentloaded' })
    const dialog = page.getByRole('dialog')
    await dialog.locator('#auth-email').fill('qa-auth@example.invalid')
    await dialog.locator('#auth-password').fill('Synthetic-only-123')
    const submit = () => dialog.locator('button[type="submit"]').click()
    for (const [name, raw] of [['invalid-login', 'Invalid login credentials'], ['unconfirmed-email', 'Email not confirmed']]) {
      scenario.direct = raw; await submit(); await dialog.getByRole('alert').waitFor(); await record(page, width, name)
      assert.equal(await dialog.locator('#auth-email').inputValue(), 'qa-auth@example.invalid')
    }
    scenario.direct = 'Failed to fetch'
    for (const [name, source] of [
      ['login-throttled', '登入嘗試太頻繁，請稍後再試。'],
      ['login-service-error', '登入服務暫時無法完成驗證，請稍後再試。'],
      ['login-required-fields', '請填寫信箱和密碼。'],
    ]) {
      scenario.login = { body: { error: source }, status: 429 }
      await submit(); await dialog.getByRole('alert').waitFor(); await record(page, width, name)
    }
    scenario.login = { body: {} }; await submit(); await dialog.getByRole('alert').waitFor(); await record(page, width, 'login-empty-response')
    scenario.login = { abort: true }; await submit(); await dialog.getByRole('alert').waitFor(); await record(page, width, 'login-network-error')
    await dialog.getByRole('button', { name: 'Show password', exact: true }).click()
    assert.equal(await dialog.locator('#auth-password').getAttribute('type'), 'text')
    await dialog.getByRole('button', { name: 'Hide password', exact: true }).click()
    await record(page, width, 'password-visibility')
    await dialog.getByRole('button', { name: 'Sign Up', exact: true }).click()
    await dialog.locator('#auth-name').fill('QA 原文姓名')
    await dialog.locator('#auth-phone').fill('0912345678')
    await dialog.locator('#auth-gender').selectOption('other')
    await dialog.locator('#auth-pb').fill('QA 原文成績')
    for (const [name, source] of [
      ['register-throttled', '註冊嘗試太頻繁，請稍後再試。'],
      ['register-unavailable', '帳戶暫時無法建立，請稍後再試。'],
      ['register-email', '請輸入有效的電子信箱。'],
      ['register-password', '密碼請使用 10 至 128 個字元。'],
      ['register-profile', '請完整填寫姓名與聯絡電話。'],
      ['register-service', '帳戶服務暫時無法使用，請稍後再試。'],
      ['register-existing', '這個信箱已經註冊，請直接登入。'],
      ['register-weak-password', '密碼強度不足，請使用至少 10 個字元。'],
    ]) {
      scenario.register = { body: { error: source }, status: 400 }
      await submit(); await dialog.getByRole('alert').waitFor(); await record(page, width, name)
      assert.equal(await dialog.locator('#auth-name').inputValue(), 'QA 原文姓名')
      const body = scenario.submissions.at(-1).body
      assert.equal(body.phone, '0912345678'); assert.equal(body.pb, 'QA 原文成績')
    }
    if (width === 375) {
      assert.deepEqual(await dialog.locator('input,select').evaluateAll(fields => fields.filter(f => parseFloat(getComputedStyle(f).fontSize) < 16).map(f => ({ name: f.name, font: getComputedStyle(f).fontSize }))), [])
    }
    scenario.register = { body: { needsEmailConfirmation: true, user: null, session: null }, status: 200 }
    await submit(); await dialog.getByRole('status').waitFor()
    assert.equal(await dialog.locator('#auth-password').inputValue(), '')
    assert.equal(await dialog.locator('#auth-name').inputValue(), 'QA 原文姓名')
    await record(page, width, 'register-confirmation')
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' })
    await ctx.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []); assert.deepEqual(records.filter(r => r.missing.length || r.overflow), [])
} finally { await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected }, null, 2)); await browser.close() }
