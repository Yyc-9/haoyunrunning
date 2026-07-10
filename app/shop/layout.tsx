import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '好運商店 - 好運跑班',
  description: '查看好運跑班服飾、跑者配件與訓練補給。',
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
