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

test('英文名單匯出的固定欄名完整，原始備註與電話保持不變', async () => {
  const { courseRosterTable, rosterCsv } = await import('../lib/enrollment-export.ts')
  const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
  const note = '請保留學員原始中文備註'
  const table = courseRosterTable([{ id: 'qa', seasonName: '2026 Q4', orderNumber: 'QA', studentName: 'QA Student', email: 'qa@example.invalid', courseName: 'QA Class', amountText: 'NT$3,600', transferLastFive: '00123', submittedAt: '2026-09-20', notes: note, reviewNote: note, registrationDetails: [{ label: '手機電話', value: '0900000000' }] }], () => 'Payment confirmed')
  const headings = table.headers.map(toEnglishWebsiteText)
  assert.deepEqual(headings.filter(heading => /[\u3400-\u9fff]/u.test(heading)), [])
  const csv = rosterCsv(headings, table.rows)
  assert.ok(csv.includes(note))
  assert.ok(csv.includes("'0900000000"))
  assert.ok(csv.includes("'00123"))
})

test('公告可不填連結，外部連結仍驗證且預設按鈕文字', async () => {
  const { normalizeActivities } = await import('../lib/site-content.ts')
  const base = { title: '公告', description: '第一段\n\n第二段' }
  assert.deepEqual(normalizeActivities([{ ...base, href: '', action: '' }]), [{ ...base, href: '', action: '' }])
  assert.equal(normalizeActivities([{ ...base, href: 'https://example.com', action: '' }])[0].action, '查看詳情')
  assert.equal(normalizeActivities([{ ...base, href: 'javascript:alert(1)' }]).length, 0)
})

test('團隊排序在內容正規化後保留，去重且相容舊資料', async () => {
  const { normalizeTeamContent } = await import('../lib/site-content.ts')
  assert.deepEqual(normalizeTeamContent({ coachOrder: ['peter', 'yongXin', 'peter', null] }).coachOrder, ['peter', 'yongXin'])
  assert.deepEqual(normalizeTeamContent({}).coachOrder, [])
})

test('網站提供繁體、簡體與英文三種語言入口', () => {
  assert.deepEqual(languages.map((language) => language.code), ['zh-TW', 'zh-CN', 'en'])
})

