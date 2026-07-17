import 'server-only'

import { coachPublicProfilesFromRows, type CoachPublicProfileRow } from '@/lib/coach-profiles'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { normalizeCourseOverrides } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function getManagedCourses(options: { includeInactive?: boolean } = {}) {
  if (!supabaseAdmin) return applyCourseOverrides({}, options)

  const [{ data, error }, currentSeason, { data: coachRows, error: coachError }] = await Promise.all([
    supabaseAdmin
      .from('site_content')
      .select('value')
      .eq('key', 'course_overrides')
      .maybeSingle(),
    getCurrentCourseSeason(),
    supabaseAdmin
      .from('coach_public_profiles')
      .select('*'),
  ])

  if (error) {
    console.error('Load managed courses error:', error)
    return applyCourseOverrides({}, options)
  }

  const overrides = currentSeason?.courseOverrides ?? normalizeCourseOverrides(data?.value)
  if (coachError) console.error('Load managed course coach profiles error:', coachError)
  return applyCourseOverrides(overrides, {
    ...options,
    onlyConfigured: Boolean(currentSeason),
    coachProfiles: coachPublicProfilesFromRows(coachRows as CoachPublicProfileRow[] | null),
  })
}
