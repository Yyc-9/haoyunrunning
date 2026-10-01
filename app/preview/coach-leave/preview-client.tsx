'use client'

import { useState } from 'react'
import CoachLeaveDialog, { type CoachLeaveChoice } from '@/components/CoachLeaveDialog'
import type { CoachLeaveOption } from '@/lib/course-attendance'

const options: CoachLeaveOption[] = [
  { courseId: 'wednesday', courseName: '2026Q4 週三竹北夜跑班', classTime: '19:30', sessions: [{ date: '2026-10-07', remaining: 5 }, { date: '2026-10-14', remaining: 0 }] },
  { courseId: 'thursday', courseName: '2026Q4 週四竹南初階班', classTime: '19:00', sessions: [{ date: '2026-10-08', remaining: 8 }] },
]
const loadOptions = async () => options

export default function CoachLeavePreview() {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<CoachLeaveChoice | null>(null)
  return <main className="min-h-screen bg-gray-50 px-4 pb-16 pt-28"><div className="mx-auto max-w-2xl">
    <p className="text-sm font-semibold text-blue-700">互動預覽 · 範例資料，不會更動真實學員紀錄</p>
    <h1 className="mt-3 text-2xl font-black">課程點名 · 請假處理</h1>
    <article className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><h2 className="font-bold">學員名單 <span className="float-right text-gray-500">10/5（週一）</span></h2><hr className="my-5" /><p className="text-xl font-black">範例學員</p><p className="mt-2 text-sm text-amber-700">待核帳 · 可正常點名</p><p className="mt-2 text-sm text-gray-600">所屬班級：2026Q4 週一竹北夜跑班</p>
      {saved && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{saved.leaveMode === 'self_training' ? '自主訓練 · 教練已給課表，不可再線下補課' : `已安排 ${options.find(item => item.courseId === saved.targetCourseSeasonCourseId)?.courseName} · ${saved.targetSessionDate} 補課`}</p>}
      <div className="mt-5 grid grid-cols-3 gap-2"><button disabled className="apple-button-outline min-h-11 opacity-40">到課</button><button type="button" onClick={() => setOpen(true)} disabled={saved?.leaveMode === 'self_training'} className="apple-button-outline min-h-11 border-amber-300 bg-amber-50 text-amber-800 disabled:opacity-40">請假</button><button disabled className="apple-button-outline min-h-11 opacity-40">已扣除</button></div>
      <p className="mt-3 text-xs text-gray-500">可提前登記請假；到課點名須等課次開始</p>
    </article><button type="button" className="mt-5 min-h-11 text-sm underline" onClick={() => setSaved(null)}>重設預覽</button>
    {open && <CoachLeaveDialog studentName="範例學員" sessionDate="2026-10-05" loadOptions={loadOptions} onSave={async choice => { setSaved(choice) }} onClose={() => setOpen(false)} />}
  </div></main>
}
