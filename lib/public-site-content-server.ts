import 'server-only'
import { cache } from 'react'
import { coachPublicProfilesFromRows, type CoachPublicProfileRow } from '@/lib/coach-profiles'
import { applyCourseSeasonToContent } from '@/lib/course-seasons'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { siteContentFromRows } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

// Request-scoped deduplication only; never cache an error as published content.
export const getPublicSiteContent = cache(async () => {
  if (!supabaseAdmin) throw new Error('Public content database is unavailable')
  const [{ data, error }, currentSeason, { data: coachRows, error: coachError }] = await Promise.all([
    supabaseAdmin.from('site_content').select('key, value').in('key', [
      'hero_slides', 'home_activities', 'seasonal_update', 'course_overrides',
      'brand_content', 'home_content', 'about_content', 'courses_page_content',
      'testimonials_content', 'team_content', 'achievements_content', 'anniversary_content', 'page_media',
    ]),
    getCurrentCourseSeason(),
    supabaseAdmin.from('coach_public_profiles').select('*'),
  ])
  if (error) throw error
  if (coachError) throw coachError
  if (!data?.length || !coachRows?.length) throw new Error('Published content is incomplete')
  return {
    content: {
      ...applyCourseSeasonToContent(siteContentFromRows(data), currentSeason),
      coachProfiles: coachPublicProfilesFromRows(coachRows as CoachPublicProfileRow[]),
    },
    currentSeason: currentSeason ? { id: currentSeason.id, code: currentSeason.code, name: currentSeason.name } : null,
    source: 'database' as const,
  }
})
