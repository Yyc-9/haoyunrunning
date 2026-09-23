import CoachSignupsClient from './CoachSignupsClient'

export const metadata = {
  title: '緊急聯絡人 - 好運跑班教練端',
  description: '查看學員與緊急聯絡人的聯絡方式及 LINE ID。',
}

export default function CoachSignupsPage() {
  return <CoachSignupsClient />
}
