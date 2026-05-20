'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Save, Sparkles, UserRoundPlus } from 'lucide-react'

const columns = [
  { key: 'mon', label: '週一' },
  { key: 'tue', label: '週二' },
  { key: 'wed', label: '週三' },
  { key: 'thu', label: '週四' },
  { key: 'fri', label: '週五' },
  { key: 'sat', label: '週六' },
  { key: 'sun', label: '週日' },
] as const

type PlannerRow = {
  date: string
  mon: string
  tue: string
  wed: string
  thu: string
  fri: string
  sat: string
  sun: string
}

type PlannerKey = keyof PlannerRow

const emptyRows: PlannerRow[] = [
  { date: '', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { date: '', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { date: '', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
]

export default function CoachPlannerPage() {
  const [rows, setRows] = useState(emptyRows)
  const [saved, setSaved] = useState(false)

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
                這裡保留教練熟悉的表格節奏：第一欄是日期與週數，後面依星期填課表。學員綁定完成後，儲存會同步到該學員看板。
              </p>
            </div>

            <div className="apple-card p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                <UserRoundPlus className="h-6 w-6" />
              </div>
              <h2 className="font-bold text-apple-gray-900">尚未選擇真實學員</h2>
              <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                下一步會接上 coach_students 綁定資料。現在可先整理課表格式，等待選擇真實學員後同步。
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
                套用模板
              </button>
            </div>
            <button
              onClick={() => setSaved(true)}
              className="apple-button-primary gap-2 px-5 py-2.5 text-sm"
            >
              <Save className="h-4 w-4" />
              儲存課表
            </button>
          </div>

          {saved && (
            <div className="mb-5 rounded-3xl bg-green-50 p-4 text-sm font-semibold text-green-800">
              已暫存。完成教練與學員綁定後，這裡會寫入 Supabase 的 training_plans。
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
                    <tr key={rowIndex} className="border-b border-black/10 last:border-b-0">
                      <td className="bg-white p-4 align-top font-bold text-apple-gray-900">
                        <input
                          value={row.date}
                          onChange={(event) => updateCell(rowIndex, 'date', event.target.value)}
                          placeholder="2026/5/20（1）"
                          className="w-full rounded-2xl border border-transparent bg-apple-gray-100 px-3 py-2 font-bold outline-none transition focus:border-black/20 focus:bg-white"
                        />
                      </td>
                      {columns.map((column) => (
                        <td key={column.key} className="p-3 align-top">
                          <textarea
                            value={row[column.key]}
                            onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                            placeholder="輸入訓練內容"
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
              ['現在', '表格可先整理課表格式，等待真實學員綁定。'],
              ['下一步', '建立教練邀请码與 coach_students 綁定。'],
              ['完成後', '儲存課表會寫入 training_plans 並同步到學員端。'],
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
