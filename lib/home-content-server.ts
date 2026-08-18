import 'server-only'

import { unstable_cache } from 'next/cache'
import { defaultHeroSlides, normalizeHeroSlides } from '@/lib/site-content'
import { supabaseAdmin } from '@/lib/supabase-server'

const getCachedHomeHeroSlides = unstable_cache(
  async () => {
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
  },
  ['home-hero-slides'],
  { revalidate: 60, tags: ['site-content', 'home-hero-slides'] },
)

export async function getHomeHeroSlides() {
  return getCachedHomeHeroSlides()
}
