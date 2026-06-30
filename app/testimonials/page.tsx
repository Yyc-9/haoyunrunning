import TestimonialsSection from '@/components/TestimonialsSection'

export const metadata = {
  title: '上期學員回顧 - 好運跑班',
  description: '查看好運跑班上期課程學員回顧。',
}

export default function TestimonialsPage() {
  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="px-4 pb-4 pt-16 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
            上期回顧
          </p>
          <h1 className="mx-auto mb-5 max-w-4xl text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
            上期學員回顧
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-apple-gray-600">
            來自上期課程學員的真實回顧，記錄他們在訓練過程中的改變、突破與收穫。
          </p>
        </div>
      </section>
      <TestimonialsSection />
    </main>
  )
}