test('各班介紹的訓練重點可儲存、清空及前台套用，舊課程保留原值', async () => {
  const { normalizeCourseOverrides } = await import('../lib/site-content.ts')
  const { applyCourseOverrides } = await import('../lib/managed-courses.ts')
  const base = applyCourseOverrides({})[0]
  const overrides = normalizeCourseOverrides({ [base.slug]: {
    name: '測試班級', slogan: '測試標語', targetAudience: '測試對象',
    customCampaignLabel: 'CUSTOM CAMP', trainingItems: ['  節奏控制 ', '技術', '耐力', '忽略'],
  } })
  assert.deepEqual(overrides[base.slug].trainingItems, ['節奏控制', '技術', '耐力'])
  assert.equal(overrides[base.slug].customCampaignLabel, 'CUSTOM CAMP')
  const course = applyCourseOverrides(overrides).find((item) => item.slug === base.slug)!
  assert.deepEqual(course.trainingItems, ['節奏控制', '技術', '耐力'])
  assert.equal(course.title, '測試班級')
  assert.equal(course.slogan, '測試標語')
  assert.equal(course.targetAudience, '測試對象')
  const cleared = normalizeCourseOverrides({ [base.slug]: { trainingItems: [] } })
  assert.deepEqual(applyCourseOverrides(cleared).find((item) => item.slug === base.slug)!.trainingItems, [])
  assert.deepEqual(applyCourseOverrides({ [base.slug]: {} }).find((item) => item.slug === base.slug)!.trainingItems, base.trainingItems)
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

test('英文以完整文案匹配，不把未知句子的單字替換成混排內容', async () => {
  const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
  assert.equal(toEnglishWebsiteText('這是尚未加入詞庫的一起跑步句子'), '這是尚未加入詞庫的一起跑步句子')
  assert.equal(toEnglishWebsiteText('一起帶領'), 'Together, we guide')
  assert.equal(toEnglishWebsiteText('週日紫色Logo'), 'Nurture Running Team purple logo')
  assert.equal(toEnglishWebsiteText('  查看完整課表\n'), '  View Full Schedule\n')
})

test('英文課程名稱、城市清單、停課日期與圖片說明保留完整資訊', async () => {
  const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
  assert.equal(toEnglishWebsiteText('2026好運跑步訓練營 X 週四新莊初階班'), '2026 Nurture Running Camp · Thursday Xinzhuang Beginner Class')
  assert.equal(toEnglishWebsiteText('台北市、新北市'), 'Taipei City, New Taipei City')
  assert.equal(toEnglishWebsiteText('10/3-12/26 (10/10、10/24、12/26停課三次)'), '10/3-12/26 (no class on 10/10, 10/24, 12/26)')
  assert.equal(toEnglishWebsiteText('05:37（1.5-2 小時）'), '05:37 (1.5-2 hours)')
  assert.equal(toEnglishWebsiteText('好運跑班訓練紀錄 3'), 'Nurture Running Team training photo 3')
  assert.equal(toEnglishWebsiteText('好運跑班｜認識跑步，跑向更穩定的自己'), 'Nurture Running Team | Discover running. Become a more consistent runner.')
})

test('學員選項、徽章與賽事標籤均有英文，倒數與點名日期採用所選語言', async () => {
  const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
  const { cityOptions, countryCodes, runningExperienceOptions, favoriteDistanceOptions, pbCategoryOptions, goalOptions, raceEvents, raceRegionOptions, getRaceCountdown } = await import('../lib/runner-profile.ts')
  const { publicAchievementCatalog } = await import('../lib/achievement-catalog.ts')
  const { formatAttendanceDate } = await import('../lib/course-attendance.ts')
  const labels = [...cityOptions, ...countryCodes.map(x => x.label), ...runningExperienceOptions, ...favoriteDistanceOptions, ...pbCategoryOptions, ...goalOptions, ...raceRegionOptions, ...raceEvents.flatMap(x => [x.name, x.city]), ...publicAchievementCatalog.flatMap(x => [x.name, x.description, x.unlockHint, x.category])]
  for (const label of labels) assert.doesNotMatch(toEnglishWebsiteText(label), /[\u3400-\u9fff]/u, label)
  assert.equal(toEnglishWebsiteText('2027 東京馬拉松 · 2027/03/07 · 日本東京'), '2027 Tokyo Marathon · 2027/03/07 · Tokyo, Japan')
  assert.doesNotMatch(formatAttendanceDate('2026-09-21', 'en'), /[\u3400-\u9fff]/u)
  assert.match(formatAttendanceDate('2026-09-21'), /週一/u)
  const race = raceEvents.find(x => x.id === 'tokyo-marathon-2027')!
  assert.equal(getRaceCountdown(race, new Date('2027-03-05T16:00:00Z'), 'en').label, '1d 00:00:00')
  assert.equal(getRaceCountdown(race, new Date('2027-03-06T16:00:00Z'), 'en').label, 'Race day')
  assert.equal(getRaceCountdown(race, new Date('2027-03-07T16:00:00Z'), 'en').label, 'Race finished')
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

test('財務動態訊息保留交易筆數與需人工處理的差異', async () => {
  const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
  assert.equal(toEnglishWebsiteText('已匯入 12 筆交易，系統已完成初步比對，並標記 2 筆匯款資料需補充。'), 'Imported 12 transactions and completed initial matching. 2 transfer records need more information.')
  assert.equal(toEnglishWebsiteText('已完成 10 筆；另有 2 筆需人工處理。'), 'Completed 10 transactions; 2 need manual review.')
  assert.equal(toEnglishWebsiteText('已完成 12 筆唯一相符交易的對帳。'), 'Reconciled 12 uniquely matched transactions.')
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


test('開班提醒清空後不會回復預設文案，未設定則保留舊課程預設', async () => {
  const { normalizeCourseOverrides } = await import('../lib/site-content.ts')
  const { applyCourseOverrides } = await import('../lib/managed-courses.ts')
  const base = applyCourseOverrides({})[0]
  const cleared = normalizeCourseOverrides({ [base.slug]: { enrollmentNote: '' } })
  assert.equal(applyCourseOverrides(cleared).find((item) => item.slug === base.slug)!.enrollmentNote, '')
  const omitted = normalizeCourseOverrides({ [base.slug]: {} })
  assert.equal(applyCourseOverrides(omitted).find((item) => item.slug === base.slug)!.enrollmentNote, base.enrollmentNote)
})
