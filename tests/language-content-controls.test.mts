import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import { languages } from '../lib/dictionary.ts'
import {
  toSimplifiedWebsiteText,
  toTraditionalWebsiteText,
} from '../lib/traditional-chinese.ts'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context)
    }
    return nextResolve(specifier, context)
  },
})

test('網站提供繁體、簡體與英文三種語言入口', () => {
  assert.deepEqual(languages.map((language) => language.code), ['zh-TW', 'zh-CN', 'en'])
})

test('簡繁轉換保留跑班常用詞與馬拉松正字', () => {
  const traditional = '網站內容與課程聯絡、團隊陣容、圖片輪播與檔案預覽，四週年紀念，陪跑者完成波士頓馬拉松。'
  const simplified = '网站内容与课程联络、团队阵容、图片轮播与档案预览，四周年纪念，陪跑者完成波士顿马拉松。'

  assert.equal(toSimplifiedWebsiteText(traditional), simplified)
  assert.equal(toTraditionalWebsiteText(simplified), traditional)
  assert.equal(toTraditionalWebsiteText('波士顿马拉鬆'), '波士頓馬拉松')
})

test('英文入口涵蓋內容中心的學員見證與常見問題', async () => {
  const { toEnglishWebsiteText } = await import('../lib/english-website.ts')

  assert.equal(toEnglishWebsiteText('跑者的成長路徑'), 'Runner Growth Path')
  assert.equal(toEnglishWebsiteText('新手可以參加嗎？'), 'Can beginners join?')
  assert.match(toEnglishWebsiteText('可以。請先依目前跑齡、訓練習慣與目標選擇合適班級；若不確定，可透過 Instagram 詢問。'), /^Yes\./)
  assert.equal(
    toEnglishWebsiteText('https://example.com/pages/2026-07-12/4058195a.jpg'),
    'https://example.com/pages/2026-07-12/4058195a.jpg'
  )
})

test('英文切回繁體或簡體時會從原始中文重新轉換', async () => {
  const {
    createLocalizationMemory,
    localizeRememberedValue,
  } = await import('../lib/language-dom.ts')
  const memory = createLocalizationMemory()
  const textNode = {}
  const traditional = '跑者的成長路徑'

  const english = localizeRememberedValue(textNode, 'text', traditional, 'en', memory)
  assert.equal(english, 'Runner Growth Path')
  assert.equal(
    localizeRememberedValue(textNode, 'text', english, 'zh-TW', memory),
    traditional,
  )

  const englishAgain = localizeRememberedValue(textNode, 'text', traditional, 'en', memory)
  assert.equal(
    localizeRememberedValue(textNode, 'text', englishAgain, 'zh-CN', memory),
    '跑者的成长路径',
  )
})

test('訓練日程內容資料會補齊常見問題與頁尾重點', async () => {
  const { normalizeCoursesPageContent, siteContentFromRows } = await import('../lib/site-content.ts')
  const normalized = normalizeCoursesPageContent({ heroTitle: '自訂訓練日程' })
  const fromRows = siteContentFromRows([
    { key: 'courses_page_content', value: { faqTitle: '報名前常見問題' } },
  ])

  assert.equal(normalized.heroTitle, '自訂訓練日程')
  assert.equal(normalized.faqs.length, 5)
  assert.equal(normalized.highlights.length, 3)
  assert.equal(fromRows.coursesPage.faqTitle, '報名前常見問題')
  assert.equal(fromRows.coursesPage.faqs.length, 5)

  const admin = readFileSync(new URL('../components/admin/AdminContentManager.tsx', import.meta.url), 'utf8')
  const publicPage = readFileSync(new URL('../components/CoursesSection.tsx', import.meta.url), 'utf8')

  assert.match(admin, /coursesPage\.faqs/)
  assert.match(publicPage, /coursesPage\.faqs/)
  assert.match(publicPage, /coursesPage\.highlights/)
})

test('學員見證成長路徑有獨立且安全的主視覺', async () => {
  const { normalizePageMedia } = await import('../lib/site-content.ts')
  const fallback = normalizePageMedia({})
  const customized = normalizePageMedia({ testimonialPathHero: '/uploads/testimonial-path.webp' })

  assert.match(fallback.testimonialPathHero, /^\/site-visuals\//)
  assert.equal(customized.testimonialPathHero, '/uploads/testimonial-path.webp')

  const admin = readFileSync(new URL('../components/admin/AdminContentManager.tsx', import.meta.url), 'utf8')
  const publicPage = readFileSync(new URL('../app/testimonials/page.tsx', import.meta.url), 'utf8')

  assert.match(admin, /value=\{pageMedia\.testimonialPathHero\}/)
  assert.match(publicPage, /src=\{pageMedia\.testimonialPathHero\}/)
  assert.match(publicPage, /testimonials\.themes\.map/)
  assert.doesNotMatch(publicPage, /testimonialThemeImages/)
  assert.doesNotMatch(publicPage, /<article/)
})
