// Run against an isolated local checkout containing the temporary error preview route.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base || '')) throw Error('Isolated local preview required')
const { content } = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const output = '/private/tmp/haoyun-english-system'
await mkdir(output, { recursive: true })
const records = [], errors = [], unexpected = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
async function record(page, name) {
  await page.waitForTimeout(500)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  const state = await page.evaluate(() => {
    const missing = [], han = /[\u3400-\u9fff]/u, visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) { const p = walker.currentNode.parentElement, s = walker.currentNode.nodeValue.trim(); if (p && !p.closest('script,style,textarea,[translate="no"]') && visible(p) && han.test(s)) missing.push(s) }
    for (const e of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) if (visible(e)) for (const a of ['aria-label','placeholder','title','alt']) if (han.test(e.getAttribute(a) || '')) missing.push(a + ': ' + e.getAttribute(a))
    return { missing, overflow: document.documentElement.scrollWidth > innerWidth, font: getComputedStyle(document.body).fontFamily }
  })
  records.push({ name, ...state }); await page.screenshot({ path: output + '/' + name + '.png', fullPage: true, animations: 'disabled' }); console.log(`${name}: ${state.missing.length} untranslated; overflow=${state.overflow}`)
}
try {
  for (const width of [1440, 375]) {
    const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' })
    await ctx.addInitScript(() => localStorage.setItem('language', 'en'))
    let contentMode = 'success', releaseLoading
    await ctx.routeWebSocket('**/*', socket => socket.close())
    await ctx.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url())
      if (url.origin !== base) return route.abort()
      if (!url.pathname.startsWith('/api/')) return route.continue()
      assert.ok(['GET', 'HEAD'].includes(req.method()), 'No business mutations allowed')
      if (url.pathname === '/api/site-content') {
        const mode = contentMode
        if (mode === 'loading') await new Promise(resolve => { releaseLoading = resolve })
        return route.fulfill({ status: mode === 'success' ? 200 : 503, contentType: 'application/json', body: JSON.stringify(mode === 'success' ? { content, source: 'database' } : { error: 'Synthetic content failure' }) })
      }
      if (url.pathname === '/api/notifications') return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
      unexpected.push(url.pathname); return route.abort()
    })
    const page = await ctx.newPage(); page.on('pageerror', error => errors.push(error.message))
    const response = await page.goto(base + '/qa-missing-page'); assert.equal(response.status(), 404)
    await page.getByRole('heading', { name: 'Page not found', exact: true }).waitFor(); await record(page, width + '-404')
    await page.goto(base + '/qa-language-errors'); await page.getByRole('heading', { name: 'Something went wrong', exact: true }).waitFor(); await record(page, width + '-error')
    await page.getByRole('button', { name: 'Show details', exact: true }).click(); await page.getByText('Synthetic diagnostic 原始診斷文字', { exact: true }).waitFor(); await record(page, width + '-error-details')
    assert.equal(await page.locator('[translate="no"]').filter({ hasText: 'Synthetic diagnostic 原始診斷文字' }).count(), 1)
    await page.getByRole('button', { name: 'Try again', exact: true }).click(); await page.getByText('Retry count: 1', { exact: true }).waitFor()
    contentMode = 'loading'; await page.getByRole('button', { name: 'Preview content failure', exact: true }).click(); await page.getByRole('heading', { name: 'Loading website content…', exact: true }).waitFor(); await record(page, width + '-content-loading')
    assert.equal(await page.getByRole('button', { name: 'Reload', exact: true }).isDisabled(), true)
    contentMode = 'failure'; releaseLoading(); await page.getByRole('heading', { name: 'Website content is temporarily unavailable', exact: true }).waitFor(); await record(page, width + '-content-failure')
    contentMode = 'success'; await page.getByRole('button', { name: 'Reload', exact: true }).click(); await page.getByText('Content recovered', { exact: true }).waitFor(); await record(page, width + '-content-recovered')
    await ctx.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []); assert.deepEqual(records.filter(r => r.missing.length || r.overflow), [])
} finally { await writeFile(output + '/report.json', JSON.stringify({ records, errors, unexpected }, null, 2)); await browser.close() }
