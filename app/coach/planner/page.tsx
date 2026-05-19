'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Save, Sparkles } from 'lucide-react'
import { coachStudents, plannerRows } from '@/lib/training-workflow-data'

const columns = [
  { key: 'mon', label: '週一' },
  { key: 'tue', label: '週二' },
  { key: 'wed', label: '週三' },
  { key: 'thu', label: '週四' },
  { key: 'fri', label: '週五' },
  { key: 'sat', label: '週六' },
  { key: 'sun', label: '週日' },
] as const

type PlannerRow = (typeof plannerRows)[number]
type PlannerKey = keyof PlannerRow

export default function CoachPlannerPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(coachStudents[0].id)
  const [rows, setRows] = useState(plannerRows)
  const [saved, setSaved] = useState(false)

  const selectedStudent = useMemo(
    () => coachStudents.find((student) => student.id === selectedStudentId) ?? coachStudents[0],
    [selectedStudentId]
  )

  const updateCell = (rowIndex: number, key: PlannerKey, value: string) => {
    setRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row))
    )
    setSaved(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <Link href="/coach" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700">
            <ArrowLeft className="h-4 w-4" />
            回教練工作台
          </Link>

          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Training planner
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">出課表面板</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                先保留教練熟悉的 Excel 節奏：第一欄是日期與週數，後面依星期填課表。之後每一格都可以同步到學員端。
              </p>
            </div>

            <div className="apple-card p-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-apple-gray-700">選擇學員</span>
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="apple-input"
                >
                  {coachStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} · {student.program}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-4 text-sm leading-6 text-apple-gray-600">
                {selectedStudent.goal} · 第 {selectedStudent.week} 週
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
            <div className="flex flex-wrap gap-2">
              <button className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                <Copy className="h-4 w-4" />
                複製上一週
              </button>
              <button className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4" />
                套用半馬模板
              </button>
            </div>
            <button
              onClick={() => setSaved(true)}
              className="apple-button-primary gap-2 px-5 py-2.5 text-sm"
            >
              <Save className="h-4 w-4" />
              儲存並同步概念
            </button>
          </div>

          {saved && (
            <div className="mb-5 rounded-3xl bg-green-50 p-4 text-sm font-semibold text-green-800">
              已保存概念狀態。真正接後端後，這一步會把課表同步給學員端。
            </div>
          )}

          <div className="apple-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 bg-apple-gray-100 text-left">
                    <th className="w-40 p-4 font-bold text-apple-gray-900">日期 / 週數</th>
                    {columns.map((column) => (
                      <th key={column.key} className="w-36 p-4 font-bold text-apple-gray-900">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={row.date} className="border-b border-black/10 last:border-b-0">
                      <td className="bg-white p-4 align-top font-bold text-apple-gray-900">
                        <input
                          value={row.date}
                          onChange={(event) => updateCell(rowIndex, 'date', event.target.value)}
                          className="w-full rounded-2xl border border-transparent bg-apple-gray-100 px-3 py-2 font-bold outline-none transition focus:border-black/20 focus:bg-white"
                        />
                      </td>
                      {columns.map((column) => (
                        <td key={column.key} className="p-3 align-top">
                          <textarea
                            value={row[column.key]}
                            onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                            rows={5}
                            className="min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-white px-3 py-3 leading-6 text-apple-gray-800 outline-none transition focus:border-black/30 focus:shadow-sm"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['第一版', '先保存成網站資料，取代 Line 追訊息。'],
              ['第二版', '接 Supabase 後做學員權限與教練權限。'],
              ['第三版', '支援 Google Sheets 匯入/匯出，讓既有流程平順轉移。'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10">
                <h2 className="font-bold text-apple-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
