'use client'

import HeroSection from '@/components/HeroSection'
import UpcomingActivitiesSection from '@/components/UpcomingActivitiesSection'
import FeaturesSection from '@/components/FeaturesSection'
import CoursesSection from '@/components/CoursesSection'
import SeasonalUpdateSection from '@/components/SeasonalUpdateSection'

export default function Home() {
  return (
    <>
      <HeroSection />
      <UpcomingActivitiesSection />
      <SeasonalUpdateSection />
      <FeaturesSection />
      <CoursesSection preview />
    </>
  )
}
