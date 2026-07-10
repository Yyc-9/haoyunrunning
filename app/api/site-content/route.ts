import { NextResponse } from 'next/server'
import { defaultSiteContent, siteContentFromRows } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ content: defaultSiteContent, source: 'fallback' }, { headers })
  }

  const { data, error } = await supabaseAdmin
    .from('site_content')
    .select('key, value')
    .in('key', ['hero_slides', 'home_activities', 'seasonal_update', 'course_overrides', 'brand_content', 'home_content', 'about_content', 'testimonials_content', 'page_media'])

  if (error) {
    console.error('Load site content error:', error)
    return NextResponse.json({ content: defaultSiteContent, source: 'fallback' }, { headers })
  }

  return NextResponse.json({ content: siteContentFromRows(data), source: 'database' }, { headers })
}
