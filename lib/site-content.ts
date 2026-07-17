export type HomeActivity = {
  title: string
  description: string
  action: string
  href: string
}

export type SeasonalUpdate = {
  active: boolean
  period: string
  title: string
  summary: string
  body: string
  href: string
  linkLabel: string
}

export type CourseOverride = {
  active?: boolean
  templateSlug?: string
  name?: string
  weekday?: string
  location?: string
  period?: string
  classTime?: string
  meetingPoint?: string
  feeNote?: string
  targetAudience?: string
  focus?: string
  signupUrl?: string
  coachKeys?: string[]
}

export type ContentCard = {
  title: string
  description: string
}

export type BrandContent = {
  brandName: string
  tagline: string
  logoUrl: string
  instagramUrl: string
  instagramHandle: string
  contactText: string
  address: string
  footerDescription: string
}

export type HomeContent = {
  activitiesLabel: string
  activitiesTitle: string
  activitiesDescription: string
  featuresTitle: string
  featuresSubtitle: string
  features: ContentCard[]
  stats: Array<{ value: string; label: string }>
  coursesLabel: string
  coursesTitle: string
  coursesDescription: string
}

export type AboutContent = {
  eyebrow: string
  title: string
  titleHighlight: string
  description: string
  beliefsLabel: string
  beliefsTitle: string
  beliefs: ContentCard[]
  audienceLabel: string
  audienceTitle: string
  audienceDescription: string
  audienceTags: string[]
  facts: ContentCard[]
  ctaTitle: string
  ctaDescription: string
}

export type TestimonialsContent = {
  eyebrow: string
  title: string
  description: string
  pathLabel: string
  pathTitle: string
  pathDescription: string
  themes: ContentCard[]
  ctaLabel: string
  ctaTitle: string
  ctaDescription: string
}

export type PageMedia = {
  aboutHero: string
  testimonialsHero: string
  shopHero: string
  anniversaryHero: string
  shopTitle: string
  shopSubtitle: string
}

export type SiteContent = {
  heroSlides: string[]
  activities: HomeActivity[]
  seasonalUpdate: SeasonalUpdate
  courseOverrides: Record<string, CourseOverride>
  brand: BrandContent
  home: HomeContent
  about: AboutContent
  testimonials: TestimonialsContent
  pageMedia: PageMedia
  coachProfiles: CoachPublicProfileMap
}

export const defaultHeroSlides = [
  '/goodluck-anniversary-7089.jpg',
  '/goodluck-anniversary-7096.jpg',
  '/goodluck-fourth-anniversary-wallpaper.jpg',
]

export const defaultHomeActivities: HomeActivity[] = [
  {
    title: '好運跑班 4 週年活動',
    description: '留下 4 週年活動參加意向，方便我們掌握現場人數與後續聯絡。',
    action: '活動報名',
    href: '/anniversary',
  },
  {
    title: '團練報名',
    description: '每週六開放式團練意向登記，方便教練掌握現場人數。',
    action: '填寫團練意向',
    href: '/group-signup',
  },
]

export const defaultSeasonalUpdate: SeasonalUpdate = {
  active: false,
  period: '',
  title: '',
  summary: '',
  body: '',
  href: '',
  linkLabel: '了解更多',
}

export const defaultBrandContent: BrandContent = {
  brandName: '好運跑班',
  tagline: '認識跑步，嘗試跑步，愛上跑步',
  logoUrl: '/goodluck-logo-nav.jpg',
  instagramUrl: 'https://www.instagram.com/nurture.running.team/',
  instagramHandle: '@nurture.running.team',
  contactText: '課程與商品諮詢請先透過 Instagram 聯絡',
  address: '台灣各城市團練據點',
  footerDescription: '專業的跑步訓練平台，為跑者提供科學、系統、個人化的訓練指導，幫助每一位跑者安全、高效地提升跑步能力，實現個人目標。',
}

