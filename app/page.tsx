import type { Metadata } from 'next'
import HeroSection from '@/components/HeroSection'
import UpcomingActivitiesSection from '@/components/UpcomingActivitiesSection'
import CoursesSection from '@/components/CoursesSection'
import { getHomeHeroSlides } from '@/lib/home-content-server'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default async function Home() {
  const initialHeroSlides = await getHomeHeroSlides()

  return (
    <>
      <link rel="preload" as="image" href={initialHeroSlides[0]} />
      <HeroSection initialImages={initialHeroSlides} />
      <CoursesSection preview />
      <UpcomingActivitiesSection />
    </>
  )
}
