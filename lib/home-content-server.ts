import 'server-only'

import { connection } from 'next/server'
import { defaultHeroSlides, normalizeHeroSlides } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function getHomeHeroSlides() {
  await connection()

  if (!supabaseAdmin) return defaultHeroSlides

  try {
    const { data, error } = await supabaseAdmin
      .from('site_content')
      .select('value')
      .eq('key', 'hero_slides')
      .maybeSingle()

    if (error) throw error
    return normalizeHeroSlides(data?.value)
  } catch (error) {
    console.error('Load home hero slides on the server failed:', error)
    return defaultHeroSlides
  }
}
