import TestimonialsSection from '@/components/TestimonialsSection'
import TestimonialComments from '@/components/TestimonialComments'

export const metadata = {
  title: '學員見證 - 好運跑班',
  description: '閱讀好運跑班學員的訓練故事，也留下你的跑步感受。',
}

export default function TestimonialsPage() {
  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="px-4 pb-4 pt-16 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
            Runner stories
          </p>
          <h1 className="mx-auto mb-5 max-w-4xl text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
            每一段進步，都值得被好好記下來。
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-apple-gray-600">
            這裡收集跑者在好運跑班裡的訓練感受、突破與回饋。你也可以選擇留下自己的故事，讓下一位正在猶豫的跑者看見。
          </p>
        </div>
      </section>
      <TestimonialsSection />
      <TestimonialComments />
    </main>
  )
}
