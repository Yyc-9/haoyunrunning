import type { CourseOverride, SiteContent } from '@/lib/site-content'

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
