// Local-only UI audit. Every business API is mocked; external requests are blocked.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN || 'http://127.0.0.1:3202'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('A local preview is required')
if (!process.env.LANGUAGE_CONTENT_FILE || !process.env.LANGUAGE_AUTH_STORAGE_KEY) throw Error('Provide a public content snapshot and the local preview auth storage key')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const actionOnly = process.env.LANGUAGE_ENROLLMENT_ACTIONS === '1'
const legacyOnly = process.env.LANGUAGE_LEGACY_ENROLLMENT === '1'
const output = legacyOnly ? '/private/tmp/haoyun-english-legacy-enrollment' : actionOnly ? '/private/tmp/haoyun-english-enrollment-actions' : '/private/tmp/haoyun-english-interactions'
await mkdir(output, { recursive: true })
const records = [], errors = [], contexts = []
const id = '1ed770c5-3666-4f30-bae1-1f6e08bcd9d4', nid = '2ed770c5-3666-4f30-bae1-1f6e08bcd9d4'
const enrollment = { id, name: 'Language QA', course_slug: 'zhubei-night-run-monday', preferred_course: '竹北夜跑班', status: 'pending_review', amount_text: 'NT$ 3,600', season_id: id, season_name: '2026 Q4', transfer_last_five: '00123', transfer_date: null, student_review_message: null, payment_submitted_at: '2026-09-20T01:00:00Z', created_at: '2026-09-20T01:00:00Z', notes: '學生原文應保持不變', archived: false }
const followups = []
let writes = 0
const scenario = { overrides: {}, registrationError: '', submissions: [] }
const browser = await chromium.launch({ channel: 'chrome', headless: true })
async function account(role, width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
  contexts.push(ctx)
  const user = { id: role === 'admin' ? nid : id, email: `${role}@example.invalid`, role: 'authenticated', aud: 'authenticated', email_confirmed_at: '2026-01-01', user_metadata: { name: 'Language QA' } }
  const expiry = Math.floor(Date.now() / 1000) + 3600
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: user.id, exp: expiry, role: 'authenticated' })).toString('base64url') + '.synthetic'
  await ctx.addInitScript(({ user, token, expiry, key }) => {
    localStorage.setItem('language', 'en')
    localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user }))
  }, { user, token, expiry, key: process.env.LANGUAGE_AUTH_STORAGE_KEY })
  let read = false
  await ctx.routeWebSocket('**/*', socket => socket.close())
  await ctx.route('**/*', async route => {
    const request = route.request(), u = new URL(request.url()), method = request.method()
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (u.origin !== base) return route.abort()
    const override = scenario.overrides[method + ' ' + u.pathname]
    if (override) {
      if (!['GET', 'HEAD'].includes(method)) scenario.submissions.push(request.postDataJSON())
      return reply(override.body, override.status ?? 200)
    }
    if (u.pathname === '/api/site-content') return reply({ content, source: 'database' })
    if (u.pathname === '/api/account/me') return reply({ profile: { ...user, name: user.user_metadata.name, role } })
    if (u.pathname === '/api/course-enrollments/payment-info') return reply({ bankName: 'QA Bank', bankCode: '000', accountNumber: '00000000', qrCodeUrl: '' })
    if (u.pathname === '/api/course-enrollments') {
      if (method === 'GET') return reply({ availability: { courseSlug: 'zhubei-night-run-monday', capacity: 40, paidCount: 0, pendingReviewCount: 0, remaining: 40, full: false }, pricingOptions: { today: '2026-09-20', courseStarted: false, selectionRequired: false, automaticStartSessionDate: '2026-10-05', availableStartSessions: [], priorAttendanceSession: null }, legacyStudent: { matched: false, name: '' }, enrollment: null })
      const body = request.postDataJSON()
      if (actionOnly && body.intent === 'direct_site_registration') {
        scenario.submissions.push(body)
        return reply({ error: scenario.registrationError }, 409)
      }
      if (body.intent === 'course_pricing_quote') return reply({ quoteToken: 'synthetic-quote', pricingQuote: { studentType: 'new', enrollmentTiming: 'regular', billingStartSessionDate: '2026-10-05', billingStartSessionNumber: 1, priorAttendanceClaimed: false, attendanceVerificationStatus: 'not_required', amount: 3600, amountText: 'NT$ 3,600', totalSessionCount: 12, chargedSessionCount: 12, chargedSessionDates: ['2026-10-05'], unitRate: null, fullPriceCap: 3600, referrerStatus: 'not_provided', calculatedAt: new Date().toISOString(), lockedUntil: new Date(Date.now() + 86400000).toISOString() } })
      throw Error('The audit must not submit a course registration')
    }
    if (u.pathname === '/api/notifications') {
      if (method === 'PATCH') { read = true; return reply({ success: true }) }
      return reply({ staff: role === 'admin', unreadCount: read ? 0 : 1, items: [{ id: nid, enrollment_id: id, audience: role === 'admin' ? 'staff' : 'student', kind: role === 'admin' ? 'new_enrollment' : 'supplement_requested', title: role === 'admin' ? '有學生完成新報名' : '你的報名需要補充資料', message: role === 'admin' ? '新報名已回報匯款，請核對。' : 'Please confirm the transfer amount.', created_at: enrollment.created_at, read_at: read ? enrollment.created_at : null }] })
    }
    if (u.pathname === '/api/enrollment-followups') {
      if (method === 'GET') return reply({ staff: role === 'admin', enrollments: [{ ...enrollment }], followups: followups.map(f => role === 'admin' ? f : Object.fromEntries(Object.entries(f).filter(([key]) => !['internal_note', 'email_status', 'email_error'].includes(key)))), hasMore: false })
      const body = request.postDataJSON(); writes++
      if (method === 'POST') {
        assert.equal(role, 'admin'); assert.ok(body.message.trim())
        Object.assign(enrollment, { status: 'rejected', student_review_message: body.message })
        followups.push({ id: body.requestId, reason: body.reason, student_message: body.message, internal_note: body.internalNote, student_reply: null, responded_at: null, created_at: enrollment.created_at, email_status: 'failed', email_error: null })
        return reply({ message: '補件要求與站內通知已保存，請查看下方郵件寄送狀態。' })
      }
      assert.equal(role, 'student'); assert.equal(body.lastFive, '54321'); assert.equal(body.reply, 'I transferred NT$ 3,600.')
      Object.assign(enrollment, { status: 'pending_review', transfer_last_five: body.lastFive, transfer_date: body.transferDate })
      Object.assign(followups[0], { responded_at: new Date().toISOString(), student_reply: body.reply })
      return reply({ message: '資料已送出，財務會重新核對。' })
    }
    if (u.pathname.startsWith('/api/')) return reply({ error: 'Unmocked API blocked by local language audit' }, 503)
    return route.continue()
  })
  const page = await ctx.newPage()
  page.on('pageerror', error => errors.push({ role, message: error.message, stack: error.stack }))
  return page
}
async function record(page, name) {
  await page.waitForTimeout(250)
  const result = await page.evaluate(() => {
    const han = /[\u3400-\u9fff]/u, missing = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode, p = node.parentElement
      if (!p || p.closest('[translate="no"],script,style,textarea') || !p.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
      if (han.test(node.nodeValue)) missing.push(node.nodeValue.trim())
    }
    for (const element of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) {
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
      for (const attr of ['aria-label', 'placeholder', 'title', 'alt']) if (han.test(element.getAttribute(attr) || '')) missing.push(`${attr}: ${element.getAttribute(attr)}`)
    }
    return { missing: [...new Set(missing)], overflow: document.documentElement.scrollWidth > innerWidth }
  })
  records.push({ name, ...result })
  await writeFile(output + '/report.json', JSON.stringify({ records, errors, writes }, null, 2))
  console.log(`${name}: ${result.missing.length} untranslated strings; overflow=${result.overflow}`)
}
try {
  if (legacyOnly) {
    const { auditLegacyEnrollment } = await import('./audit-english-legacy-enrollment.mjs')
    await auditLegacyEnrollment({ account, record, scenario, base, output })
  } else if (actionOnly) {
    const { auditEnrollmentActions } = await import('./audit-english-enrollment-actions.mjs')
    await auditEnrollmentActions({ account, record, scenario, enrollment, followups, id, nid, base, output })
  } else {
  const admin = await account('admin')
  await admin.goto(base + '/notifications?view=staff')
  await admin.getByRole('heading', { name: 'Registration notifications and reviews' }).waitFor()
  await admin.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click()
  await record(admin, 'staff-notification-bell')
  await admin.getByRole('button', { name: 'Mark displayed notifications as read' }).click()
  await admin.getByRole('button', { name: 'Notifications, 0 unread', exact: true }).waitFor({ state: 'attached' })
  await admin.keyboard.press('Escape')
  await record(admin, 'staff-registration-list')
  await admin.locator('main a[href*="enrollment="]').first().click()
  await admin.getByRole('button', { name: 'Use a message template' }).click()
  assert.ok(!/[\u3400-\u9fff]/u.test(await admin.getByLabel('Message to the student').inputValue()))
  await admin.getByLabel('Internal note (optional)').fill('PRIVATE-ONLY-DO-NOT-SEND')
  const template = await admin.getByLabel('Message to the student').inputValue()
  await admin.getByRole('button', { name: 'Language', exact: true }).click()
  await record(admin, 'english-language-menu')
  await admin.getByRole('button', { name: 'Traditional Chinese TC', exact: true }).click()
  await admin.getByRole('heading', { name: '報名通知與核對待辦' }).waitFor()
  assert.equal(await admin.getByLabel('給學生的說明').inputValue(), template)
  await admin.getByRole('button', { name: '語言', exact: true }).click()
  await admin.getByRole('button', { name: 'English EN', exact: true }).click()
  await admin.getByRole('heading', { name: 'Registration notifications and reviews' }).waitFor()
  assert.equal(await admin.getByLabel('Message to the student').inputValue(), template)
  await admin.getByRole('button', { name: 'Language', exact: true }).click()
  await admin.getByRole('button', { name: 'Simplified Chinese SC', exact: true }).click()
  await admin.getByRole('heading', { name: '报名通知与核对待办' }).waitFor()
  assert.match(await admin.evaluate(() => getComputedStyle(document.body).fontFamily), /PingFang SC/)
  await admin.getByRole('button', { name: '语言', exact: true }).click()
  await admin.getByRole('button', { name: 'English EN', exact: true }).click()
  await admin.getByRole('heading', { name: 'Registration notifications and reviews' }).waitFor()
  assert.equal(await admin.getByLabel('Message to the student').inputValue(), template)
  await record(admin, 'staff-followup-form')
  await admin.getByRole('button', { name: 'Send notification and email', exact: true }).click()
  await admin.getByRole('button', { name: 'Retry email', exact: true }).waitFor()
  await record(admin, 'staff-followup-sent')
  const student = await account('student', 375)
  await student.goto(base + `/notifications?enrollment=${id}`)
  await student.getByRole('heading', { name: 'Please provide the following details' }).waitFor()
  await student.getByRole('button', { name: 'Open menu', exact: true }).click()
  await record(student, 'student-mobile-menu')
  await student.getByRole('button', { name: 'Close menu', exact: true }).click()
  assert.ok(!(await student.locator('body').innerText()).includes('PRIVATE-ONLY'))
  await student.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click()
  await record(student, 'student-mobile-bell')
  await student.getByRole('button', { name: 'Close notifications', exact: true }).click()
  await student.getByRole('button', { name: 'View payment instructions', exact: true }).click()
  await student.getByText('QA Bank', { exact: true }).waitFor()
  await record(student, 'student-payment-instructions')
  await student.getByLabel('Last five digits of the sender’s account').fill('54321')
  await student.getByLabel('Transfer date', { exact: true }).fill('2026-09-19')
  await student.getByLabel('Additional details', { exact: true }).fill('I transferred NT$ 3,600.')
  await student.screenshot({ path: output + '/student-mobile.png', fullPage: true })
  await student.getByRole('button', { name: 'Submit for finance review', exact: true }).click()
  await student.getByText('Your details have been submitted for finance review. There is no need to submit them again.', { exact: true }).waitFor()
  await record(student, 'student-response-submitted')
  assert.equal(writes, 2)

  await student.goto(base + '/courses/zhubei-night-run-monday/register')
  await student.getByRole('button', { name: /^(Next|下一步)$/ }).waitFor()
  await record(student, 'registration-step-1')
  await student.getByRole('button', { name: /^(Next|下一步)$/ }).click()
  await record(student, 'registration-step-2')
  for (const checkbox of await student.locator('main input[type="checkbox"]').all()) await checkbox.check()
  await student.getByRole('button', { name: /^(Next|下一步)$/ }).click()
  await record(student, 'registration-step-3')
  const inputs = student.locator('main input')
  for (const input of await inputs.all()) {
    const type = await input.getAttribute('type')
    if (type === 'checkbox' || type === 'radio') continue
    await input.fill(type === 'email' ? '' : type === 'tel' ? '0900000000' : 'Language QA')
  }
  for (const textarea of await student.locator('main textarea').all()) await textarea.fill('None')
  await student.getByRole('button', { name: /^(Next|下一步)$/ }).click()
  await student.getByText('QA Bank', { exact: true }).waitFor()
  await record(student, 'registration-step-4')

  const team = await account('student')
  await team.goto(base + '/team')
  const profileButtons = team.getByRole('button', { name: /^View .+: expertise, experience, and qualifications$/ })
  await profileButtons.first().waitFor()
  for (let i = 0; i < await profileButtons.count(); i++) {
    await profileButtons.nth(i).click()
    await team.getByRole('dialog').waitFor()
    await record(team, `coach-profile-${i + 1}`)
    await team.getByRole('button', { name: 'Close coach profile', exact: true }).last().click()
  }
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(records.filter(record => record.missing.length || record.overflow), [], 'Every exercised state must be fully translated and fit the viewport')
  console.log('All actions completed using mocked data only. Reports:', output)
} finally {
  await writeFile(output + '/report.json', JSON.stringify({ records, errors, writes }, null, 2))
  for (const ctx of contexts) await ctx.close()
  await browser.close()
}
