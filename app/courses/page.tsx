import CoursesSection from '@/components/CoursesSection'

export const metadata = {
  title: '训练课程 - 好運跑班',
  description: '探索好運跑班的专业训练课程，适合各个水平的跑者',
}

export default function CoursesPage() {
  return (
    <main className="pt-24 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <CoursesSection />
    </main>
  )
}
