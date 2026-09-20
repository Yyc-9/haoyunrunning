// Isolated coach UI audit: all business requests and socket connections are mocked or blocked.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { coachRegistrationFields } from '../lib/coach-registration.ts'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN || 'http://127.0.0.1:3202'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local preview required')
if (!process.env.LANGUAGE_CONTENT_FILE || !process.env.LANGUAGE_AUTH_STORAGE_KEY) throw Error('Provide public content and auth storage key')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const dutyOnly = process.env.LANGUAGE_COACH_DUTY === '1'
const output = dutyOnly ? '/private/tmp/haoyun-english-coach-duty' : '/private/tmp/haoyun-english-coach'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const id = '1ed770c5-3666-4f30-bae1-1f6e08bcd9d4', cid = '2ed770c5-3666-4f30-bae1-1f6e08bcd9d4'
const now = new Date(), today = now.toISOString().slice(0, 10)
const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
const lead = { id, source: 'course_payment', name: 'Student QA', phone: '0900000000', email: 'student@example.invalid', instagram: '', preferred_course: '竹北夜跑班', running_experience: '1-2 年', goal: '建立規律跑步習慣', companion_count: '1', notes: '', status: 'approved', created_at: now.toISOString(), emergency_contact_name: 'Contact QA', emergency_contact_phone: '0900000001' }
lead.registration_fields = coachRegistrationFields({ ...lead, registration_identity: 'new', prior_attendance_claimed: false, payload: { agreements: { coachSubstituteConsent: true, rulesConsent: true, finalConsent: true, agreedAt: now.toISOString() } } })
const students = [{ id, active: true, created_at: now.toISOString(), student: { id, name: lead.name, email: lead.email, program: '竹北夜跑班', goal: lead.goal, pb: '10K 00:50:00' }, recentFeedback: [{ id, created_at: now.toISOString(), distance_km: 5, pace_text: '6:00/km', average_heart_rate: 145, rpe: 5, feeling: 'Good session', status: 'reviewed' }], enrollments: [{ id, courseName: lead.preferred_course, fields: lead.registration_fields }] }]
const duty = { id, courseName: lead.preferred_course, location: 'Hsinchu', sessionDate: today, startTime: now.toISOString(), scheduledCoachId: cid, scheduledCoachName: 'Coach QA', actualCoachId: cid, actualCoachName: 'Coach QA', coachRole: 'coach', leaveStatus: 'none', leaveReason: '', substituteCoachId: '', substituteCoachName: '', substituteResponse: 'none', adminStatus: 'not_required', attendanceState: 'check_in_open', checkedInAt: '', punctuality: '', canViewCheckIn: true, canCheckIn: true, checkInOpensAt: now.toISOString(), canRequestLeave: true, canRespondSubstitute: false, managedByAdmin: false, isCancelled: false }
const attendance = { courses: [{ seasonId: id, seasonName: '2026 Q4', courseSeasonCourseId: id, courseSlug: 'zhubei-night-run-monday', courseName: lead.preferred_course, weekday: '週一', location: 'Hsinchu', meetingPoint: 'Park entrance', sessionDates: [today, tomorrow] }], enrollments: [{ id, season_id: id, course_season_course_id: id, course_slug: 'zhubei-night-run-monday', home_course_name: lead.preferred_course, name: lead.name, email: lead.email, status: 'approved', billing_start_session_date: today, prior_attendance_claimed: false, attendance_verification_status: 'not_required', emergency_contact_name: 'Contact QA', emergency_contact_phone: '0900000001' }], attendance: [], makeups: [], cancellations: [], checkins: [] }
const records = [], errors = [], unexpected = [], writes = []
let empty = false
const scenario = { items: null, response: null, loadError: '', refreshError: '' }
async function open(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
  const expiry = Math.floor(Date.now() / 1000) + 3600
  const user = { id: cid, email: 'coach@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: { name: 'Coach QA' } }
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: cid, exp: expiry, role: 'authenticated' })).toString('base64url') + '.synthetic'
  await ctx.addInitScript(({ user, expiry, token, key }) => { localStorage.setItem('language', 'en'); localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user })) }, { user, expiry, token, key: process.env.LANGUAGE_AUTH_STORAGE_KEY })
  await ctx.routeWebSocket('**/*', socket => socket.close())
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.origin !== base) return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (!['GET','HEAD'].includes(method)) writes.push({ path: url.pathname, method, body: req.postDataJSON() })
    if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
    if (url.pathname === '/api/account/me') return reply({ profile: { ...user, name: 'Coach QA', role: 'coach' } })
    if (url.pathname === '/api/notifications') return reply({ staff: false, unreadCount: 0, items: [] })
    if (url.pathname === '/api/coach/students') return reply({ students: empty ? [] : students })
    if (url.pathname === '/api/signup-leads') return reply({ leads: empty ? [] : [lead, { ...lead, id: 'group', source: 'group_class', status: 'pending_review' }] })
    if (url.pathname === '/api/coach/profile') return reply({ profile: { displayName: 'Coach QA' } })
    if (url.pathname === '/api/coach/training-plans') return reply({ plans: [] })
    if (url.pathname === '/api/coach/session-duty') {
      if (dutyOnly) {
        if (method === 'POST') {
          const response = scenario.response || { message: '已完成準時簽到。' }
          if (!response.error && scenario.refreshError) scenario.loadError = scenario.refreshError
          return reply(response, response.error ? 409 : 200)
        }
        if (scenario.loadError) return reply({ error: scenario.loadError }, 503)
        return reply({ items: scenario.items || [duty], coaches: [{ id: cid, name: 'Coach QA' }, { id, name: 'Substitute QA' }], serverTime: now.toISOString() })
      }
      if (method === 'POST') {
        const body = req.postDataJSON()
        if (body.intent === 'check_in') Object.assign(duty, { checkedInAt: now.toISOString(), canCheckIn: false, punctuality: 'on_time', attendanceState: 'on_time' })
        if (body.intent === 'request_leave') Object.assign(duty, { leaveStatus: 'requested', leaveReason: body.reason, substituteCoachId: id, substituteCoachName: 'Substitute QA', substituteResponse: 'pending' })
      }
      return reply({ items: empty ? [] : [duty], coaches: [{ id: cid, name: 'Coach QA' }, { id, name: 'Substitute QA' }], serverTime: now.toISOString() })
    }
    if (url.pathname === '/api/coach/attendance') {
      if (method === 'POST') {
        const body = req.postDataJSON()
        if (body.intent === 'set_session_cancellation') attendance.cancellations = body.cancelled ? [{ id: 'cancelled', course_season_course_id: id, session_date: body.sessionDate, reason: '' }] : []
        else attendance.attendance = body.records.map(r => ({ id: r.enrollmentId, enrollment_id: r.enrollmentId, course_season_course_id: id, session_date: body.sessionDate, status: r.status, note: r.note }))
      }
      return reply(empty ? { ...attendance, courses: [], enrollments: [] } : attendance)
    }
    if (url.pathname === '/api/acceptance-test/check-in') return reply({ phase: 'closed', eligible: false })
    unexpected.push(url.pathname); return reply({ error: 'Unmocked API blocked' }, 503)
  })
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message))
  return { ctx, page }
}
async function record(page, name) {
  await page.waitForTimeout(500)
  const state = await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)) }
    const missing = [], han = /[\u3400-\u9fff]/u
    const visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) { const p = w.currentNode.parentElement, s = w.currentNode.nodeValue.trim(); if (p && !p.closest('script,style,textarea,[translate="no"]') && (visible(p) || p.closest('select') && visible(p.closest('select'))) && han.test(s)) missing.push(s) }
    for (const e of document.querySelectorAll('[aria-label],[placeholder],[title],[alt],optgroup[label]')) if (visible(e)) for (const a of ['aria-label','placeholder','title','alt','label']) if (han.test(e.getAttribute(a) || '')) missing.push(a + ': ' + e.getAttribute(a))
    scrollTo(0, 0)
    return { missing: [...new Set(missing)], overflow: document.documentElement.scrollWidth > innerWidth }
  })
  records.push({ name, ...state }); await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2))
  if (dutyOnly || ['375/coach', '375-duty-details', '375/coach/attendance', '375/coach/planner'].includes(name)) await page.screenshot({ path: output + '/' + name.replaceAll('/', '-') + '.png', fullPage: true, animations: 'disabled' })
  console.log(`${name}: ${state.missing.length} untranslated; overflow=${state.overflow}`)
}
try {
  if (dutyOnly) {
    const { auditCoachDutyFlows } = await import('./audit-english-coach-duty-flows.mjs')
    await auditCoachDutyFlows({ open, record, scenario, duty, base, id, writes })
  } else {
  for (const width of [1440, 375]) {
    const { ctx, page } = await open(width)
    for (const route of ['/coach', '/coach/students', '/coach/signups', '/coach/attendance', '/coach/planner']) {
      await page.goto(base + route)
      await page.waitForTimeout(1200)
      assert.ok((await page.locator('body').innerText()).includes('Student QA') || route === '/coach/planner', 'Populated route must show its student fixture: ' + route)
      await record(page, width + route)
      if (route === '/coach') {
        await page.getByRole('button', { name: 'View details', exact: true }).first().click()
        await record(page, width + '-duty-details')
        const dialog = page.getByRole('dialog').filter({ visible: true })
        if (width === 1440) {
          await dialog.getByRole('button', { name: 'Check in for teaching', exact: true }).click()
          await dialog.getByRole('button', { name: 'On-time check-in complete', exact: true }).waitFor()
          await record(page, 'coach-checked-in')
          await dialog.getByRole('button', { name: /Leave and substitution/ }).click()
          await dialog.getByPlaceholder('Enter the reason for leave (required)').fill('Schedule conflict')
          await dialog.locator('select').selectOption(id)
          await record(page, 'coach-leave-form')
          await dialog.getByRole('button', { name: 'Submit leave request', exact: true }).click()
          await page.waitForTimeout(400)
          await record(page, 'coach-leave-submitted')
        }
        await page.getByRole('button', { name: 'Close session details', exact: true }).filter({ visible: true }).click()
        if (width === 375) { await page.getByRole('tab', { name: 'Calendar', exact: true }).click(); await record(page, 'mobile-calendar') }
      }
      if (route === '/coach/students' || route === '/coach/signups') {
        const details = page.getByText('View complete registration', { exact: true }).first()
        if (await details.count()) { await details.click(); await record(page, width + route + '-registration') }
      }
      if (route === '/coach/attendance' && width === 1440) {
        const rosterRow = page.locator('article').filter({ hasText: 'Student QA' })
        await rosterRow.getByRole('button', { name: 'Present', exact: true }).click()
        await page.getByRole('button', { name: 'Save session records', exact: true }).click()
        await record(page, 'coach-attendance-saved')
        page.on('dialog', async dialog => { assert.match(dialog.message(), /^(Cancel|Restore) the session on /); await dialog.accept() })
        await page.getByRole('button', { name: 'Cancel session', exact: true }).click()
        await page.getByRole('button', { name: 'Restore session', exact: true }).waitFor()
        await record(page, 'coach-session-cancelled')
        await page.getByRole('button', { name: 'Restore session', exact: true }).click()
        await record(page, 'coach-session-restored')
        attendance.attendance = []
      }
    }
    await ctx.close()
  }
  empty = true
  const { ctx, page } = await open(375)
  for (const route of ['/coach', '/coach/students', '/coach/signups', '/coach/attendance', '/coach/planner']) { await page.goto(base + route); await page.waitForTimeout(1000); await record(page, 'empty' + route) }
  await ctx.close()
  }
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, [])
  if (process.env.LANGUAGE_AUDIT_STRICT === '1') assert.deepEqual(records.filter(r => r.missing.length || r.overflow), [])
} finally { await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2)); await browser.close() }
