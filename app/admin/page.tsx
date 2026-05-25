import AdminDashboardClient from './AdminDashboardClient'

export const metadata = {
  title: '管理员后台 - 好运跑班',
  description: '好运跑班第一阶段管理员后台，用于管理学员、教练与课程报名订单。',
}

export default function AdminPage() {
  return <AdminDashboardClient />
}
