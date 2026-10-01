import { notFound } from 'next/navigation'
import CoachStudentsClient from '@/app/coach/students/CoachStudentsClient'
import { coachRosterPreview } from '@/lib/coach-roster-preview'

export default function CoachDisplayPreview() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <><div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2 text-center text-xs text-white shadow-lg">互動預覽 · 全部為虛擬學員資料</div><CoachStudentsClient previewRoster={coachRosterPreview} /></>
}
