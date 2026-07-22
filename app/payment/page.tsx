import type { Metadata } from 'next'
import PaymentStatusClient from './PaymentStatusClient'

export const metadata: Metadata = {
  title: '我的匯款狀態 - 好運跑班',
  description: '登入後查看好運跑班課程匯款資料與財務核對狀態。',
  robots: {
    index: false,
    follow: false,
  },
}

export default function PaymentPage() {
  return <PaymentStatusClient />
}
