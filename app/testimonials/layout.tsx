import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '學員見證 - 好運跑班',
  description: '從訓練現場與學員分享，認識好運跑班陪伴跑者成長的方式。',
  alternates: { canonical: '/testimonials' },
}

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return children
}
