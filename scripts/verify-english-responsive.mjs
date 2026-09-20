import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.LANGUAGE_AUDIT_ORIGIN || 'http://127.0.0.1:3202'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local preview required')
const output = '/private/tmp/haoyun-english-responsive'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = [], errors = []
try {
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
    await context.addInitScript(() => localStorage.setItem('language', 'en'))
    await context.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort())
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Discover running. Become a more consistent runner.' }).waitFor()
    await page.waitForTimeout(800)
    const layout = await page.evaluate(() => {
      const visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
      const controls = [...document.querySelectorAll('.site-navigation button,.site-navigation a')].filter(visible)
      const overlaps = []
      for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
        if (controls[i].contains(controls[j]) || controls[j].contains(controls[i])) continue
        const a = controls[i].getBoundingClientRect(), b = controls[j].getBoundingClientRect()
        if (Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1) overlaps.push([controls[i].textContent, controls[j].textContent])
      }
      const title = document.querySelector('.home-hero-copy h1')
      const box = title.getBoundingClientRect()
      return { overlaps, overflow: document.documentElement.scrollWidth > innerWidth, titleClipped: box.left < 0 || box.right > innerWidth || title.scrollWidth > title.clientWidth + 1, font: getComputedStyle(document.body).fontFamily, tracking: getComputedStyle(title).letterSpacing }
    })
    assert.equal(layout.overflow, false)
    assert.equal(layout.titleClipped, false)
    assert.deepEqual(layout.overlaps, [])
    await page.screenshot({ path: `${output}/home-${width}.png` })
    if (!await page.getByRole('button', { name: 'Log In', exact: true }).count()) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Log In', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    async function checkDialog(mode) {
      await page.waitForTimeout(250)
      const state = await dialog.evaluate(root => {
        const missing = []
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        while (walker.nextNode()) if (/[\u3400-\u9fff]/u.test(walker.currentNode.nodeValue || '')) missing.push(walker.currentNode.nodeValue.trim())
        for (const e of root.querySelectorAll('[aria-label],[placeholder],[title]')) for (const attr of ['aria-label','placeholder','title']) if (/[\u3400-\u9fff]/u.test(e.getAttribute(attr) || '')) missing.push(`${attr}: ${e.getAttribute(attr)}`)
        const rect = root.getBoundingClientRect()
        return { missing, fits: rect.x >= 0 && rect.right <= innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }
      })
      assert.deepEqual(state.missing, [])
      assert.equal(state.fits, true)
      assert.equal(state.overflow, false)
      results.push({ width, mode, ...state })
    }
    await checkDialog('login')
    await dialog.getByRole('button', { name: 'No account yet? Sign up now', exact: true }).click()
    await checkDialog('create-account')
    await dialog.getByLabel('Password', { exact: true }).fill('Typed value stays unchanged')
    await dialog.getByRole('button', { name: 'Show password', exact: true }).click()
    assert.equal(await dialog.getByLabel('Password', { exact: true }).inputValue(), 'Typed value stays unchanged')
    await dialog.getByRole('button', { name: 'Hide password', exact: true }).click()
    await page.keyboard.press('Escape')
    await context.close()
    console.log(`PASS ${width}px: English hero, navigation, sign-in and registration dialogs`)
  }
  assert.deepEqual(errors, [])
} finally {
  await writeFile(output + '/report.json', JSON.stringify({ results, errors }, null, 2))
  await browser.close()
}
