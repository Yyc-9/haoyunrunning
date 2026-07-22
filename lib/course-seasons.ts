import type { CourseOverride, SiteContent } from '@/lib/site-content'
import type { CourseBillingConfig } from '@/lib/course-pricing'

export type CourseSeasonStatus = 'draft' | 'enrolling' | 'active' | 'completed' | 'archived'

export type CourseSeason = {
  id: string
  code: string
  name: string
  status: CourseSeasonStatus
  isCurrent: boolean
  enrollmentStartsOn: string
  enrollmentEndsOn: string
  startsOn: string
  endsOn: string
  courseOverrides: Record<string, CourseOverride>
  courseCapacities: Record<string, number>
  courseBillingConfigs: Record<string, CourseBillingConfig>
  courseOfferingIds: Record<string, string>
  registrationCount: number
  approvedCount: number
  pendingReviewCount: number
  createdAt: string
  updatedAt: string
}

export const courseSeasonStatusLabels: Record<CourseSeasonStatus, string> = {
  draft: '草稿',
  enrolling: '招生中',
  active: '進行中',
  completed: '已結束',
  archived: '已封存',
}

function taipeiDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function isCourseSeasonPubliclyAvailable(season: CourseSeason) {
  return season.isCurrent && (season.status === 'enrolling' || season.status === 'active')
}

export function isCourseSeasonEnrollmentOpen(season: CourseSeason, now = new Date()) {
  if (!isCourseSeasonPubliclyAvailable(season)) return false

  const today = taipeiDateKey(now)
  if (season.enrollmentStartsOn && today < season.enrollmentStartsOn) return false
  if (season.enrollmentEndsOn && today > season.enrollmentEndsOn) return false
  return true
}

export function applyCourseSeasonToContent(content: SiteContent, season: CourseSeason | null) {
  return season ? { ...content, courseOverrides: season.courseOverrides } : content
}

export function nextCourseSeasonIdentity(code: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(code)
  const currentYear = new Date().getFullYear()
  const year = match ? Number(match[1]) : currentYear
  const quarter = match ? Number(match[2]) : 0
  const nextQuarter = quarter >= 4 ? 1 : quarter + 1 || 1
  const nextYear = quarter >= 4 ? year + 1 : year
  const quarterNames = ['第一季', '第二季', '第三季', '第四季']

  return {
    code: `${nextYear}-Q${nextQuarter}`,
    name: `${nextYear} ${quarterNames[nextQuarter - 1]}`,
  }
}
