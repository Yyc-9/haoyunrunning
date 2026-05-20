import CoachStudentsClient from './CoachStudentsClient'

export const metadata = {
  title: '学员列表 - 好运跑班教练端',
  description: '查看好运跑班学员周數、目标、最近回馈与训练风险。',
}

export default function CoachStudentsPage() {
  return <CoachStudentsClient />
}
