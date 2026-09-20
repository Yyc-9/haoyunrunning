import { Suspense } from 'react'
import EnrollmentNotificationsClient from './EnrollmentNotificationsClient'

export const metadata = { title: '報名通知 - 好運跑班', robots: { index: false, follow: false } }
export default function NotificationsPage() {
  return <Suspense fallback={<p className="px-6 pt-32">正在讀取報名通知…</p>}><EnrollmentNotificationsClient /></Suspense>
}
