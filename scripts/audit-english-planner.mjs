// Local planner interactions. No request can write to real students or training plans.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { addDays, getTodayInfo } from '../lib/week-dates.ts'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN || 'http://127.0.0.1:3202'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local preview required')
if (!process.env.LANGUAGE_CONTENT_FILE || !process.env.LANGUAGE_AUTH_STORAGE_KEY) throw Error('Provide content and auth storage key')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const output = '/private/tmp/haoyun-english-planner'
await mkdir(output, { recursive: true })
const records = [], errors = [], unexpected = [], writes = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const coachId = '1ed770c5-3666-4f30-bae1-1f6e08bcd9d4', studentId = '2ed770c5-3666-4f30-bae1-1f6e08bcd9d4'
const week = getTodayInfo(new Date(), 'en').weekStart
async function open(width, scenario = 'normal') {
  const state = { scenario, gets: 0, plans: [-7, 0].map((offset, i) => ({ id: 'plan-' + i, student_id: studentId, coach_id: coachId, week_number: i + 1, week_start: addDays(week, offset), workout_date: addDays(week, offset), day_label: '周一', title: '第一周', target: i ? 'Current workout' : '教練原文訓練內容，不應自動改寫', pace: '', note: '', sort_order: 0 })) }
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
  const expiry = Math.floor(Date.now() / 1000) + 3600
  const user = { id: coachId, email: 'coach@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: { name: 'Coach QA' } }
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: coachId, exp: expiry, role: 'authenticated' })).toString('base64url') + '.synthetic'
  await ctx.addInitScript(({ user, token, expiry, key }) => { localStorage.setItem('language', 'en'); localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user })) }, { user, token, expiry, key: process.env.LANGUAGE_AUTH_STORAGE_KEY })
  await ctx.routeWebSocket('**/*', socket => socket.close())
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.origin !== base) return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
    if (url.pathname === '/api/account/me') return reply({ profile: { ...user, name: 'Coach QA', role: 'coach' } })
    if (url.pathname === '/api/notifications') return reply({ staff: false, unreadCount: 0, items: [] })
    if (url.pathname === '/api/coach/students') {
      if (scenario === 'student-error') return reply({ error: '讀取學員失敗。' }, 503)
      return reply({ students: scenario === 'empty-students' ? [] : [{ id: studentId, student: { id: studentId, name: 'Student QA', email: 'student@example.invalid', program: 'QA Class', goal: '', pb: '' } }] })
    }
    if (url.pathname === '/api/coach/training-plans') {
      if (req.method() === 'GET') {
        state.gets++
        if (state.scenario === 'load-error') return reply({ error: '讀取課表失敗。' }, 503)
        if (state.scenario === 'denied') return reply({ error: '只能查看或派發已綁定學員的課表。' }, 403)
        return reply({ plans: state.scenario === 'empty-plans' ? [] : state.plans })
      }
      assert.equal(req.method(), 'POST')
      const body = req.postDataJSON(); writes.push(body)
      if (state.scenario === 'save-error') return reply({ error: '操作失敗，請稍後再試。' }, 503)
      if (body.workouts.length === 0) return reply({ error: '請至少填寫一項訓練內容。' }, 400)
      assert.equal(body.studentId, studentId)
      for (const w of body.workouts) { assert.match(w.dayLabel, /^周[一二三四五六日]$/); assert.match(w.workoutDate, /^\d{4}-\d{2}-\d{2}$/) }
      state.plans = state.plans.filter(p => p.week_start !== body.weekStart).concat(body.workouts.map((w, i) => ({ id: 'saved-' + i, student_id: studentId, coach_id: coachId, week_number: body.weekNumber, week_start: body.weekStart, workout_date: w.workoutDate, day_label: w.dayLabel, title: w.title, target: w.target, pace: '', note: w.note, sort_order: w.sortOrder })))
      return reply({ plans: state.plans, count: body.workouts.length, replacedCount: 1 })
    }
    unexpected.push(url.pathname); return reply({ error: 'Unmocked API blocked' }, 503)
  })
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(base + '/coach/planner'); await page.getByRole('heading', { name: 'Training Plan Board', exact: true }).waitFor(); await page.waitForTimeout(1000)
  return { ctx, page, state }
}
async function record(page, name) {
  await page.waitForTimeout(450)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  const state = await page.evaluate(() => {
    const missing = [], han = /[\u3400-\u9fff]/u, visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) { const p = walker.currentNode.parentElement, s = walker.currentNode.nodeValue.trim(); if (p && !p.closest('script,style,textarea,[translate="no"]') && (visible(p) || p.closest('select') && visible(p.closest('select'))) && han.test(s)) missing.push(s) }
    for (const e of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) if (visible(e)) for (const a of ['aria-label','placeholder','title','alt']) if (han.test(e.getAttribute(a) || '')) missing.push(a + ': ' + e.getAttribute(a))
    return { missing: [...new Set(missing)], overflow: document.documentElement.scrollWidth > innerWidth, font: getComputedStyle(document.body).fontFamily, editorFontSize: getComputedStyle(document.querySelector('textarea')).fontSize }
  })
  records.push({ name, ...state }); await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2))
  await page.screenshot({ path: output + '/' + name + '.png', fullPage: true, animations: 'disabled' })
  console.log(`${name}: ${state.missing.length} untranslated; overflow=${state.overflow}`)
}
try {
  for (const width of [1440, 375]) {
    const { ctx, page, state } = await open(width), cells = page.locator('textarea')
    await record(page, width + '-initial')
    assert.equal(await cells.first().inputValue(), 'Current workout')
    await cells.first().fill('QA draft 原文保留')
    if (width === 1440) {
      const gets = state.gets
      await page.getByRole('button', { name: 'Language', exact: true }).click(); await page.getByRole('button', { name: 'Traditional Chinese TC', exact: true }).click(); await page.waitForTimeout(600)
      assert.equal(await cells.first().inputValue(), 'QA draft 原文保留', 'Changing language must preserve unsaved training content')
      await page.getByRole('button', { name: '語言', exact: true }).click(); await page.getByRole('button', { name: 'English EN', exact: true }).click(); await page.waitForTimeout(600)
      assert.equal(state.gets, gets, 'Language changes must not refetch and replace the draft')
      await record(page, '1440-language-roundtrip')
    }
    await page.getByRole('button', { name: 'Easy Run', exact: true }).click(); assert.match(await cells.nth(1).inputValue(), /^Easy run:/); await record(page, width + '-template')
    state.scenario = 'save-error'; await page.getByRole('button', { name: 'Save and Sync Plan', exact: true }).click(); await page.getByText('The action failed. Try again later.', { exact: true }).waitFor(); await record(page, width + '-save-error')
    assert.equal(await cells.first().inputValue(), 'QA draft 原文保留')
    state.scenario = 'normal'; await page.getByRole('button', { name: 'Save and Sync Plan', exact: true }).click(); await page.getByText('Plan saved and synced to the student side. 2', { exact: true }).waitFor()
    assert.equal(state.plans.find(p => p.week_start === week && p.sort_order === 0).target, 'QA draft 原文保留'); await record(page, width + '-saved')
    const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV', exact: true }).click(); const download = await downloadEvent, csv = await readFile(await download.path(), 'utf8')
    assert.match(csv, /QA draft 原文保留/); assert.match(csv.split('\r\n')[0], /Date range,Mon/); assert.doesNotMatch(csv.split('\r\n')[0], /[\u3400-\u9fff]/u); await record(page, width + '-export')
    await page.getByRole('button', { name: 'Copy Last Week', exact: true }).click(); assert.equal(await cells.first().inputValue(), '教練原文訓練內容，不應自動改寫'); await record(page, width + '-copied')
    await page.getByRole('button', { name: 'Review History', exact: true }).click(); await record(page, width + '-history')
    assert.equal(await page.locator('[translate="no"]').filter({ hasText: '教練原文訓練內容，不應自動改寫' }).count(), 1)
    await page.getByRole('button', { name: 'Open Next Week', exact: true }).click(); await page.waitForTimeout(600); assert.equal(await cells.first().inputValue(), ''); await record(page, width + '-next-week')
    await page.getByRole('button', { name: 'Save and Sync Plan', exact: true }).click(); await page.getByText('Enter at least one workout.', { exact: true }).waitFor(); await record(page, width + '-empty-save')
    await page.getByRole('button', { name: 'Back to This Week', exact: true }).click(); await page.waitForTimeout(600); assert.equal(await cells.first().inputValue(), 'QA draft 原文保留')
    await page.locator('select').selectOption(''); await record(page, width + '-no-selection'); assert.equal(await page.getByRole('button', { name: 'Save and Sync Plan', exact: true }).isDisabled(), true)
    await ctx.close()
  }
  for (const scenario of ['empty-students', 'empty-plans', 'student-error', 'load-error', 'denied']) { const { ctx, page } = await open(375, scenario); await record(page, scenario); await ctx.close() }
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, [])
  if (process.env.LANGUAGE_AUDIT_STRICT === '1') assert.deepEqual(records.filter(r => r.missing.length || r.overflow), [])
} finally { await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2)); await browser.close() }
