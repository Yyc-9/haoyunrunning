import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '榮耀徽章｜好運跑班',
  description: '認識好運跑班 SUB 系列榮耀徽章、達標故事與申請方式。',
}

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return children
}
