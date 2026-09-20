// Local-only student/account audit. No requests reach a real business API.
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { publicAchievementCatalog } from '../lib/achievement-catalog.ts'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN || 'http://127.0.0.1:3202'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local preview required')
if (!process.env.LANGUAGE_CONTENT_FILE || !process.env.LANGUAGE_AUTH_STORAGE_KEY) throw Error('Provide public content and local auth storage key')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const output = '/private/tmp/haoyun-english-student'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const records = [], errors = [], unexpected = [], writes = []
const id = '1ed770c5-3666-4f30-bae1-1f6e08bcd9d4'
const today = new Date().toISOString().slice(0, 10)
const monday = new Date(today); monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
const weekStart = monday.toISOString().slice(0, 10)
const futureDate = days => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }
const profile = { id, role: 'student', name: 'Language QA', email: 'student@example.invalid', phone: '+886 912345678', goal: '建立規律跑步習慣', pb: '10K｜00:50:00', nickname: 'QA Runner', bio: '', city: '新竹市', running_since: '2024', favorite_distance: '半馬', target_event: 'race:tokyo-marathon-2027', instagram: '', facebook: '', invoice_type: 'none', invoice_carrier: '', tax_id: '' }
const plan = { id, student_id: id, coach_id: id, week_number: 1, week_start: weekStart, workout_date: today, day_label: '週日', title: 'Easy run', target: '5 km', pace: '6:30/km', note: '', sort_order: 0 }
const course = { seasonId: id, seasonName: '2026 Q4', courseSeasonCourseId: id, courseSlug: 'zhubei-night-run-monday', courseName: '竹北夜跑班', weekday: '週一', classTime: '19:30', sessionDates: [futureDate(1), futureDate(8)], capacity: 40, approvedCount: 10, scheduledMakeupCounts: {}, location: 'Hsinchu' }
const attendance = { season: { id, name: '2026 Q4', code: '2026Q4', endsOn: '2027-12-31' }, seasons: [{ id, name: '2026 Q4' }], courses: [course, { ...course, courseSeasonCourseId: 'makeup-class', courseName: '新竹早鳥班', sessionDates: [futureDate(2)] }], enrollments: [{ id, seasonId: id, courseSeasonCourseId: id, courseName: course.courseName, name: profile.name, email: profile.email }], attendance: [], makeups: [], cancellations: [], checkins: [] }
let accessState = 'approved', populated = true, fail = false
const feedback = [{ id: 'feedback', training_plan_id: id, student_id: id, coach_id: id, distance_km: 5, duration_text: '30:00', pace_text: '6:00/km', average_heart_rate: 145, rpe: 5, feeling: 'Good session', status: 'reviewed', created_at: new Date().toISOString(), completed_at: today }]
const races = []
async function context(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
  const expiry = Math.floor(Date.now() / 1000) + 3600
  const user = { id, email: profile.email, role: 'authenticated', aud: 'authenticated', user_metadata: { name: profile.name } }
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: id, exp: expiry, role: 'authenticated' })).toString('base64url') + '.synthetic'
  await ctx.addInitScript(({ user, expiry, token, key }) => {
    localStorage.setItem('language', 'en')
    localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user }))
  }, { user, expiry, token, key: process.env.LANGUAGE_AUTH_STORAGE_KEY })
  await ctx.routeWebSocket('**/*', socket => socket.close())
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.pathname === '/auth/v1/user' && url.hostname === process.env.LANGUAGE_AUTH_STORAGE_KEY.slice(3, -11) + '.supabase.co') return reply(user)
    if (url.origin !== base) return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (!['GET', 'HEAD'].includes(method)) writes.push({ path: url.pathname, method, body: req.postDataJSON() })
    if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
    if (url.pathname === '/api/account/me') {
      if (method === 'PATCH') {
        const body = req.postDataJSON()
        assert.equal(body.city, '新竹市')
        assert.equal(body.favoriteDistance, '半馬')
        Object.assign(profile, { name: body.name, nickname: body.nickname, bio: body.bio })
      }
      return reply({ profile, achievements: publicAchievementCatalog.map((badge, i) => ({ ...badge, earned: i === 0, reason: '', awardedAt: i === 0 ? today : null })) })
    }
    if (url.pathname === '/api/notifications') return reply({ staff: false, unreadCount: 0, items: [] })
    if (url.pathname === '/api/student/access') return reply({ state: accessState, canAccessTraining: accessState === 'approved', coachBound: true, coachName: 'Coach QA' })
    if (url.pathname === '/api/student/training-plans') return fail ? reply({ error: '讀取課表失敗，請稍後再試。' }, 500) : reply({ plans: populated ? [plan] : [] })
    if (url.pathname === '/api/student/training-feedback') {
      if (method === 'POST') return reply({ feedback: { ...feedback[0], ...req.postDataJSON(), id: 'new-feedback' } })
      return reply({ feedback: populated ? feedback : [] })
    }
    if (url.pathname === '/api/student/races') {
      if (method === 'POST') { const race = { ...req.postDataJSON(), id: 'new-race', created_at: today, updated_at: today }; races.push(race); return reply({ race }) }
      if (method === 'DELETE') { races.splice(0); return reply({ success: true }) }
      return reply({ races })
    }
    if (url.pathname === '/api/student/attendance') {
      if (method === 'POST') {
        const body = req.postDataJSON()
        if (body.intent === 'request_leave') attendance.makeups.push({ id: 'leave', enrollment_id: id, original_course_season_course_id: id, original_session_date: body.sessionDate, status: 'leave_requested' })
        if (body.intent === 'schedule_makeup') Object.assign(attendance.makeups[0], { status: 'scheduled', target_course_season_course_id: body.targetCourseSeasonCourseId, target_session_date: body.targetSessionDate })
      }
      return reply(attendance)
    }
    if (url.pathname === '/api/acceptance-test/check-in') return reply({ phase: 'closed', eligible: false })
    unexpected.push(url.pathname); return reply({ error: 'Unmocked API blocked' }, 503)
  })
  const page = await ctx.newPage()
  page.on('pageerror', error => errors.push(error.message))
  return { ctx, page }
}
async function record(page, name) {
  await page.waitForTimeout(350)
  const result = await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 30)) }
    const missing = [], original = [], han = /[\u3400-\u9fff]/u
    const visible = el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) {
      const p = w.currentNode.parentElement, s = w.currentNode.nodeValue.trim()
      if (!p || p.closest('script,style,textarea') || !han.test(s)) continue
      const selectable = p.closest('select') && visible(p.closest('select'))
      if (!visible(p) && !selectable) continue
      ;(p.closest('[translate="no"],[data-no-localize]') ? original : missing).push(s)
    }
    for (const el of document.querySelectorAll('[aria-label],[placeholder],[title],[alt],optgroup[label]')) {
      if (!visible(el) && !el.closest('select')) continue
      for (const a of ['aria-label','placeholder','title','alt','label']) if (han.test(el.getAttribute(a) || '')) missing.push(a + ': ' + el.getAttribute(a))
    }
    scrollTo(0, 0)
    return { missing: [...new Set(missing)], original: [...new Set(original)], overflow: document.documentElement.scrollWidth > innerWidth }
  })
  records.push({ name, ...result })
  if (['mobile/student', 'mobile/profile/edit', 'mobile/profile#attendance-overview'].includes(name)) await page.screenshot({ path: output + '/' + name.replaceAll('/', '-').replaceAll('#', '-') + '.png', fullPage: true })
  await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2))
  console.log(name + ': ' + result.missing.length + ' untranslated; overflow=' + result.overflow)
}
try {
  const { page, ctx } = await context(1440)
  for (const state of ['not_enrolled', 'pending_transfer', 'pending_review', 'rejected', 'approved']) {
    accessState = state
    await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/student/access'), page.goto(base + '/student')])
    await record(page, 'student-' + state)
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await record(page, 'student-settings')
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await page.getByLabel('Sleep quality').selectOption({ label: 'Very good' })
  await page.getByLabel('Fatigue level').selectOption({ label: 'Somewhat fatigued' })
  assert.equal(await page.getByLabel('Sleep quality').inputValue(), '很好')
  assert.equal(await page.getByLabel('Fatigue level').inputValue(), '偏疲勞')
  await page.getByRole('button', { name: 'Submit to coach', exact: true }).click()
  await page.waitForTimeout(350)
  await record(page, 'student-feedback-submitted')
  assert.ok(writes.some(w => w.path === '/api/student/training-feedback' && w.method === 'POST'))
  await page.goto(base + '/profile')
  await page.getByRole('heading', { name: 'QA Runner', exact: true }).waitFor()
  await record(page, 'profile-populated')
  await page.goto(base + '/profile#attendance-overview')
  await page.getByRole('heading', { name: 'My attendance record', exact: true }).waitFor()
  await record(page, 'attendance-sessions')
  await page.getByRole('button', { name: 'On leave', exact: true }).first().click()
  await record(page, 'attendance-leave-requested')
  await page.getByRole('button', { name: 'Choose makeup session', exact: true }).click()
  await record(page, 'attendance-makeup-options')
  await page.locator('select').last().selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Confirm makeup session', exact: true }).click()
  await record(page, 'attendance-makeup-scheduled')
  await page.goto(base + '/profile/edit')
  await page.getByRole('heading', { name: 'Edit runner profile', exact: true }).waitFor()
  await record(page, 'profile-edit')
  await page.getByPlaceholder('What should other runners call you?').fill('Runner with saved edits')
  await page.getByRole('button', { name: 'Save and view profile', exact: true }).click()
  await page.getByRole('heading', { name: 'Runner with saved edits', exact: true }).waitFor()
  await record(page, 'profile-saved')
  await ctx.close()
  const mobile = await context(375)
  for (const route of ['/student', '/profile#attendance-overview', '/profile/edit']) {
    await mobile.page.goto(base + route)
    await mobile.page.waitForTimeout(1200)
    await record(mobile.page, 'mobile' + route)
  }
  populated = false
  await mobile.page.goto(base + '/student'); await mobile.page.waitForTimeout(1000)
  await record(mobile.page, 'student-empty')
  fail = true
  await mobile.page.reload(); await mobile.page.waitForTimeout(1000)
  await record(mobile.page, 'student-load-error')
  await mobile.ctx.close()
  assert.deepEqual(unexpected, [])
  assert.deepEqual(errors, [])
  if (process.env.LANGUAGE_AUDIT_STRICT === '1') assert.deepEqual(records.filter(r => r.missing.length || r.overflow), [])
} finally {
  await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2))
  await browser.close()
}
