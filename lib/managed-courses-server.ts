import 'server-only'

import { allCourses } from '@/lib/goodluck-data'
import { applyCourseOverrides } from '@/lib/managed-courses'
import { normalizeCourseOverrides } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function getManagedCourses(options: { includeInactive?: boolean } = {}) {
  if (!supabaseAdmin) return allCourses

  const { data, error } = await supabaseAdmin
    .from('site_content')
    .select('value')
    .eq('key', 'course_overrides')
    .maybeSingle()

  if (error) {
    console.error('Load managed courses error:', error)
    return allCourses
  }

  return applyCourseOverrides(normalizeCourseOverrides(data?.value), options)
}
