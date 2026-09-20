// Local administrator UI audit. All business requests are fulfilled with synthetic data.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { defaultShopProducts } from '../lib/shop-products.ts'
import { applyContentAction, contentChecks, prepareContentFixture } from './audit-english-content-flows.mjs'
import { adminSeasonActions, applyAdminSeasonAction } from './audit-english-admin-season-actions.mjs'
import { adminAccountActions, applyAdminAccountAction, prepareAccountFixture } from './audit-english-admin-account-actions.mjs'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN || 'http://127.0.0.1:3202'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local preview required')
if (!process.env.LANGUAGE_CONTENT_FILE || !process.env.LANGUAGE_AUTH_STORAGE_KEY) throw Error('Provide public content and auth storage key')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const productOnly = process.env.LANGUAGE_ADMIN_PRODUCTS === '1'
const contentOnly = process.env.LANGUAGE_ADMIN_CONTENT === '1'
const actionOnly = process.env.LANGUAGE_ADMIN_ACTIONS === '1'
const accountOnly = process.env.LANGUAGE_ADMIN_ACCOUNTS === '1'
const output = accountOnly ? '/private/tmp/haoyun-english-admin-accounts' : actionOnly ? '/private/tmp/haoyun-english-admin-actions' : contentOnly ? '/private/tmp/haoyun-english-admin-content' : productOnly ? '/private/tmp/haoyun-english-admin-products' : '/private/tmp/haoyun-english-admin'
await mkdir(output, { recursive: true })
const id = '1ed770c5-3666-4f30-bae1-1f6e08bcd9d4', now = new Date().toISOString(), slug = 'zhubei-night-run-monday'
const course = { slug, name: '竹北夜跑班', weekday: '星期一', location: '竹北', period: '2026 Q4', classTime: '19:00–20:30', meetingPoint: 'QA Park', feeNote: '', campaignLabel: '2026 Q4', slogan: '', targetAudience: '', focus: '', benefits: [], trainingItems: [], suitableFor: [], enrollmentNote: '', signupUrl: '', coachKeys: ['qa-coach'] }
const season = { id, code: '2026-Q4', name: '2026 Q4', status: 'enrolling', isCurrent: true, enrollmentStartsOn: '2026-09-01', enrollmentEndsOn: '2026-12-31', startsOn: '2026-10-01', endsOn: '2026-12-31', courseOverrides: {}, courseCapacities: { [slug]: 30 }, courseBillingConfigs: {}, courseOfferingIds: {}, registrationCount: 4, approvedCount: 1, pendingReviewCount: 1, createdAt: now, updatedAt: now }
const orders = ['pending_transfer','pending_review','approved','rejected'].map((status, i) => ({ id: 'order-' + i, orderKind: 'course', orderNumber: 'QA-' + i, studentName: 'Student QA ' + i, email: `student${i}@example.invalid`, courseName: course.name, courseSlug: slug, seasonId: id, seasonName: season.name, amountText: 'NT$3,600', transferLastFive: '54321', status, submittedAt: now, notes: '', reviewNote: null, paymentReference: '', paymentChannelLabel: 'QA Account', assignedAccount: '', inventoryReserved: false, items: [], registrationDetails: [{ label: '姓名', value: 'Student QA ' + i }], attendanceAnomalies: [], openAttendanceAnomalyCount: 0 }))
const payload = { admin: { id, name: 'Admin QA', email: 'admin@example.invalid', role: 'admin' }, overview: { studentCount: 4, coachCount: 1, pendingOrderCount: 1, approvedOrderCount: 1, unopenedPlanCount: 3, recentFeedbackCount: 1, productCount: 0, lowStockCount: 0, paymentAccountCount: 1 }, students: orders.map((o, i) => ({ id: 'student-' + i, name: o.studentName, email: o.email, program: course.name, paymentStatus: o.status, paymentCourse: course.name, planEnabled: o.status === 'approved', lastFeedbackAt: now, createdAt: now, bindings: [{ id: 'binding-' + i, coachId: 'qa-coach', coachName: 'Coach QA', coachEmail: 'coach@example.invalid' }], boundCoachNames: 'Coach QA' })), coaches: [], orders, courseCapacity: [{ slug, name: course.name, seasonId: id, seasonName: season.name, capacity: 30, paidCount: 1, pendingTransferCount: 1, pendingReviewCount: 1, remaining: 29 }], courseSeasons: [season, { ...season, id: 'archive', name: '2026 Q3', code: '2026-Q3', status: 'archived', isCurrent: false }], seasonSyncSources: [], products: [], paymentAccounts: [{ id, label: 'QA Account', account_name: 'QA Team', bank_name: 'QA Bank', bank_code: '000', account_number: '000000000', active: true, weight: 1, last_assigned_at: now, created_at: now }], siteContent: content, courses: [course], coachOptions: [{ id: 'qa-coach', name: 'Coach QA', email: 'coach@example.invalid' }], coachAccounts: [{ id: 'coach-account', coachKey: 'qa-coach', name: 'Coach QA', email: 'coach@example.invalid', profileId: 'qa-coach', role: 'coach', status: 'enabled', registered: true, emailConfirmed: true, boundStudentCount: 4, courses: course.name, publicProfileName: 'Coach QA', publicCoachKey: 'qa-coach', createdAt: now, updatedAt: now, enabledAt: now, disabledAt: null }], coachPublicProfiles: [{ coachKey: 'qa-coach', displayName: 'Coach QA', ownerProfileId: 'qa-coach', verificationEmail: '' }, { coachKey: 'qa-new', displayName: 'New Coach QA', ownerProfileId: null, verificationEmail: '' }] }
const records = [], errors = [], unexpected = [], writes = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
async function open(width) {
  const data = structuredClone(payload)
  if (accountOnly) prepareAccountFixture(data)
  if (contentOnly || actionOnly) prepareContentFixture(data)
  if (productOnly) {
    data.products = structuredClone(defaultShopProducts)
    data.products[0].variants[0].detailImages = ['/goodluck-running-vest.jpg', '/goodluck-running-vest-black.jpg']
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const duty = { id: 'qa-duty', courseName: course.name, courseSeasonCourseId: id, sessionDate: today, startTime: '00:01', scheduledCoachId: 'qa-coach', scheduledCoachName: 'Coach QA', actualCoachId: 'qa-coach', actualCoachName: 'Coach QA', coachRole: 'head_coach', leaveStatus: 'requested', leaveReason: '教練原文原因保留', recommendedSubstituteName: 'Substitute QA', substituteCoachId: 'qa-substitute', substituteCoachName: 'Substitute QA', substituteResponse: 'pending', adminStatus: 'pending', attendanceState: 'not_checked_in', checkedInAt: now, manualCorrection: true, salaryStatusLabel: '待設定課酬', isCancelled: false }
  data.orders[0].notes = '學員原文備註保留'
  data.orders[0].attendanceAnomalies = [{ attendanceId: 'qa-anomaly', sessionDate: '2026-10-01', billingStartSessionDate: '2026-10-08', status: 'open', outcome: '', resolutionNote: '', resolvedAt: null, markedAt: now }]
  data.orders[0].openAttendanceAnomalyCount = 1
  data.orders.push({ ...data.orders[1], id: 'shop-order', orderKind: 'shop', orderNumber: 'SHOP-QA', studentName: 'Customer QA', seasonId: '', seasonName: '', notes: '', items: ['QA Shirt'], inventoryReserved: true })
  data.seasonSyncSources = [{ id: 'qa-sync', seasonId: id, provider: 'google_sheets', spreadsheetId: 'synthetic', sourceUrl: 'https://example.invalid/sheet', active: true, lastSyncedAt: now, lastResult: { records: 4, inserted: 1, moved: 1, updated: 1, missing: 1, duplicateGroups: 1, duplicateRecords: 2 }, lastError: '', updatedAt: now }]
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
  const expiry = Math.floor(Date.now() / 1000) + 3600
  const user = { id, email: payload.admin.email, role: 'authenticated', aud: 'authenticated', user_metadata: { name: 'Admin QA' } }
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: id, exp: expiry, role: 'authenticated' })).toString('base64url') + '.synthetic'
  await ctx.addInitScript(({ user, expiry, token, key }) => { localStorage.setItem('language', 'en'); localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user })) }, { user, expiry, token, key: process.env.LANGUAGE_AUTH_STORAGE_KEY })
  await ctx.routeWebSocket('**/*', socket => socket.close())
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.origin !== base) return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (!['GET','HEAD'].includes(method)) writes.push({ path: url.pathname, method, action: req.headers()['content-type']?.includes('application/json') ? req.postDataJSON()?.action : undefined })
    if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
    if (url.pathname === '/api/account/me') return reply({ profile: { ...user, name: 'Admin QA', role: 'admin' } })
    if (url.pathname === '/api/notifications') return reply({ staff: true, unreadCount: 0, items: [] })
    if (url.pathname === '/api/admin') {
      if (method === 'GET') return reply(data)
      const body = req.postDataJSON()
      if (accountOnly) {
        assert.ok(data.qaAccountResponse, 'Account actions require an explicit mocked response')
        data.qaAccountSubmission = body
        if (!data.qaAccountResponse.error) applyAdminAccountAction(data, body)
        return reply(data.qaAccountResponse, data.qaAccountResponse.error ? 409 : 200)
      }
      if (actionOnly) {
        const response = data.qaActionResponse
        assert.ok(response, 'Every simulated administrator action must have an explicit response')
        if (!response.error) applyAdminSeasonAction(data, body)
        return reply(response, response.error ? 409 : 200)
      }
      if (contentOnly) applyContentAction(data, body)
      if (['create_product','update_product'].includes(body.action)) {
        const product = { ...body, id: body.productId || 'qa-created', sizes: body.sizes.split('、').filter(Boolean), tags: body.tags.split('、').filter(Boolean), highlights: [], usageNotes: [], priceLabel: '', rating: 5, reviews: 0 }
        assert.ok(Number.isFinite(product.price)); assert.ok(Number.isInteger(product.stockQuantity))
        if (body.action === 'create_product') data.products.push(product)
        else data.products = data.products.map(p => p.id === body.productId ? product : p)
      }
      if (body.action === 'delete_product') data.products = data.products.filter(p => p.id !== body.productId)
      if (body.action === 'review_order') { const order = data.orders.find(o => o.id === body.orderId); assert.ok(order); if (body.orderKind === 'course') { assert.equal(body.confirmReceipt, true); assert.equal(body.reviewNote, 'Synthetic bank verification') }; order.status = body.status; order.reviewNote = body.reviewNote }
      if (body.action === 'resolve_attendance_anomaly') { data.orders[0].attendanceAnomalies[0].status = 'resolved'; data.orders[0].attendanceAnomalies[0].outcome = body.outcome; data.orders[0].openAttendanceAnomalyCount = 0 }
      return reply({ message: '操作已完成。' })
    }
    if (url.pathname === '/api/admin/google-sheets-script') return reply({ script: '// Synthetic preview only\nfunction setupGoodLuckRosterSync() {}' })
    if (url.pathname === '/api/admin/upload') { assert.equal(method, 'POST'); if (data.qaVideoFailure) return reply({ error: '無法建立影片上傳憑證。' }, 503); assert.match(req.headers()['content-type'], /multipart\/form-data/); if (data.qaImageFailure) return reply({ error: '圖片上傳失敗。' }, 503); return reply({ url: '/goodluck-running-vest-black.jpg' }) }
    if (url.pathname === '/api/admin/coach-duty') {
      if (accountOnly) {
        data.qaDutyItems ??= [structuredClone(duty)]
        if (method === 'PATCH') {
          assert.ok(data.qaDutyResponse, 'Duty writes require an explicit mocked response')
          const body = req.postDataJSON()
          assert.equal(body.assignmentId, duty.id)
          assert.equal(body.reason, 'QA 原文原因保留')
          data.qaDutySubmission = body
          if (!data.qaDutyResponse.error && data.qaDutyAfter) data.qaDutyItems = [structuredClone(data.qaDutyAfter)]
          return reply(data.qaDutyResponse, data.qaDutyResponse.error ? 409 : 200)
        }
        if (data.qaDutyReadError) return reply({ error: data.qaDutyReadError }, 503)
        return reply({ items: data.qaDutyItems, coaches: [{ id: 'qa-coach', name: 'Coach QA', email: 'coach@example.invalid' }, { id: 'qa-substitute', name: 'Substitute QA', email: 'substitute@example.invalid' }], audits: [{ assignment_id: duty.id, action: data.qaDutyAudit || 'manual_correction', reason: '保留原始稽核備註', created_at: now }], acceptanceTest: null })
      }
      if (method === 'PATCH') { const body = req.postDataJSON(); if (body.action === 'manual_correction') { assert.equal(body.reason, 'Synthetic correction'); duty.attendanceState = body.attendanceState }; return reply({ message: '資料已更新。' }) }
      return reply({ items: [duty], coaches: [{ id: 'qa-coach', name: 'Coach QA', email: 'coach@example.invalid' }, { id: 'qa-substitute', name: 'Substitute QA', email: 'substitute@example.invalid' }], audits: [{ assignment_id: duty.id, action: 'manual_correction', reason: '保留原始稽核備註', actor_profile_id: id, created_at: now }], acceptanceTest: null })
    }
    if (url.pathname === '/api/admin/payment-info') {
      if (accountOnly) {
        if (method === 'GET') return data.qaPaymentReadError ? reply({ error: data.qaPaymentReadError }, 503) : reply(data.qaPayment)
        assert.ok(data.qaPaymentResponse, 'Payment writes require an explicit mocked response')
        data.qaPaymentSubmission = req.postDataJSON()
        if (data.qaPaymentResponse.error) return reply(data.qaPaymentResponse, 409)
        assert.equal(data.qaPaymentSubmission.confirmed, true)
        assert.equal(data.qaPaymentSubmission.version, data.qaPayment.version)
        data.qaPayment = { info: data.qaPaymentSubmission.info, config: data.qaPaymentSubmission.info, version: 'qa-updated' }
        return reply({ ...data.qaPayment, ...data.qaPaymentResponse })
      }
      const info = { bankName: 'QA Bank', bankCode: '000', accountNumber: '00000000', qrCodeUrl: '', useLegacyQr: false }; return reply({ info, config: info, version: now })
    }
    if (url.pathname === '/api/admin/reconciliation/access') return reply({ configured: true, canManagePassword: true, readOnly: false, lockedUntil: null })
    unexpected.push(url.pathname); return reply({ error: 'Unmocked API blocked' }, 503)
  })
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message))
  return { ctx, page, data }
}
async function record(page, name) {
  await page.waitForTimeout(450)
  // Complete finite entrance animations before inspecting or capturing text.
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.playState === 'running' && Number.isFinite(a.effect?.getTiming().iterations)).map(a => a.finished.catch(() => {}))))
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  assert.doesNotMatch(await page.title(), /[\u3400-\u9fff]/u)
  const state = await page.evaluate(() => {
    const missing = [], han = /[\u3400-\u9fff]/u, visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) { const p = w.currentNode.parentElement, s = w.currentNode.nodeValue.trim(); if (p && !p.closest('script,style,textarea,[translate="no"]') && (visible(p) || p.closest('select') && visible(p.closest('select'))) && han.test(s)) missing.push(s) }
    for (const e of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) if (visible(e)) for (const a of ['aria-label','placeholder','title','alt']) if (han.test(e.getAttribute(a) || '')) missing.push(a + ': ' + e.getAttribute(a))
    const panel = document.querySelector('#admin-content-panel')
    return { missing: [...new Set(missing)], overflow: document.documentElement.scrollWidth > innerWidth, font: getComputedStyle(document.body).fontFamily, ...(panel ? { panelVisible: visible(panel) } : {}) }
  })
  records.push({ name, ...state }); await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2)); console.log(`${name}: ${state.missing.length} untranslated; overflow=${state.overflow}`)
  if (state.panelVisible !== undefined) assert.equal(state.panelVisible, true, 'Content panel must be visible during the audit')
  await page.screenshot({ path: output + '/' + name + '.png', fullPage: true, animations: 'disabled' })
}
async function productChecks(page, width) {
  if (width > 768) await page.locator('#admin-tab-products').click()
  else { await page.getByRole('navigation', { name: 'Main administrator navigation' }).getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: /^Products/ }).click() }
  let form = page.getByRole('form', { name: 'Edit product', exact: true })
  await form.waitFor(); assert.equal(await form.getByPlaceholder('Enter product name').inputValue(), defaultShopProducts[0].name)
  await record(page, width + '-product-editor')
  await form.getByRole('button', { name: 'Manage', exact: true }).click()
  await form.locator('summary').filter({ hasText: 'Styles and advanced settings' }).click(); await record(page, width + '-product-media-and-styles')
  await form.getByRole('button', { name: 'Custom sizes', exact: true }).click(); await record(page, width + '-custom-sizes')
  await form.getByRole('textbox', { name: 'Custom sizes', exact: true }).fill('XXXL')
  await form.getByRole('button', { name: 'Add', exact: true }).click(); assert.equal(await form.getByRole('button', { name: 'XXXL', exact: true }).getAttribute('aria-pressed'), 'true')
  await form.getByRole('button', { name: 'Add specification', exact: true }).click()
  await form.getByRole('textbox', { name: 'Specification 3 name', exact: true }).fill('Packaging')
  await form.getByRole('button', { name: 'Save product', exact: true }).click()
  await form.getByRole('alert').waitFor(); await record(page, width + '-specification-validation')
  await form.getByRole('textbox', { name: 'Specification 3 options', exact: true }).fill('Single, Pair')
  const crop = async (trigger, name) => {
    const chooserEvent = page.waitForEvent('filechooser'); await trigger.click(); const chooser = await chooserEvent
    await chooser.setFiles({ name: 'qa-product.jpg', mimeType: 'image/jpeg', buffer: await readFile(new URL('../public/goodluck-running-vest.jpg', import.meta.url)) })
    const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true }); await dialog.waitFor()
    await dialog.getByRole('button', { name: 'Apply crop and upload', exact: true }).waitFor()
    await record(page, width + '-' + name)
    await dialog.getByRole('button', { name: 'Apply crop and upload', exact: true }).click(); await dialog.waitFor({ state: 'hidden' })
  }
  await crop(form.getByRole('button', { name: /^Replace.*Product main image$/ }), 'image-crop')
  await record(page, width + '-image-uploaded')
  await form.getByRole('button', { name: 'Save product', exact: true }).click()
  await form.getByRole('button', { name: 'Save product', exact: true }).waitFor(); await page.waitForTimeout(400)
  assert.equal(await form.getByRole('button', { name: 'Save product', exact: true }).isDisabled(), true)
  assert.equal(await form.getByRole('textbox', { name: 'Specification 3 options', exact: true }).inputValue(), 'Single, Pair')
  await record(page, width + '-product-saved')
  await form.getByPlaceholder('Summarize the product in one sentence').fill('Synthetic unsaved summary')
  const discardEvent = page.waitForEvent('dialog').then(async dialog => { assert.equal(dialog.message(), 'Discard unsaved changes to this product?'); await dialog.accept() })
  await form.getByRole('button', { name: 'Discard changes', exact: true }).click(); await discardEvent; await record(page, width + '-product-discarded')
  await form.getByRole('button', { name: 'Delete product', exact: true }).click(); await record(page, width + '-product-delete-confirmation')
  await page.getByRole('region', { name: 'Confirm product deletion', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Add product', exact: true }).click()
  form = page.getByRole('form', { name: 'Add product', exact: true }); await form.waitFor(); await record(page, width + '-new-product')
  await form.getByRole('button', { name: 'Create product', exact: true }).click(); await form.getByRole('alert').waitFor(); await record(page, width + '-new-product-validation')
  await form.getByPlaceholder('Enter product name').fill('QA New Product')
  await crop(form.getByRole('button', { name: /^Upload.*Product main image$/ }), 'new-product-crop')
  await form.getByRole('button', { name: 'Create product', exact: true }).click()
  form = page.getByRole('form', { name: 'Edit product', exact: true }); await form.waitFor(); await page.waitForTimeout(400)
  assert.equal(await form.getByPlaceholder('Enter product name').inputValue(), 'QA New Product'); await record(page, width + '-product-created')
  await form.getByRole('button', { name: 'Delete product', exact: true }).click()
  await page.getByRole('region', { name: 'Confirm product deletion', exact: true }).getByRole('button', { name: 'Confirm deletion', exact: true }).click()
  await page.waitForTimeout(500); assert.notEqual(await page.getByPlaceholder('Enter product name').inputValue(), 'QA New Product'); await record(page, width + '-product-deleted')
}
try {
  for (const width of [1440,375]) {
    const { ctx, page, data } = await open(width)
    await page.goto(base + '/admin')
    await page.getByRole('heading', { name: 'Season overview', exact: true }).waitFor()
    if (accountOnly) { await adminAccountActions({ page, width, data, record, base }); await ctx.close(); continue }
    if (actionOnly) { await adminSeasonActions({ page, width, data, record }); await ctx.close(); continue }
    if (productOnly) { await productChecks(page, width); await ctx.close(); continue }
    if (contentOnly) { await contentChecks({ page, width, data, record }); await ctx.close(); continue }
    await record(page, width + '-overview')
    const nav = page.getByRole('navigation', { name: 'Main administrator navigation' })
    for (const [tab, label] of [['students','Student'],['coaches','Coach'],['seasons','Seasons'],['products','Products'],['content','Site content'],['reconciliation','Reconciliation'],['paymentAccounts','Payment accounts']]) {
      if (width > 768) await page.locator('#admin-tab-' + tab).click()
      else if (['students','coaches','reconciliation'].includes(tab)) await nav.getByRole('button', { name: label, exact: true }).click()
      else { await nav.getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: new RegExp('^' + label) }).click() }
      await record(page, width + '-' + tab)
      if (tab === 'students' && width === 375) {
        await page.getByRole('button', { name: 'View details', exact: true }).first().click()
        for (const label of ['Classes and access', 'Payment history', 'Training feedback', 'Notes']) {
          await page.getByRole('tab', { name: label, exact: true }).click()
          await record(page, '375-student-' + label.toLowerCase().replaceAll(' ', '-'))
        }
        await page.getByRole('tab', { name: 'Classes and access', exact: true }).click()
        await page.getByRole('button', { name: 'Review coach assignment', exact: true }).click()
        await page.getByRole('dialog', { name: 'Class coach assignment' }).waitFor(); await record(page, '375-student-coach-assignment')
        await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
      }
      if (tab === 'paymentAccounts' && width === 375) {
        await page.getByRole('button', { name: '+ Add payment account', exact: true }).click()
        await page.getByRole('dialog', { name: 'Add payment account', exact: true }).waitFor(); await record(page, '375-add-payment-account')
        await page.getByRole('dialog').getByRole('button', { name: 'Create Account', exact: true }).click()
        await page.getByRole('alert').filter({ hasText: 'Enter the channel name, account holder, bank name, and account number.' }).waitFor(); await record(page, '375-payment-account-validation')
        await page.getByRole('button', { name: 'Close add payment account', exact: true }).click()
      }
      if (tab === 'coaches') {
        await page.locator('summary').filter({ hasText: 'Scheduled: Coach QA' }).click()
        await record(page, width + '-duty-details')
        for (const label of ['Approve leave', 'Reject leave', 'Assign / Change substitute', 'Confirm emergency substitute']) {
          await page.getByRole('button', { name: label, exact: true }).click()
          const dialog = page.getByRole('dialog', { name: label, exact: true }); await dialog.waitFor()
          await record(page, width + '-duty-' + label.toLowerCase().replaceAll(/[^a-z]+/g, '-'))
          if (label === 'Reject leave') { await dialog.getByRole('button', { name: 'Confirm rejection', exact: true }).click(); await dialog.getByRole('alert').waitFor(); await record(page, width + '-duty-required-reason') }
          await dialog.getByRole('button', { name: 'Close action dialog', exact: true }).click()
        }
        await page.getByRole('button', { name: 'Correct attendance manually', exact: true }).click()
        const dialog = page.getByRole('dialog', { name: 'Correct attendance manually', exact: true })
        await dialog.getByRole('button', { name: 'Save check-in', exact: true }).click(); await dialog.getByRole('alert').waitFor()
        await record(page, width + '-duty-correction-validation')
        await dialog.getByPlaceholder('Explain why a manual correction is needed').fill('Synthetic correction')
        await dialog.getByRole('button', { name: 'Late', exact: true }).click()
        await dialog.getByRole('button', { name: 'Save check-in', exact: true }).click()
        await dialog.waitFor({ state: 'hidden' }); await record(page, width + '-duty-corrected')
      }
      if (tab === 'seasons') {
        const detailButton = () => page.getByRole('button', { name: "View Student QA 0's registration", exact: true })
        await detailButton().click()
        await page.getByRole('dialog', { name: 'Student registration details' }).waitFor()
        assert.equal(await page.locator('[translate="no"]').filter({ hasText: '學員原文備註保留' }).count(), 1)
        await record(page, width + '-registration-details')
        const alertEvent = page.waitForEvent('dialog').then(async dialog => { assert.equal(dialog.type(), 'alert'); assert.match(dialog.message(), /verification evidence/); assert.doesNotMatch(dialog.message(), /[\u3400-\u9fff]/u); await dialog.accept() })
        await page.getByRole('button', { name: 'Confirm payment (administrator)', exact: true }).click(); await alertEvent
        await record(page, width + '-payment-validation')
        await page.getByPlaceholder('Record verification results or required information', { exact: true }).fill('Synthetic bank verification')
        const confirmEvent = page.waitForEvent('dialog').then(async dialog => { assert.equal(dialog.type(), 'confirm'); assert.match(dialog.message(), /actual receipt/); assert.doesNotMatch(dialog.message(), /[\u3400-\u9fff]/u); await dialog.accept() })
        await page.getByRole('button', { name: 'Confirm payment (administrator)', exact: true }).click(); await confirmEvent
        await page.getByRole('dialog').waitFor({ state: 'hidden' }); await record(page, width + '-payment-confirmed')
        await detailButton().click(); assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Payment confirmed', exact: true }).isDisabled(), true)
        await page.getByRole('button', { name: 'Additional payment waived', exact: true }).click()
        await page.getByRole('dialog').waitFor({ state: 'hidden' }); await detailButton().click()
        await record(page, width + '-billing-resolved')
        await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
        const downloadEvent = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Export all details', exact: true }).click()
        const download = await downloadEvent, csv = await readFile(await download.path(), 'utf8')
        assert.match(download.suggestedFilename(), /student-roster\.csv$/)
        assert.ok(csv.includes('學員原文備註保留'))
        const missingHeaders = csv.split('\r\n')[0].split(',').filter(s => /[\u3400-\u9fff]/u.test(s))
        records.push({ name: width + '-export-headers', missing: missingHeaders, overflow: false })
        await page.getByRole('button', { name: 'Synchronization settings', exact: true }).click()
        await page.getByRole('dialog', { name: 'Google Sheets synchronization settings' }).waitFor(); await record(page, width + '-sync-settings')
        await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
        await page.getByRole('button', { name: 'Shop orders', exact: true }).click()
        await page.getByRole('button', { name: "View Customer QA's order", exact: true }).click(); await record(page, width + '-shop-order')
        const deleteEvent = page.waitForEvent('dialog').then(async dialog => { assert.match(dialog.message(), /Reserved stock will also be released/); assert.doesNotMatch(dialog.message(), /[\u3400-\u9fff]/u); await dialog.dismiss() })
        await page.getByRole('button', { name: 'Delete record', exact: true }).click(); await deleteEvent
        await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
      }
    }
    await ctx.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, [])
  if (process.env.LANGUAGE_AUDIT_STRICT === '1') assert.deepEqual(records.filter(r => r.missing.length || r.overflow), [])
} finally { await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2)); await browser.close() }
