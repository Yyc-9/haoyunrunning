import CoachDashboardClient from './CoachDashboardClient'

export const metadata = {
  title: '教练工作台 - 好运跑班',
  description: '好运跑班教练端，用於查看学员回馈、同步课表与管理教练权限。',
}

export default function CoachPage() {
  return <CoachDashboardClient />
}
