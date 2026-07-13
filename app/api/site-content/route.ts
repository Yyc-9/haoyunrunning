import { NextResponse } from 'next/server'
import { applyCourseSeasonToContent } from '@/lib/course-seasons'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { defaultSiteContent, siteContentFromRows } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ content: defaultSiteContent, source: 'fallback' }, { headers })
  }

  const [{ data, error }, currentSeason] = await Promise.all([
    supabaseAdmin
      .from('site_content')
      .select('key, value')
      .in('key', ['hero_slides', 'home_activities', 'seasonal_update', 'course_overrides', 'brand_content', 'home_content', 'about_content', 'testimonials_content', 'page_media']),
    getCurrentCourseSeason(),
  ])

  if (error) {
    console.error('Load site content error:', error)
    return NextResponse.json({ content: defaultSiteContent, source: 'fallback' }, { headers })
  }

  const content = applyCourseSeasonToContent(siteContentFromRows(data), currentSeason)
  return NextResponse.json({
    content,
    currentSeason: currentSeason ? { id: currentSeason.id, code: currentSeason.code, name: currentSeason.name } : null,
    source: 'database',
  }, { headers })
}