export const defaultHomeContent: HomeContent = {
  activitiesLabel: '近期更新',
  activitiesTitle: '近期報名入口',
  activitiesDescription: '活動與團練資訊整理在這裡，方便你快速完成報名。',
  featuresTitle: '好運跑班如何陪你進步？',
  featuresSubtitle: '從第一次規律跑步到站上賽道，我們把課表、團練、回饋與社群放在同一個訓練節奏裡',
  features: [
    { title: '初心到菁英都能加入', description: '依照程度安排初心補習班、初階班、夜跑班、早鳥班與 PB 班' },
    { title: '清楚的週期訓練', description: '以 12 週為一個節奏，逐步建立體能、速度、耐力與賽事狀態' },
    { title: '台灣多地團練', description: '本期整理台北、新竹、竹北、竹南等班級資訊' },
    { title: '現場動作與配速指導', description: '教練在團練現場觀察跑姿、節奏與完成狀況，提供當下建議' },
    { title: '目標導向訓練', description: '依照 5000m、10000m、半馬、全馬與 PB 目標安排訓練重點' },
    { title: '跑者社群陪伴', description: '讓每一位跑者認識跑步、嘗試跑步，最後真正愛上跑步' },
  ],
  stats: [
    { value: '5000m', label: '速度與耐力' },
    { value: '10000m', label: '節奏與配速' },
    { value: '半馬', label: '穩定完賽' },
    { value: '全馬', label: '週期備賽' },
  ],
  coursesLabel: '訓練日程',
  coursesTitle: '課程預覽',
  coursesDescription: '首頁整理本期代表班級，完整時間、訓練內容、費用與報名說明請進入課程頁查看。',
}

export const defaultAboutContent: AboutContent = {
  eyebrow: '關於好運跑班',
  title: '我們想讓更多人，',
  titleHighlight: '真正愛上跑步。',
  description: '好運跑班面向台灣所有跑者。你可以是第一次想規律跑步的人，也可以是正在追逐 PB 的跑者；可以為 5000m、10000m 準備，也可以把目標放在半馬、全馬。重要的不是你現在跑得多快，而是你願意開始理解自己的身體，並且一步一步跑向更穩定的自己。',
  beliefsLabel: '我們相信',
  beliefsTitle: '好運不是偶然，是一次次被好好安排的訓練。',
  beliefs: [
    { title: '跑步可以被認識', description: '跑步不是只靠意志硬撐。當你理解節奏、強度、恢復與身體訊號，每一次訓練都會變得更有方向。' },
    { title: '跑步值得被陪伴', description: '從第一次出門跑，到準備一場重要比賽，身邊有人一起練、有人看見你的狀態，進步會變得踏實很多。' },
    { title: '目標需要被拆解', description: '5000m、10000m、半馬、全馬，每個目標都有不同的節奏。好運把目標拆成週期、課表與每一次能完成的訓練。' },
  ],
  audienceLabel: '適合對象',
  audienceTitle: '不同程度的跑者，都可以在這裡找到自己的節奏。',
  audienceDescription: '我們不把跑者分成「會跑」或「不會跑」。每個人都有自己的起點，也有自己的目標。好運跑班希望做的是，讓你知道今天為什麼這樣跑，這週為什麼這樣練，下一個階段又要怎麼調整。',
  audienceTags: ['新手小白', '業餘跑者', '專業跑者', '菁英跑者', '5000m / 10000m 備賽', '半馬 / 全馬備賽'],
  facts: [
    { title: '台灣多地開課', description: '本期台北、新竹、竹北、竹南等班級同步整理上線。' },
    { title: '週期化訓練', description: '以固定週期建立跑力，讓課表、團練與恢復彼此銜接。' },
    { title: '教練與社群支援', description: '學員回報訓練感受，教練依照狀態調整，讓進步不是孤單發生。' },
  ],
  ctaTitle: '從下一次訓練開始，跑得更清楚一點。',
  ctaDescription: '如果你還不確定自己適合哪一班，先讓我們知道你的跑步經驗、目標距離與可訓練時間，我們會協助你找到更適合的起點。',
}

export const defaultTestimonialsContent: TestimonialsContent = {
  eyebrow: '學員見證',
  title: '每一步進步，都從願意開始',
  description: '好運跑班陪跑者從第一次規律訓練，到完成賽事與挑戰個人目標。真實學員分享與最新訓練現場，持續發布在官方 Instagram。',
  pathLabel: '跑者的成長路徑',
  pathTitle: '訓練不只看最後的成績',
  pathDescription: '我們更重視跑者能不能安全、穩定地持續下去。以下是好運跑班在每一段訓練裡最在意的事情。',
  themes: [
    { title: '從適合自己的起點開始', description: '依照跑齡、目前能力與可訓練時間選擇班級，先把穩定跑步的節奏建立起來。' },
    { title: '在團練裡持續前進', description: '和教練、同學一起完成每次訓練，在現場獲得配速、動作與節奏上的協助。' },
    { title: '朝自己的目標靠近', description: '不論是第一次參賽、穩定完賽或挑戰 PB，都用適合自己的步調累積。' },
  ],
  ctaLabel: '真實內容持續更新',
  ctaTitle: '到 Instagram 看最新學員故事與訓練現場',
  ctaDescription: '為避免使用未經確認的姓名、成績或照片，網站不刊登虛構見證；公開內容以好運跑班官方帳號發布為準。',
}

