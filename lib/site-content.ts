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
  name?: string
  weekday?: string
  location?: string
  period?: string
  classTime?: string
  meetingPoint?: string
  feeNote?: string
  targetAudience?: string
  focus?: string
}

export type SiteContent = {
  heroSlides: string[]
  activities: HomeActivity[]
  seasonalUpdate: SeasonalUpdate
  courseOverrides: Record<string, CourseOverride>
}

export const defaultHeroSlides = [
  '/20250605[好運]三周年慶-7089.jpg',
  '/20250605[好運]三周年慶-7096.jpg',
  '/LINE_ALBUM_四週年手機桌布_260515_1.jpg',
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

export const defaultSiteContent: SiteContent = {
  heroSlides: defaultHeroSlides,
  activities: defaultHomeActivities,
  seasonalUpdate: defaultSeasonalUpdate,
  courseOverrides: {},
}

function cleanString(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
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
    .map((item) => cleanString(item, 2000))
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
    result[slug] = {
      active: override.active !== false,
      name: cleanString(override.name, 180),
      weekday: cleanString(override.weekday, 20),
      location: cleanString(override.location, 100),
      period: cleanString(override.period, 160),
      classTime: cleanString(override.classTime, 200),
      meetingPoint: cleanString(override.meetingPoint, 300),
      feeNote: cleanString(override.feeNote, 300),
      targetAudience: cleanString(override.targetAudience, 500),
      focus: cleanString(override.focus, 300),
    }
  })
  return result
}

export function siteContentFromRows(rows: Array<{ key: string; value: unknown }> | null | undefined): SiteContent {
  const values = new Map((rows ?? []).map((row) => [row.key, row.value]))

  return {
    heroSlides: normalizeHeroSlides(values.get('hero_slides')),
    activities: normalizeActivities(values.get('home_activities')),
    seasonalUpdate: normalizeSeasonalUpdate(values.get('seasonal_update')),
    courseOverrides: normalizeCourseOverrides(values.get('course_overrides')),
  }
}
