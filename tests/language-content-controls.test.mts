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

test('城市篩選簡稱可從英文切回繁體及簡體', async () => {
  const { createLocalizationMemory, localizeRememberedValue } = await import('../lib/language-dom.ts')
  const traditional = ['北市', '新北', '竹縣', '竹市', '苗栗']
  const english = ['Taipei', 'New Taipei', 'Hsinchu County', 'Hsinchu City', 'Miaoli']
  const simplified = ['北市', '新北', '竹县', '竹市', '苗栗']

  for (let index = 0; index < traditional.length; index++) {
    const memory = createLocalizationMemory()
    const textNode = {}
    const translated = localizeRememberedValue(textNode, 'text', traditional[index], 'en', memory)
    assert.equal(translated, english[index])
    assert.equal(localizeRememberedValue(textNode, 'text', translated, 'zh-TW', memory), traditional[index])
    const translatedAgain = localizeRememberedValue(textNode, 'text', traditional[index], 'en', memory)
    assert.equal(localizeRememberedValue(textNode, 'text', translatedAgain, 'zh-CN', memory), simplified[index])
  }
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

test('完整課表會顯示在加入課程流程之前', () => {
  const publicPage = readFileSync(new URL('../components/CoursesSection.tsx', import.meta.url), 'utf8')
  const scheduleIndex = publicPage.indexOf('<CoursesTable />')
  const guideIndex = publicPage.indexOf('coursesPage.guideSteps.map')

  assert.ok(scheduleIndex >= 0)
  assert.ok(guideIndex > scheduleIndex)
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

test('商店使用目前核准主視覺且關於我們只移除下方品牌故事三欄', async () => {
  const { normalizePageMedia } = await import('../lib/site-content.ts')
  const media = normalizePageMedia({})
  const replacedMedia = normalizePageMedia({
    shopHero: 'https://vmnbthmssiizbsvzeahz.supabase.co/storage/v1/object/public/site-media/pages/2026-07-24/a75fcf26-acc9-4d99-a993-6c81971301ee.webp',
  })
  const aboutPage = readFileSync(new URL('../app/about/page.tsx', import.meta.url), 'utf8')
  const admin = readFileSync(new URL('../components/admin/AdminContentManager.tsx', import.meta.url), 'utf8')

  assert.equal(media.shopHero, '/site-visuals/hero-2026/shop-hero-02.jpg')
  assert.equal(replacedMedia.shopHero, '/site-visuals/hero-2026/shop-hero-02.jpg')
  assert.match(aboutPage, /about\.philosophies/)
  assert.doesNotMatch(aboutPage, /about\.beliefs/)
  assert.match(admin, /三項訓練理念/)
  assert.doesNotMatch(admin, /三項支持重點/)
})

test('教練端不提供自行上傳頭像入口', () => {
  const dashboard = readFileSync(new URL('../app/coach/CoachDashboardClient.tsx', import.meta.url), 'utf8')
  const subNav = readFileSync(new URL('../components/CoachSubNav.tsx', import.meta.url), 'utf8')
  const profileRoute = readFileSync(new URL('../app/api/coach/profile/route.ts', import.meta.url), 'utf8')
  const uploadRoute = readFileSync(new URL('../app/api/admin/upload/route.ts', import.meta.url), 'utf8')

  assert.doesNotMatch(dashboard, /更換頭像|href="\/coach\/profile"/)
  assert.doesNotMatch(subNav, /頭像設定|\/coach\/profile/)
  assert.match(profileRoute, /教練帳號不可自行上傳/)
  assert.doesNotMatch(uploadRoute, /canUploadCoachMedia/)
  assert.match(uploadRoute, /只有超級管理員可以上傳網站媒體/)
})

test('商城商品頁保留單一簡介，尺碼下方顯示獨立規格', async () => {
  const { getProductIntro } = await import('../lib/shop-products.ts')
  const detailPage = readFileSync(new URL('../app/shop/[id]/ProductDetailClient.tsx', import.meta.url), 'utf8')
  const creator = readFileSync(new URL('../components/admin/AdminProductCreator.tsx', import.meta.url), 'utf8')
  const editor = readFileSync(new URL('../components/admin/AdminProductEditor.tsx', import.meta.url), 'utf8')
  const form = readFileSync(new URL('../components/admin/AdminProductForm.tsx', import.meta.url), 'utf8')

  const intro = getProductIntro({
    summary: '摘要',
    description: '原有介紹',
    highlights: ['適合日常訓練'],
    specifications: [{ label: '材質', value: '聚酯纖維' }],
    usageNotes: ['請依洗標清洗'],
  })

  assert.match(intro, /原有介紹/)
  assert.match(intro, /適合日常訓練/)
  assert.match(intro, /材質：聚酯纖維/)
  assert.match(intro, /請依洗標清洗/)
  assert.match(detailPage, />商品簡介</)
  assert.match(detailPage, />商品尺碼</)
  assert.doesNotMatch(detailPage, />商品重點</)
  assert.match(detailPage, />商品規格</)
  assert.ok(detailPage.indexOf('>商品尺碼<') < detailPage.indexOf('>商品規格<'))
  assert.match(detailPage, /getProductIntro\(product, \{ includeSpecifications: false \}\)/)
  assert.match(form, /<legend>商品規格<\/legend>/)
  assert.ok(form.indexOf('可選商品尺碼') < form.indexOf('<legend>商品規格'))
  assert.doesNotMatch(detailPage, />使用與保養</)
  assert.doesNotMatch(creator, /<Image\b|<video\b/)
  assert.doesNotMatch(editor, /<Image\b|<video\b/)
  assert.doesNotMatch(form, /<Image\b|<video\b/)
  assert.match(form, /後台不顯示預覽/)
  assert.match(form, /只顯示保存結果/)
})