export const defaultPageMedia: PageMedia = {
  aboutHero: '/goodluck-fourth-anniversary-wallpaper.jpg',
  testimonialsHero: '/goodluck-anniversary-7089.jpg',
  shopHero: '/goodluck-anniversary-7096.jpg',
  anniversaryHero: '/goodluck-fourth-anniversary-wallpaper.jpg',
  shopTitle: '好運商店',
  shopSubtitle: '跑班裝備與訓練補給，先把真正會用上的東西整理好。',
}

export const defaultSiteContent: SiteContent = {
  heroSlides: defaultHeroSlides,
  activities: defaultHomeActivities,
  seasonalUpdate: defaultSeasonalUpdate,
  courseOverrides: {},
  brand: defaultBrandContent,
  home: defaultHomeContent,
  about: defaultAboutContent,
  testimonials: defaultTestimonialsContent,
  pageMedia: defaultPageMedia,
  coachProfiles: defaultCoachPublicProfiles,
}

function cleanString(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

const legacyPublicAssets: Record<string, string> = {
  '/20250605[好運]三周年慶-7089.jpg': '/goodluck-anniversary-7089.jpg',
  '/20250605[好運]三周年慶-7096.jpg': '/goodluck-anniversary-7096.jpg',
  '/LINE_ALBUM_四週年手機桌布_260515_1.jpg': '/goodluck-fourth-anniversary-wallpaper.jpg',
}

function stablePublicAsset(value: string) {
  return legacyPublicAssets[value] || value
}

export function isSafePublicUrl(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return true

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function normalizeHeroSlides(value: unknown) {
  if (!Array.isArray(value)) return defaultHeroSlides
  const slides = value
    .map((item) => stablePublicAsset(cleanString(item, 2000)))
    .filter((item) => item && isSafePublicUrl(item))
    .slice(0, 8)
  return slides.length > 0 ? slides : defaultHeroSlides
}

export function normalizeActivities(value: unknown) {
  if (!Array.isArray(value)) return defaultHomeActivities

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const activity = item as Partial<HomeActivity>
      const title = cleanString(activity.title, 100)
      const description = cleanString(activity.description, 500)
      const action = cleanString(activity.action, 60)
      const href = cleanString(activity.href, 2000)
      if (!title || !description || !action || !href || !isSafePublicUrl(href)) return null
      return { title, description, action, href }
    })
    .filter((item): item is HomeActivity => Boolean(item))
    .slice(0, 8)
}

export function normalizeSeasonalUpdate(value: unknown): SeasonalUpdate {
  if (!value || typeof value !== 'object') return defaultSeasonalUpdate
  const update = value as Partial<SeasonalUpdate>
  const href = cleanString(update.href, 2000)

  return {
    active: update.active === true,
    period: cleanString(update.period, 80),
    title: cleanString(update.title, 140),
    summary: cleanString(update.summary, 500),
    body: cleanString(update.body, 5000),
    href: href && isSafePublicUrl(href) ? href : '',
    linkLabel: cleanString(update.linkLabel, 60) || '了解更多',
  }
}

export function normalizeCourseOverrides(value: unknown): Record<string, CourseOverride> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const result: Record<string, CourseOverride> = {}
  Object.entries(value as Record<string, unknown>).slice(0, 100).forEach(([slug, rawOverride]) => {
    if (!/^[a-z0-9-]{1,120}$/.test(slug) || !rawOverride || typeof rawOverride !== 'object') return
    const override = rawOverride as CourseOverride
    const signupUrl = cleanString(override.signupUrl, 2000)
    const templateSlug = cleanString(override.templateSlug, 120)
    const coachKeys = Array.isArray(override.coachKeys)
      ? [...new Set(override.coachKeys.map((item) => cleanString(item, 80)).filter((item) => /^[A-Za-z0-9-]+$/.test(item)))].slice(0, 20)
      : undefined
    result[slug] = {
      active: override.active !== false,
      templateSlug: /^[a-z0-9-]{1,120}$/.test(templateSlug) ? templateSlug : undefined,
      name: cleanString(override.name, 180),
      weekday: cleanString(override.weekday, 20),
      location: cleanString(override.location, 100),
      period: cleanString(override.period, 160),
      classTime: cleanString(override.classTime, 200),
      meetingPoint: cleanString(override.meetingPoint, 300),
      feeNote: cleanString(override.feeNote, 300),
      targetAudience: cleanString(override.targetAudience, 500),
      focus: cleanString(override.focus, 300),
      signupUrl: signupUrl && isSafePublicUrl(signupUrl) ? signupUrl : '',
      coachKeys,
    }
  })
  return result
}

