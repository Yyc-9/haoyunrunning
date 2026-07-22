import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '關於好運跑班 - 好運跑班',
  description: '認識好運跑班：面向台灣跑者的系統化跑步訓練團隊。',
  alternates: { canonical: '/about' },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
