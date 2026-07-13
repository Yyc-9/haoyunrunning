import 'server-only'

import { allCourses } from '@/lib/goodluck-data'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { normalizeCourseOverrides } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function getManagedCourses(options: { includeInactive?: boolean } = {}) {
  if (!supabaseAdmin) return allCourses

  const [{ data, error }, currentSeason] = await Promise.all([
    supabaseAdmin
      .from('site_content')
      .select('value')
      .eq('key', 'course_overrides')
      .maybeSingle(),
    getCurrentCourseSeason(),
  ])

  if (error) {
    console.error('Load managed courses error:', error)
    return allCourses
  }

  const overrides = currentSeason?.courseOverrides ?? normalizeCourseOverrides(data?.value)
  return applyCourseOverrides(overrides, options)
}
