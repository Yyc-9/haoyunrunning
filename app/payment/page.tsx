import { redirect } from 'next/navigation'

export const metadata = {
  title: '課程報名 - 好運跑班',
  description: '查看好運跑班本期課程並前往官方報名表。',
}

export default function PaymentPage() {
  redirect('/courses')
}
