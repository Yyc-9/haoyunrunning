import type { Metadata } from 'next'
import CoursesSection from '@/components/CoursesSection'

export const metadata: Metadata = {
  title: '訓練課程 - 好運跑班',
  description: '查看好運跑班本季度課表、上課地點、訓練方向與課程報名資訊。',
  alternates: { canonical: '/courses' },
}

export default function CoursesPage() {
  return (
    <main className="kinetic-page pt-24 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <CoursesSection />
    </main>
  )
}
