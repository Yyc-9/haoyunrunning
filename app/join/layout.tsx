import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '課程報名 - 好運跑班',
  description: '查看好運跑班本期開課班級，直接前往各班官方報名表。',
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children
}
