// Browser regression with synthetic accounts and API responses only; no real enrollment is changed.
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
async function load(path, modules = {}) {
  const exports = {}
  const lines = (await readFile(new URL(path, import.meta.url), 'utf8')).split('\n')
  const source = [...lines.filter(line => line.startsWith('import ')), ...lines.filter(line => !line.startsWith('import '))].join('\n')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => modules[name] })
  return exports
}
const rosterHelpers = await load('../lib/coach-roster.ts', {
  './coach-registration': await load('../lib/coach-registration.ts'), './course-capacity': await load('../lib/course-capacity.ts'),
})
const { coachRosterPreview } = await load('../lib/coach-roster-preview.ts', { './coach-roster': rosterHelpers })
const q4 = JSON.parse(JSON.stringify(coachRosterPreview))
const oldId = 'demo-old-season'
q4.seasons.push({ id: oldId, code: '2026-Q3', name: '2026 第三季', status: 'archived', isCurrent: false })
const q3 = JSON.parse(JSON.stringify(q4))
q3.selectedSeasonId = oldId
for (const course of q3.courses) {
  course.id = `old-${course.id}`
  course.name = course.name.replace('26Q4', '26Q3')
  for (const student of course.students) if (student.visibility === 'own') {
    student.hasFormalAccess = false; student.pb = ''; student.recentFeedback = []
  }
}
const contentModule = await load('../lib/site-content.ts', new Proxy({}, { get: () => ({ GROUP_DESCRIPTION: '測試', GROUP_LINE_URL: '#', defaultCoachPublicProfiles: {} }) }))
const content = contentModule.defaultSiteContent
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.COACH_ROSTER_BASE_URL || 'http://127.0.0.1:3021'
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw Error('Synthetic UI verification is local-only')
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.loadEnvFile('.env.local')
const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
await mkdir('output/playwright', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
    const user = { id: '00000000-0000-4000-8000-000000000100', email: 'coach@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: { name: '測試教練' } }
    const expiry = Math.floor(Date.now() / 1000) + 3600
    const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: expiry })).toString('base64url')}.synthetic`
    await context.addInitScript(({ user, expiry, token, projectRef }) => {
      localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'synthetic', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user }))
    }, { user, expiry, token, projectRef })
    let failNext = false
    let delayNext = false
    let noAssignments = false
    let newRegistration = false
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
      if (url.hostname.endsWith('.supabase.co') && url.pathname === '/auth/v1/user') return reply(user)
      if (url.origin !== base) return route.abort()
      if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
      if (url.pathname === '/api/account/me') return reply({ profile: { ...user, role: 'coach', name: '測試教練' } })
      if (url.pathname === '/api/coach/profile') return reply({ profile: { displayName: '測試教練' } })
      if (url.pathname === '/api/signup-leads') return reply({ leads: [] })
      if (url.pathname === '/api/coach/roster') {
        if (failNext) { failNext = false; return reply({ error: '讀取班級名單失敗，請稍後重試。' }, 503) }
        if (delayNext) { delayNext = false; await new Promise(resolve => setTimeout(resolve, 1200)) }
        const data = JSON.parse(JSON.stringify(url.searchParams.get('seasonId') === oldId ? q3 : q4))
        if (newRegistration) {
          const course = data.courses[0]
          course.students.push({ ...course.students.find(student => student.status === 'pending_review'), id: 'new-registration', name: '新報名學員' })
          course.registeredCount++
          course.paymentCounts.pending_review++
        }
        if (noAssignments) for (const course of data.courses) {
          course.isOwn = false
          delete course.paymentCounts
          course.students = course.students.filter(student => student.status !== 'rejected').map(({ id, name }) => ({ id, name, visibility: 'name_only' }))
        }
        return reply(data)
      }
      if (url.pathname.startsWith('/api/')) return reply({ items: [], unreadCount: 0, coaches: [] })
      return route.continue()
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/coach/students`)
    await page.getByRole('heading', { name: '林小晴', exact: true }).waitFor()
    assert.equal(await page.locator('article').count(), 6, 'initial view includes every class, not only the first assigned class')
    await page.getByText('李承恩', { exact: true }).waitFor()
    await page.getByRole('heading', { name: '王品涵', exact: true }).waitFor()
    assert.equal(await page.getByRole('region', { name: '26Q4 週四竹南初階班', exact: true }).locator('details, a, input').count(), 0)
    await page.getByLabel('搜尋學員').fill('李承恩')
    assert.equal(await page.locator('article').count(), 1, 'default search spans all classes')
    await page.getByLabel('搜尋學員').fill('')
    await page.screenshot({ path: `output/playwright/coach-roster-all-${width}.png`, fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: '我的班級', exact: true }).click()
    assert.equal(await page.locator('article').count(), 4, 'my classes includes both assigned classes')
    if (width < 640) await page.getByLabel('班級', { exact: true }).selectOption('demo-class-a')
    else await page.getByRole('button', { name: /26Q4 週二台北 PB 班/ }).click()
    assert.equal(await page.locator('article').count(), 3, 'paid, pending review and awaiting transfer are all visible')
    await page.getByLabel('繳費狀態').selectOption('pending_transfer')
    await page.getByRole('heading', { name: '黃以辰', exact: true }).waitFor()
    assert.equal(await page.locator('article').count(), 1)
    await page.getByLabel('繳費狀態').selectOption('inactive')
    await page.getByRole('heading', { name: '測試退回紀錄', exact: true }).waitFor()
    await page.getByLabel('繳費狀態').selectOption('all')
    await page.getByLabel('搜尋學員').fill('找不到的學員')
    await page.getByText('目前沒有符合條件的學員', { exact: true }).waitFor()
    await page.getByLabel('搜尋學員').fill('')
    const toggles = page.getByRole('group', { name: '學員資訊顯示大小' }).getByRole('button')
    await toggles.first().click()
    assert.equal(await toggles.first().getAttribute('aria-pressed'), 'true')
    assert.equal(await toggles.nth(1).locator('svg').count(), 1, 'unselected control has no checkmark spacer')
    assert.ok((await page.getByRole('group', { name: '學員資訊顯示大小' }).boundingBox()).width < 180, 'control fits its icons without blank trailing space')
    const compactHeight = (await page.locator('article').first().boundingBox()).height
    await page.screenshot({ path: `output/playwright/coach-roster-own-${width}.png`, fullPage: true, animations: 'disabled' })
    await toggles.nth(1).click()
    assert.ok((await page.locator('article').first().boundingBox()).height > compactHeight, 'density changes card height')
    await page.getByRole('button', { name: '其他班級', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: '其他班級', exact: true }).getAttribute('aria-pressed'), 'true')
    await page.getByText('許子晴', { exact: true }).waitFor()
    assert.equal(await page.locator('article').count(), 2)
    assert.equal(await page.getByLabel('繳費狀態').count(), 0)
    assert.equal(await page.getByText('查看完整報名資料', { exact: true }).count(), 0)
    assert.ok(!(await page.locator('body').innerText()).includes('@example.com'))
    await page.screenshot({ path: `output/playwright/coach-roster-other-${width}.png`, fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: '我的班級', exact: true }).click()
    await page.getByLabel('季度', { exact: true }).selectOption(oldId)
    await page.getByText('這個季度已結束，名單僅供查閱。', { exact: true }).waitFor()
    assert.equal(await page.getByText('最近回饋', { exact: true }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'roster fits viewport')
    await page.goto(`${base}/coach`)
    await page.getByRole('heading', { name: '我的班級報名', exact: true }).waitFor()
    await page.getByRole('link', { name: /26Q4 週三竹北夜跑班/ }).click()
    await page.getByRole('heading', { name: '王品涵', exact: true }).waitFor()
    assert.ok(page.url().includes('courseId=demo-class-b'), 'dashboard opens the selected class')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'dashboard and linked roster fit viewport')
    failNext = true
    await page.goto(`${base}/coach/students`)
    await page.getByRole('button', { name: '重新讀取', exact: true }).waitFor()
    delayNext = true
    await page.getByRole('button', { name: '重新讀取', exact: true }).click()
    await page.getByText('正在讀取班級名單…', { exact: true }).waitFor()
    await page.getByRole('heading', { name: '林小晴', exact: true }).waitFor()
    newRegistration = true
    await page.getByRole('button', { name: '更新名單', exact: true }).click()
    await page.getByRole('heading', { name: '新報名學員', exact: true }).waitFor()
    assert.equal(await page.locator('article').count(), 7, 'refresh includes registrations added since the page opened')
    newRegistration = false
    noAssignments = true
    await page.goto(`${base}/coach/students`)
    await page.getByText('林小晴', { exact: true }).waitFor()
    assert.equal(await page.locator('article').count(), 6, 'unassigned coaches see all names immediately instead of an empty default view')
    assert.equal(await page.getByLabel('繳費狀態').count(), 0)
    assert.equal(await page.getByText('查看完整報名資料', { exact: true }).count(), 0)
    assert.ok(!(await page.locator('body').innerText()).includes('@example.com'))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.deepEqual(errors, [])
    noAssignments = false
    const returned = q4.courses[0].students.find(student => student.status === 'rejected')
    returned.registrationStatus = 'active'
    q4.courses[0].registeredCount++
    q4.courses[0].paymentCounts.rejected++
    await page.goto(`${base}/coach/students`)
    await page.getByRole('heading', { name: '測試退回紀錄', exact: true }).waitFor()
    await page.getByRole('button', { name: '我的班級', exact: true }).click()
    await page.getByLabel('繳費狀態').selectOption('rejected')
    assert.equal(await page.locator('article').count(), 1, 'supplementary registration is active and independently filterable')
    await page.getByText('有效報名即可簽到與點名，不必等待核帳；訓練課表與回饋仍於確認入帳後開放。', { exact: true }).waitFor()
    delete returned.registrationStatus
    q4.courses[0].registeredCount--
    q4.courses[0].paymentCounts.rejected--
    console.log(`PASS ${width}px: roster, supplementary registration, payment filters, density, names-only access, archived quarter, navigation and retry`)
    await context.close()
  }
} finally { await browser.close() }
