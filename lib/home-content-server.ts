import 'server-only'

import { getPublicSiteContent } from '@/lib/public-site-content-server'

export async function getHomeHeroSlides() {
  try {
    return (await getPublicSiteContent()).content.heroSlides
  } catch {
    // The root provider renders a retry state, not historical photographs.
    return []
  }
}
