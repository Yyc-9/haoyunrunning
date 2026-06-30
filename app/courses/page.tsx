import CoursesSection from '@/components/CoursesSection'

export const metadata = {
  title: '訓練課程 - 好運跑班',
  description: '探索好運跑班的專業訓練課程，適合各個水平的跑者',
}

export default function CoursesPage() {
  return (
    <main className="pt-24 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <CoursesSection />
    </main>
  )
}
