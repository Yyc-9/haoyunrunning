// Local shop QA: synthetic stock/orders only, with all business and external traffic intercepted.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { defaultShopProducts } from '../lib/shop-products.ts'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN || 'http://127.0.0.1:3202'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local preview required')
if (!process.env.LANGUAGE_CONTENT_FILE || !process.env.LANGUAGE_AUTH_STORAGE_KEY) throw Error('Provide public content and auth storage key')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const output = '/private/tmp/haoyun-english-shop'
await mkdir(output, { recursive: true })
const records = [], errors = [], unexpected = [], writes = []
const catalog = defaultShopProducts.map((p, i) => ({ ...p, price: (i + 1) * 30000, stockQuantity: 4, active: true }))
catalog[0].specifications.push({ label: '顏色', value: '黑色' })
const savedCart = [{ id: 'qa-cart', productId: '1', variantId: 'purple-white', size: 'M', selectedSpecifications: [{ label: '顏色', value: '黑色' }], name: catalog[0].name, price: catalog[0].price, quantity: 1, image: '' }]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
async function open(width, scenario = 'normal') {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
  const id = '1ed770c5-3666-4f30-bae1-1f6e08bcd9d4', expiry = Math.floor(Date.now() / 1000) + 3600
  const user = { id, email: 'shop@example.invalid', role: 'authenticated', aud: 'authenticated', user_metadata: { name: 'Shop QA' } }
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: id, exp: expiry, role: 'authenticated' })).toString('base64url') + '.synthetic'
  const cart = ['stale-cart','catalog-error','payment-info-error'].includes(scenario) ? structuredClone(savedCart) : []
  if (scenario === 'stale-cart') cart[0].selectedSpecifications = []
  await ctx.addInitScript(({ user, expiry, token, key, cart, scenario }) => { localStorage.setItem('language', 'en'); localStorage.setItem('goodluck-cart', JSON.stringify(cart)); if (scenario !== 'guest') localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user })) }, { user, expiry, token, key: process.env.LANGUAGE_AUTH_STORAGE_KEY, cart, scenario })
  let submissions = 0
  await ctx.routeWebSocket('**/*', socket => socket.close())
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.origin !== base) return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (!['GET','HEAD'].includes(method)) writes.push({ path: url.pathname, method })
    if (url.pathname === '/api/site-content') return reply({ content, source: 'database' })
    if (url.pathname === '/api/account/me') return reply({ profile: { ...user, name: 'Shop QA', role: 'student' } })
    if (url.pathname === '/api/notifications') return reply({ staff: false, unreadCount: 0, items: [] })
    if (url.pathname === '/api/shop/products') {
      if (scenario === 'catalog-error') return reply({ error: '商品資料載入失敗。' }, 503)
      const products = structuredClone(catalog)
      if (scenario === 'sold-out') products[0].stockQuantity = 0
      if (scenario === 'enquiry') products[0].price = 0
      return reply({ products: scenario === 'empty' ? [] : products })
    }
    if (url.pathname === '/api/shop/payment-info') return scenario === 'payment-info-error' ? reply({ error: '匯款資料暫時無法讀取。' }, 503) : reply({ bankName: 'QA Bank', bankCode: '000', accountNumber: '00000000', qrCodeUrl: '' })
    if (url.pathname === '/api/shop/orders') {
      assert.equal(method, 'POST'); const body = req.postDataJSON()
      assert.equal(body.customerName, 'QA Customer'); assert.equal(body.transferLastFive, '00123')
      assert.equal(body.items[0].size, 'M'); assert.equal(body.items[0].variantId, 'black-blue')
      assert.deepEqual(body.items[0].selectedSpecifications, [{ label: '顏色', value: '黑色' }])
      assert.match(body.fulfillmentNote, /保留顧客原文/)
      submissions++
      if (submissions === 1) return reply({ error: '庫存不足：1' }, 409)
      return reply({ order: { id: 'qa-order', orderNumber: 'QA-SHOP-001', itemCount: 2, status: 'pending_review', accessToken: 'synthetic-only' } })
    }
    if (url.pathname === '/api/course-enrollments/mine') {
      if (scenario === 'payment-error') return reply({ error: '匯款狀態讀取失敗。' }, 503)
      return reply({ enrollments: scenario === 'empty' ? [] : ['pending_transfer','pending_review','approved','rejected'].map((status, i) => ({ id: 'qa-' + i, status, courseName: '竹北夜跑班', courseSlug: 'zhubei-night-run-monday', amountText: 'NT$3,600', transferLastFive: i ? '00123' : '', createdAt: new Date().toISOString(), paymentSubmittedAt: i ? new Date().toISOString() : null, reviewNote: i === 3 ? '保留財務原始說明' : null })) })
    }
    unexpected.push(url.pathname); return reply({ error: 'Unmocked API blocked' }, 503)
  })
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message))
  return { ctx, page }
}
async function record(page, name) {
  await page.waitForTimeout(450)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  const state = await page.evaluate(() => {
    const missing = [], han = /[\u3400-\u9fff]/u, visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) { const p = w.currentNode.parentElement, s = w.currentNode.nodeValue.trim(); if (p && !p.closest('script,style,textarea,[translate="no"]') && (visible(p) || p.closest('select') && visible(p.closest('select'))) && han.test(s)) missing.push(s) }
    for (const e of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) if (visible(e)) for (const a of ['aria-label','placeholder','title','alt']) if (han.test(e.getAttribute(a) || '')) missing.push(a + ': ' + e.getAttribute(a))
    if (han.test(document.title)) missing.push('title: ' + document.title)
    return { missing: [...new Set(missing)], overflow: document.documentElement.scrollWidth > innerWidth, font: getComputedStyle(document.body).fontFamily }
  })
  records.push({ name, ...state }); await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2)); console.log(`${name}: ${state.missing.length} untranslated; overflow=${state.overflow}`)
  await page.screenshot({ path: output + '/' + name + '.png', fullPage: true })
}
try {
  for (const width of [1440,375]) {
    const { ctx, page } = await open(width)
    await page.goto(base + '/shop'); await page.getByRole('heading', { name: 'Nurture Racing Singlet', exact: true }).waitFor(); await record(page, width + '-catalog')
    await page.getByPlaceholder('Search products', { exact: true }).fill('racing singlet')
    await page.getByRole('heading', { name: 'Nurture Racing Singlet', exact: true }).waitFor(); assert.equal(await page.locator('.shop-product-card').count(), 1); await record(page, width + '-english-search')
    await page.getByPlaceholder('Search products', { exact: true }).fill('no-match-qa'); await page.getByRole('button', { name: 'Clear search', exact: true }).waitFor(); await record(page, width + '-no-results')
    for (const product of catalog) { await page.goto(base + '/shop/' + product.id); await page.locator('h1').waitFor(); await page.getByRole('heading', { name: 'Product description', exact: true }).waitFor(); await record(page, width + '-product-' + product.id) }
    await page.goto(base + '/shop/1'); await page.getByRole('button', { name: 'Obsidian Blue', exact: true }).click(); await page.getByRole('button', { name: 'M', exact: true }).click()
    await page.getByRole('button', { name: 'Increase quantity', exact: true }).click()
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await page.getByRole('dialog').waitFor(); await record(page, width + '-cart')
    const stored = JSON.parse(await page.evaluate(() => localStorage.getItem('goodluck-cart'))); assert.equal(stored[0].quantity, 2); assert.equal(stored[0].variantId, 'black-blue')
    await page.getByRole('dialog').getByRole('link', { name: 'Checkout', exact: true }).click()
    await page.getByRole('heading', { name: 'Review your order', exact: true }).waitFor(); await record(page, width + '-checkout')
    const submit = page.getByRole('button', { name: 'Submit transfer and pickup order', exact: true }); assert.equal(await submit.isDisabled(), true)
    await page.locator('summary').filter({ hasText: 'View Nurture transfer account' }).click(); await page.getByText('QA Bank', { exact: true }).waitFor(); await record(page, width + '-bank-details')
    await page.getByPlaceholder('Customer name', { exact: true }).fill('QA Customer'); await page.getByPlaceholder('Mobile number or LINE ID', { exact: true }).fill('0900000000')
    await page.getByPlaceholder('Size or other requests (optional)', { exact: true }).fill('保留顧客原文')
    await page.getByPlaceholder('12345', { exact: true }).fill('00123'); await submit.click()
    await page.getByRole('alert').filter({ hasText: 'Not enough stock: 1' }).waitFor(); await record(page, width + '-order-error')
    await submit.click(); await page.getByRole('heading', { name: 'Order submitted; awaiting payment verification', exact: true }).waitFor(); await record(page, width + '-order-submitted')
    assert.equal(await page.evaluate(() => localStorage.getItem('goodluck-cart')), '[]')
    await page.goto(base + '/payment'); await page.getByText('保留財務原始說明', { exact: true }).waitFor(); await record(page, width + '-payment-states')
    await ctx.close()
  }
  for (const [scenario, route] of [['sold-out','/shop/1'],['enquiry','/shop/1'],['empty','/shop'],['empty','/checkout'],['empty','/payment'],['normal','/shop/missing'],['stale-cart','/checkout'],['catalog-error','/checkout'],['catalog-error','/shop'],['payment-info-error','/checkout'],['payment-error','/payment'],['guest','/payment']]) {
    const { ctx, page } = await open(375, scenario); await page.goto(base + route); await page.waitForTimeout(1000)
    if (scenario === 'payment-info-error') await page.locator('summary').filter({ hasText: 'View Nurture transfer account' }).click()
    await record(page, scenario + '-' + route.replaceAll('/','-')); await ctx.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, [])
  if (process.env.LANGUAGE_AUDIT_STRICT === '1') assert.deepEqual(records.filter(r => r.missing.length || r.overflow), [])
} finally { await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected, writes }, null, 2)); await browser.close() }
