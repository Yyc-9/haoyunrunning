import type { Metadata } from 'next'
import HeroSection from '@/components/HeroSection'
import UpcomingActivitiesSection from '@/components/UpcomingActivitiesSection'
import CoursesSection from '@/components/CoursesSection'
import { getHomeHeroSlides } from '@/lib/home-content-server'

export const metadata: Metadata = {
  title: '好運跑班｜認識跑步，跑向更穩定的自己',
  description: '好運跑班提供科學、系統、個人化的跑步訓練，陪你從規律跑步走向下一個賽事目標。',
  alternates: { canonical: '/' },
}

export default async function Home() {
  const initialHeroSlides = await getHomeHeroSlides()

  return (
    <>
      <HeroSection initialImages={initialHeroSlides} />
      <UpcomingActivitiesSection />
      <CoursesSection preview />
    </>
  )
}
