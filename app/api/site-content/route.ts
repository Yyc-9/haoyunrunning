import { NextResponse } from 'next/server'
import { coachPublicProfilesFromRows, type CoachPublicProfileRow } from '@/lib/coach-profiles'
import { applyCourseSeasonToContent } from '@/lib/course-seasons'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { defaultSiteContent, siteContentFromRows } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

// Public content is safe to cache briefly at the edge. The client still
// revalidates on navigation and receives an update event after an admin save.
const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ content: defaultSiteContent, source: 'fallback' }, { headers })
  }

  const [{ data, error }, currentSeason, { data: coachRows, error: coachError }] = await Promise.all([
    supabaseAdmin
      .from('site_content')
      .select('key, value')
      .in('key', ['hero_slides', 'home_activities', 'seasonal_update', 'course_overrides', 'brand_content', 'home_content', 'about_content', 'courses_page_content', 'testimonials_content', 'team_content', 'achievements_content', 'anniversary_content', 'page_media']),
    getCurrentCourseSeason(),
    supabaseAdmin
      .from('coach_public_profiles')
      .select('*'),
  ])

  if (error) {
    console.error('Load site content error:', error)
    return NextResponse.json({ content: defaultSiteContent, source: 'fallback' }, { headers })
  }

  if (coachError) console.error('Load public coach profiles error:', coachError)
  const baseContent = siteContentFromRows(data)
  const content = {
    ...applyCourseSeasonToContent(baseContent, currentSeason),
    coachProfiles: coachPublicProfilesFromRows(coachRows as CoachPublicProfileRow[] | null),
  }
  return NextResponse.json({
    content,
    currentSeason: currentSeason ? { id: currentSeason.id, code: currentSeason.code, name: currentSeason.name } : null,
    source: 'database',
  }, { headers })
}
