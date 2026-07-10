import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '商店結帳 - 好運跑班',
  description: '確認好運商店訂單、配送資料與安全付款方式。',
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
