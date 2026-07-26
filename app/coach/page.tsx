import CoachDashboardClient from './CoachDashboardClient'

export const metadata = {
  title: '教練工作台 - 好運跑班',
  description: '好運跑班教練端，用於管理名下學員、團練報名、到課簽到與課程點名。',
}

export default function CoachPage() {
  return <CoachDashboardClient />
}
