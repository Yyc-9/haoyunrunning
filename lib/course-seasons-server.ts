import 'server-only'

import { normalizeCourseOverrides } from '@/lib/site-content'
import type { CourseSeason, CourseSeasonStatus } from '@/lib/course-seasons'
import { supabaseAdmin } from '@/lib/supabase-server'

type SeasonRow = {
  id: string
  code: string
  name: string
  status: CourseSeasonStatus
  is_current: boolean
  enrollment_starts_on: string | null
  enrollment_ends_on: string | null
  starts_on: string | null
  ends_on: string | null
  created_at: string
  updated_at: string
}

type SeasonCourseRow = {
  id: string
  season_id: string
  course_slug: string
  course_data: unknown
  capacity: number
}

type SeasonRegistrationRow = {
  season_id: string | null
  status: string
}

function isMissingSeasonSchema(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}

export async function getCourseSeasons(options: { includeRegistrationStats?: boolean } = {}): Promise<CourseSeason[]> {
  if (!supabaseAdmin) return []

  const [seasonsResult, coursesResult] = await Promise.all([
    supabaseAdmin
      .from('course_seasons')
      .select('id, code, name, status, is_current, enrollment_starts_on, enrollment_ends_on, starts_on, ends_on, created_at, updated_at')
      .order('code', { ascending: false }),
    supabaseAdmin
      .from('course_season_courses')
      .select('id, season_id, course_slug, course_data, capacity'),
  ])
  const registrationsResult = options.includeRegistrationStats === false
    ? { data: [] as SeasonRegistrationRow[], error: null }
    : await supabaseAdmin
        .from('signup_leads')
        .select('season_id, status')
        .eq('source', 'course_payment')

  if (isMissingSeasonSchema(seasonsResult.error) || isMissingSeasonSchema(coursesResult.error)) return []
  if (seasonsResult.error) throw seasonsResult.error
  if (coursesResult.error) throw coursesResult.error
  if (registrationsResult.error && !isMissingSeasonSchema(registrationsResult.error)) throw registrationsResult.error

  const courses = (coursesResult.data ?? []) as SeasonCourseRow[]
  const registrations = (registrationsResult.data ?? []) as SeasonRegistrationRow[]

  return ((seasonsResult.data ?? []) as SeasonRow[]).map((season) => {
    const seasonCourses = courses.filter((course) => course.season_id === season.id)
    const seasonRegistrations = registrations.filter((registration) => registration.season_id === season.id)

    return {
      id: season.id,
      code: season.code,
      name: season.name,
      status: season.status,
      isCurrent: season.is_current,
      enrollmentStartsOn: season.enrollment_starts_on ?? '',
      enrollmentEndsOn: season.enrollment_ends_on ?? '',
      startsOn: season.starts_on ?? '',
      endsOn: season.ends_on ?? '',
      courseOverrides: Object.fromEntries(
        seasonCourses.map((course) => [
          course.course_slug,
          normalizeCourseOverrides({ [course.course_slug]: course.course_data })[course.course_slug] ?? {},
        ])
      ),
      courseCapacities: Object.fromEntries(seasonCourses.map((course) => [course.course_slug, course.capacity])),
      courseOfferingIds: Object.fromEntries(seasonCourses.map((course) => [course.course_slug, course.id])),
      registrationCount: seasonRegistrations.length,
      approvedCount: seasonRegistrations.filter((registration) => registration.status === 'approved').length,
      pendingReviewCount: seasonRegistrations.filter((registration) => registration.status === 'pending_review').length,
      createdAt: season.created_at,
      updatedAt: season.updated_at,
    }
  })
}

export async function getCurrentCourseSeason() {
  const seasons = await getCourseSeasons({ includeRegistrationStats: false })
  return seasons.find((season) => season.isCurrent) ?? null
}