function cleanOr(value: unknown, fallback: string, maxLength = 500) {
  return cleanString(value, maxLength) || fallback
}

function normalizeCards(value: unknown, fallback: ContentCard[], limit: number) {
  if (!Array.isArray(value)) return fallback
  const cards = value.slice(0, limit).map((item, index) => {
    const source = item && typeof item === 'object' ? item as Partial<ContentCard> : {}
    const base = fallback[index] ?? { title: '', description: '' }
    return {
      title: cleanOr(source.title, base.title, 120),
      description: cleanOr(source.description, base.description, 600),
    }
  })
  return cards.length === limit ? cards : fallback
}

export function normalizeBrandContent(value: unknown): BrandContent {
  const source = value && typeof value === 'object' ? value as Partial<BrandContent> : {}
  const logoUrl = cleanString(source.logoUrl, 2000)
  const instagramUrl = cleanString(source.instagramUrl, 2000)
  return {
    brandName: cleanOr(source.brandName, defaultBrandContent.brandName, 80),
    tagline: cleanOr(source.tagline, defaultBrandContent.tagline, 160),
    logoUrl: logoUrl && isSafePublicUrl(logoUrl) ? logoUrl : defaultBrandContent.logoUrl,
    instagramUrl: instagramUrl && isSafePublicUrl(instagramUrl) ? instagramUrl : defaultBrandContent.instagramUrl,
    instagramHandle: cleanOr(source.instagramHandle, defaultBrandContent.instagramHandle, 100),
    contactText: cleanOr(source.contactText, defaultBrandContent.contactText, 240),
    address: cleanOr(source.address, defaultBrandContent.address, 200),
    footerDescription: cleanOr(source.footerDescription, defaultBrandContent.footerDescription, 800),
  }
}

export function normalizeHomeContent(value: unknown): HomeContent {
  const source = value && typeof value === 'object' ? value as Partial<HomeContent> : {}
  const stats = Array.isArray(source.stats) && source.stats.length === 4
    ? source.stats.map((item, index) => ({
        value: cleanOr(item?.value, defaultHomeContent.stats[index].value, 40),
        label: cleanOr(item?.label, defaultHomeContent.stats[index].label, 80),
      }))
    : defaultHomeContent.stats
  return {
    activitiesLabel: cleanOr(source.activitiesLabel, defaultHomeContent.activitiesLabel, 80),
    activitiesTitle: cleanOr(source.activitiesTitle, defaultHomeContent.activitiesTitle, 140),
    activitiesDescription: cleanOr(source.activitiesDescription, defaultHomeContent.activitiesDescription, 500),
    featuresTitle: cleanOr(source.featuresTitle, defaultHomeContent.featuresTitle, 140),
    featuresSubtitle: cleanOr(source.featuresSubtitle, defaultHomeContent.featuresSubtitle, 500),
    features: normalizeCards(source.features, defaultHomeContent.features, 6),
    stats,
    coursesLabel: cleanOr(source.coursesLabel, defaultHomeContent.coursesLabel, 80),
    coursesTitle: cleanOr(source.coursesTitle, defaultHomeContent.coursesTitle, 140),
    coursesDescription: cleanOr(source.coursesDescription, defaultHomeContent.coursesDescription, 500),
  }
}

