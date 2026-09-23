import { notFound } from 'next/navigation'
import CoachStudentsClient, { type BoundStudentRow } from '@/app/coach/students/CoachStudentsClient'

const students: BoundStudentRow[] = [
  ['林小晴', '週二台北 PB 班', '年底半馬穩定跑進 2 小時', '半馬 02:08:36'],
  ['陳宇安', '週三竹北夜跑班', '建立每週三次的跑步習慣', '10K 00:56:20'],
  ['黃以辰', '週四新莊初階班', '輕鬆完成第一場 10 公里', '尚未填寫'],
  ['王品涵', '週二台北 PB 班', '全馬配速與肌力訓練', '全馬 04:12:18'],
].map(([name, program, goal, pb], index) => ({
  id: `demo-${index}`, active: true, created_at: '2026-09-23T00:00:00Z',
  student: { id: `demo-${index}`, name, email: `runner${index + 1}@example.com`, program, goal, pb },
  recentFeedback: [{ id: `feedback-${index}`, created_at: '2026-09-22T00:00:00Z', distance_km: 6, pace_text: '6:15', average_heart_rate: 145, rpe: 5, feeling: '今天的節奏跑很順利，後半段能維持穩定呼吸。下次想練習更均勻的配速。', status: 'new' }],
}))

export default function CoachDisplayPreview() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <><div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2 text-center text-xs text-white shadow-lg">互動預覽 · 全部為虛擬學員資料</div><CoachStudentsClient previewStudents={students} /></>
}
