import 'server-only'

import { coachPublicProfilesFromRows, type CoachPublicProfileRow } from '@/lib/coach-profiles'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function getManagedCourses(options: { includeInactive?: boolean } = {}) {
  if (!supabaseAdmin) return applyCourseOverrides({}, options)

  const [currentSeason, { data: coachRows, error: coachError }] = await Promise.all([
    getCurrentCourseSeason(),
    supabaseAdmin
      .from('coach_public_profiles')
      .select('*'),
  ])

  if (!currentSeason) return []

  if (coachError) console.error('Load managed course coach profiles error:', coachError)
  return applyCourseOverrides(currentSeason.courseOverrides, {
    ...options,
    onlyConfigured: true,
    coachProfiles: coachPublicProfilesFromRows(coachRows as CoachPublicProfileRow[] | null),
  })
}
