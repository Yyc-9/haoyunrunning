import CoachStudentsClient from './CoachStudentsClient'

export const metadata = {
  title: '學員列表 - 好運跑班教練端',
  description: '查看好運跑班學員周數、目標、最近回饋與訓練風險。',
}

export default function CoachStudentsPage() {
  return <CoachStudentsClient />
}
