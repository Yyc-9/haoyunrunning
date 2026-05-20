import TestimonialsSection from '@/components/TestimonialsSection'
import TestimonialComments from '@/components/TestimonialComments'

export const metadata = {
  title: '上期学员回顾 - 好运跑班',
  description: '查看好运跑班上期课程学员回顾。',
}

export default function TestimonialsPage() {
  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="px-4 pb-4 pt-16 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
            Previous camp review
          </p>
          <h1 className="mx-auto mb-5 max-w-4xl text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
            上期学员回顾
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-apple-gray-600">
            这里展示已经通过后台筛选并手动发布的结营学员回顾。新的回顾内容只在每期课程结束后定向邀请提交。
          </p>
        </div>
      </section>
      <TestimonialsSection />
      <TestimonialComments />
    </main>
  )
}
