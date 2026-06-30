import AdminDashboardClient from './AdminDashboardClient'

export const metadata = {
  title: '管理員後台 - 好運跑班',
  description: '好運跑班第一阶段管理員後台，用於管理學員、教練與課程報名訂單。',
}

export default function AdminPage() {
  return <AdminDashboardClient />
}
