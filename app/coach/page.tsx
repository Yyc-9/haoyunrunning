import CoachDashboardClient from './CoachDashboardClient'

export const metadata = {
  title: '教練工作台 - 好運跑班',
  description: '好運跑班教練端概念頁，用於查看學員回饋、同步課表與管理教練權限。',
}

export default function CoachPage() {
  return <CoachDashboardClient />
}
