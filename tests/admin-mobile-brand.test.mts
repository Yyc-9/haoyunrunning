import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../components/admin/AdminMobileDashboard.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../components/admin/admin-mobile-dashboard.css', import.meta.url), 'utf8')
const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('手機後台沿用首頁 Logo、導航元件樣式與品牌色', () => {
  assert.match(dashboard, /<WeekdayLogo brandName=/)
  for (const name of ['mobile-bottom-nav-inner', 'mobile-bottom-nav-item', 'mobile-bottom-nav-icon']) {
    assert.ok(dashboard.includes(name))
    assert.ok(globalStyles.includes(`.${name}`))
  }
  assert.match(styles, /--mobile-accent: var\(--site-mobile-accent\)/)
  assert.match(styles, /--mobile-ink: var\(--site-mobile-ink\)/)
  assert.match(dashboard, /productEditState\.dirty && !window\.confirm/)
})

test('手機後台保留管理入口與小屏安全區，不套用前台業務入口', () => {
  for (const title of ['總覽', '對帳', '學員', '教練', '更多']) assert.ok(dashboard.includes(title))
  assert.doesNotMatch(styles, /min-height: 520px/)
  assert.doesNotMatch(styles, /font-size: (9|10|11)px/)
  assert.match(styles, /env\(safe-area-inset-bottom/)
  assert.match(styles, /font-size: 16px/)
  assert.match(styles, /@media \(min-width: 768px\)/)
})
