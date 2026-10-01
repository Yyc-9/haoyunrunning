import CoachStudentsClient from './CoachStudentsClient'

export const metadata = {
  title: '學員列表 - 好運跑班教練端',
  description: '按季度與班級查看完整報名名單、核帳狀態及任課學員資料。',
}

export default async function CoachStudentsPage({ searchParams }: { searchParams: Promise<{ seasonId?: string; courseId?: string }> }) {
  const params = await searchParams
  return <CoachStudentsClient key={`${params.seasonId ?? ''}:${params.courseId ?? ''}`} initialSeasonId={params.seasonId ?? ''} initialCourseId={params.courseId ?? ''} />
}
