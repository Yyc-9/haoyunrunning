import HeroSection from '@/components/HeroSection'
import FeaturesSection from '@/components/FeaturesSection'
import CoursesSection from '@/components/CoursesSection'
import TrainingLogPreview from '@/components/TrainingLogPreview'
import TestimonialsSection from '@/components/TestimonialsSection'
import CtaSection from '@/components/CtaSection'

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <CoursesSection />
      <TrainingLogPreview />
      <TestimonialsSection />
      <CtaSection />
    </>
  )
}