// Read-only rendered-language audit. Uses an isolated browser; never submits forms.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.LANGUAGE_AUDIT_ORIGIN || 'https://nurturerunningteam.com'
const output = process.env.LANGUAGE_AUDIT_OUTPUT || '/private/tmp/haoyun-english-audit'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: Number(process.env.LANGUAGE_AUDIT_WIDTH || 1440), height: 1000 } })
await context.addInitScript(() => localStorage.setItem('language', 'en'))
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }))
const routes = process.env.LANGUAGE_AUDIT_ROUTES?.split(',') || ['/', '/courses', '/team', '/achievements', '/about', '/testimonials', '/shop', '/group-signup', '/anniversary', '/privacy', '/terms', '/refund-policy', '/invoice', '/checkout', '/payment', '/profile', '/profile/edit', '/student', '/coach', '/coach/attendance', '/coach/planner', '/coach/signups', '/coach/students', '/finance', '/notifications', '/admin']
const records = []
try {
  if (!process.env.LANGUAGE_AUDIT_ROUTES) {
    const response = await context.request.get(origin + '/api/site-content')
    if (!response.ok()) throw new Error('Published content could not be loaded for route discovery')
    const { content } = await response.json()
    for (const [slug, course] of Object.entries(content.courseOverrides || {})) {
      if (course.active !== false) routes.push(`/courses/${slug}`, `/courses/${slug}/register`)
    }
  }
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.evaluate(async () => {
      for (let top = 0; top < document.body.scrollHeight; top += window.innerHeight) {
        window.scrollTo({ top, behavior: 'instant' }); await new Promise(resolve => setTimeout(resolve, 100))
      }
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
    await page.waitForTimeout(350)
    const record = await page.evaluate(() => {
      const han = /[\u3400-\u9fff]/u
      const visible = element => element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const text = [], hiddenText = [], originalContent = []
      while (walker.nextNode()) {
        const node = walker.currentNode, parent = node.parentElement
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) continue
        const value = node.nodeValue.trim()
        if (han.test(value)) (parent.closest('[translate="no"], [data-no-localize]') ? originalContent : visible(parent) ? text : hiddenText).push({ value, tag: parent.tagName })
      }
      const attributes = []
      for (const element of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) {
        if (!visible(element)) continue
        for (const name of ['aria-label', 'placeholder', 'title', 'alt']) {
          const value = element.getAttribute(name)
          if (value && han.test(value)) attributes.push({ name, value, tag: element.tagName })
        }
      }
      const controls = [...document.querySelectorAll('.site-navigation a, .site-navigation button')].filter(visible)
      const navigationOverlaps = []
      for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
        if (controls[i].contains(controls[j]) || controls[j].contains(controls[i])) continue
        const a = controls[i].getBoundingClientRect(), b = controls[j].getBoundingClientRect()
        if (Math.min(a.right,b.right) > Math.max(a.left,b.left) + 1 && Math.min(a.bottom,b.bottom) > Math.max(a.top,b.top) + 1) navigationOverlaps.push([controls[i].textContent, controls[j].textContent])
      }
      return { title: document.title, language: document.documentElement.lang, text, hiddenText, attributes, originalContent, navigationOverlaps,
        mainTextLength: (document.querySelector('main')?.textContent || '').length,
        font: getComputedStyle(document.body).fontFamily, overflow: document.documentElement.scrollWidth > window.innerWidth,
        links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')) }
    })
    if (route === '/courses') for (const link of record.links) if (/^\/courses\/[^/?]+$/.test(link) && !routes.includes(link)) routes.push(link, link + '/register')
    if (route === '/shop') for (const link of record.links) if (/^\/shop\/[^/?]+$/.test(link) && !routes.includes(link)) routes.push(link)
    delete record.links
    records.push({ route, status: response?.status(), ...record })
    await writeFile(output + '/report.json', JSON.stringify({ records, errors }, null, 2))
    console.log(`${route}: ${record.text.length} text, ${record.attributes.length} attributes; overflow=${record.overflow}`)
    if (['/', '/courses', '/notifications'].includes(route)) await page.screenshot({ path: output + '/' + (route.replaceAll('/', '-') || 'home') + '.png', fullPage: true })
  }
} finally { await context.close(); await browser.close() }