export function normalizeAboutContent(value: unknown): AboutContent {
  const source = value && typeof value === 'object' ? value as Partial<AboutContent> : {}
  const audienceTags = Array.isArray(source.audienceTags)
    ? source.audienceTags.map((item) => cleanString(item, 80)).filter(Boolean).slice(0, 12)
    : []
  return {
    eyebrow: cleanOr(source.eyebrow, defaultAboutContent.eyebrow, 80),
    title: cleanOr(source.title, defaultAboutContent.title, 140),
    titleHighlight: cleanOr(source.titleHighlight, defaultAboutContent.titleHighlight, 140),
    description: cleanOr(source.description, defaultAboutContent.description, 1600),
    beliefsLabel: cleanOr(source.beliefsLabel, defaultAboutContent.beliefsLabel, 80),
    beliefsTitle: cleanOr(source.beliefsTitle, defaultAboutContent.beliefsTitle, 180),
    beliefs: normalizeCards(source.beliefs, defaultAboutContent.beliefs, 3),
    audienceLabel: cleanOr(source.audienceLabel, defaultAboutContent.audienceLabel, 80),
    audienceTitle: cleanOr(source.audienceTitle, defaultAboutContent.audienceTitle, 180),
    audienceDescription: cleanOr(source.audienceDescription, defaultAboutContent.audienceDescription, 1200),
    audienceTags: audienceTags.length ? audienceTags : defaultAboutContent.audienceTags,
    facts: normalizeCards(source.facts, defaultAboutContent.facts, 3),
    ctaTitle: cleanOr(source.ctaTitle, defaultAboutContent.ctaTitle, 180),
    ctaDescription: cleanOr(source.ctaDescription, defaultAboutContent.ctaDescription, 800),
  }
}

export function normalizeTestimonialsContent(value: unknown): TestimonialsContent {
  const source = value && typeof value === 'object' ? value as Partial<TestimonialsContent> : {}
  return {
    eyebrow: cleanOr(source.eyebrow, defaultTestimonialsContent.eyebrow, 80),
    title: cleanOr(source.title, defaultTestimonialsContent.title, 180),
    description: cleanOr(source.description, defaultTestimonialsContent.description, 1000),
    pathLabel: cleanOr(source.pathLabel, defaultTestimonialsContent.pathLabel, 80),
    pathTitle: cleanOr(source.pathTitle, defaultTestimonialsContent.pathTitle, 180),
    pathDescription: cleanOr(source.pathDescription, defaultTestimonialsContent.pathDescription, 800),
    themes: normalizeCards(source.themes, defaultTestimonialsContent.themes, 3),
    ctaLabel: cleanOr(source.ctaLabel, defaultTestimonialsContent.ctaLabel, 80),
    ctaTitle: cleanOr(source.ctaTitle, defaultTestimonialsContent.ctaTitle, 180),
    ctaDescription: cleanOr(source.ctaDescription, defaultTestimonialsContent.ctaDescription, 1000),
  }
}

export function normalizePageMedia(value: unknown): PageMedia {
  const source = value && typeof value === 'object' ? value as Partial<PageMedia> : {}
  const image = (candidate: unknown, fallback: string) => {
    const url = stablePublicAsset(cleanString(candidate, 2000))
    return url && isSafePublicUrl(url) ? url : fallback
  }
  return {
    aboutHero: image(source.aboutHero, defaultPageMedia.aboutHero),
    testimonialsHero: image(source.testimonialsHero, defaultPageMedia.testimonialsHero),
    shopHero: image(source.shopHero, defaultPageMedia.shopHero),
    anniversaryHero: image(source.anniversaryHero, defaultPageMedia.anniversaryHero),
    shopTitle: cleanOr(source.shopTitle, defaultPageMedia.shopTitle, 120),
    shopSubtitle: cleanOr(source.shopSubtitle, defaultPageMedia.shopSubtitle, 500),
  }
}

export function siteContentFromRows(rows: Array<{ key: string; value: unknown }> | null | undefined): SiteContent {
  const values = new Map((rows ?? []).map((row) => [row.key, row.value]))

  return {
    heroSlides: normalizeHeroSlides(values.get('hero_slides')),
    activities: normalizeActivities(values.get('home_activities')),
    seasonalUpdate: normalizeSeasonalUpdate(values.get('seasonal_update')),
    courseOverrides: normalizeCourseOverrides(values.get('course_overrides')),
    brand: normalizeBrandContent(values.get('brand_content')),
    home: normalizeHomeContent(values.get('home_content')),
    about: normalizeAboutContent(values.get('about_content')),
    testimonials: normalizeTestimonialsContent(values.get('testimonials_content')),
    pageMedia: normalizePageMedia(values.get('page_media')),
    coachProfiles: defaultCoachPublicProfiles,
  }
}
import { defaultCoachPublicProfiles, type CoachPublicProfileMap } from '@/lib/coach-profiles'
