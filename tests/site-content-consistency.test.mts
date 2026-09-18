import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('內容接口禁止 CDN 過期回傳，故障回傳 503 而不是舊預設內容', () => {
  const api = source('app/api/site-content/route.ts')
  assert.match(api, /status: 503/)
  assert.match(api, /'Vercel-CDN-Cache-Control': 'no-store'/)
  assert.match(api, /'Cache-Control': 'no-store, max-age=0'/)
  assert.doesNotMatch(api, /stale-while-revalidate|defaultSiteContent|source: 'fallback'/)
  const server = source('lib/public-site-content-server.ts')
  assert.match(server, /if \(error\) throw error/)
  assert.match(server, /if \(coachError\) throw coachError/)
  assert.doesNotMatch(server, /unstable_cache/)
})

test('首屏使用當次資料，更新失敗不得覆蓋已發布內容', () => {
  const layout = source('app/layout.tsx')
  const provider = source('app/site-content-provider.tsx')
  assert.match(layout, /dynamic = 'force-dynamic'/)
  assert.match(layout, /initialContent=\{initialContent\}/)
  assert.match(provider, /initialContent \?\? defaultSiteContent/)
  assert.match(provider, /payload\.source === 'database'/)
  assert.match(provider, /hasSyncedContent \|\| pathname.startsWith\('\/admin'\)/)
  assert.doesNotMatch(provider, /setContent\(defaultSiteContent\)/)
  for (const event of ['online', 'pageshow', 'visibilitychange']) assert.ok(provider.includes(`'${event}'`))
})

test('首頁相片與滑動軌跡只使用發布清單，不混入寫死舊相片', () => {
  const hero = source('components/HeroSection.tsx')
  assert.doesNotMatch(hero, /storyImages|about-belief-speed|testimonial-together/)
  assert.match(hero, /managedImages.slice\(0, 3\)/)
  const server = source('lib/home-content-server.ts')
  assert.doesNotMatch(server, /defaultHeroSlides|unstable_cache/)
})
