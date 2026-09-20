// Run against a local production build. All mutations are confined to this browser.
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.LANGUAGE_TEST_ORIGIN || 'http://127.0.0.1:3201'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext()
  await context.addInitScript(() => localStorage.setItem('language', 'en'))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.lang === 'en')
  // Allow the initial streamed metadata and hydration to finish before editing it.
  await page.waitForTimeout(1000)
  await page.evaluate(async () => {
    const host = document.createElement('section')
    host.id = 'language-regression'
    host.innerHTML = '<span id="first"></span><span id="second"></span><img id="image"><input id="input"><span translate="no" id="untouched">查看完整課表</span>'
    document.body.append(host)
    // Distinct observer batches arrive before the next animation frame.
    document.querySelector('#first').textContent = '查看完整課表'
    await Promise.resolve()
    document.querySelector('#second').textContent = '好運商店'
    document.querySelector('#image').alt = '查看完整課表'
    document.querySelector('#input').value = '查看完整課表'
    document.querySelector('#input').placeholder = '查看完整課表'
    document.title = '好運商店'
  })
  await page.waitForFunction(() => document.querySelector('#first').textContent === 'View Full Schedule' && document.querySelector('#second').textContent === 'Nurture Running Shop')
  await page.waitForFunction(() => document.title === 'Nurture Running Shop')
  const result = await page.evaluate(() => ({
    alt: document.querySelector('#image').alt,
    placeholder: document.querySelector('#input').placeholder,
    input: document.querySelector('#input').value,
    untouched: document.querySelector('#untouched').textContent,
    title: document.title,
    font: getComputedStyle(document.body).fontFamily,
  }))
  assert.equal(result.alt, 'View Full Schedule')
  assert.equal(result.placeholder, 'View Full Schedule')
  assert.equal(result.input, '查看完整課表')
  assert.equal(result.untouched, '查看完整課表')
  assert.equal(result.title, 'Nurture Running Shop')
  assert.match(result.font, /Segoe UI/)
  await page.evaluate(() => {
    const title = document.createElement('title')
    title.textContent = '查看完整課表'
    document.querySelector('title').replaceWith(title)
  })
  await page.waitForFunction(() => document.title === 'View Full Schedule')
  const mutations = await page.evaluate(() => new Promise(resolve => {
    let count = 0
    const observer = new MutationObserver(records => { count += records.length })
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    setTimeout(() => { observer.disconnect(); resolve(count) }, 300)
  }))
  assert.equal(mutations, 0, 'Localized title must settle without an observer loop')
  assert.deepEqual(errors, [])
  console.log('PASS: mutation batches, attributes, title replacement, idle title, user input, opt-out, and English font stack')
} finally {
  await browser.close()
}
