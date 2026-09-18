'use client'

import { useState } from 'react'
import type { AdminDashboardPayload } from '@/app/admin/AdminDashboardClient'
import { courseSeasonStatusLabels, overviewSeasonId } from '@/lib/course-seasons'
import { summarizeSeasonOrders } from '@/lib/admin-season-overview'

export default function AdminSeasonOverview({ data }: { data: AdminDashboardPayload }) {
  const [selectedId, setSelectedId] = useState('')
  const seasonId = overviewSeasonId(data.courseSeasons, selectedId)
  const season = data.courseSeasons.find((item) => item.id === seasonId)
  const summary = summarizeSeasonOrders(data.orders, seasonId)
  const courses = data.courseCapacity.filter((course) => course.seasonId === seasonId)
  const archived = season?.status === 'archived'
  const metrics = [
    ['已確認入帳', summary.approved.length], ['已回報，待人工核對', summary.pending.length],
    ['待匯款', summary.pendingTransfer.length], ['需補充／重複待處理', summary.needsReview.length],
    ['本季報名學員', summary.studentCount], ['本季班級', courses.length],
  ] as const

  return <section className="space-y-6" aria-label="季度總覽">
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-black/10 bg-white p-5 sm:flex-row sm:items-end">
      <div><h2 className="text-2xl font-black">季度總覽</h2><p className="mt-2 text-sm text-apple-gray-600">各季獨立統計；商城訂單請至銀行對帳查看。</p></div>
      <label className="block text-sm font-bold">查看季度<select value={seasonId} onChange={(event) => setSelectedId(event.target.value)} className="apple-input mt-2 w-full sm:w-64">
        {data.courseSeasons.map((item) => <option key={item.id} value={item.id}>{item.name} · {courseSeasonStatusLabels[item.status]}{item.isCurrent ? '（當前招生）' : ''}</option>)}
      </select></label>
    </div>
    {!season ? <p role="status">尚未建立季度。</p> : <>
      <p role="status" className={`rounded-xl p-4 text-sm ${archived ? 'bg-amber-50 text-amber-900' : 'bg-blue-50 text-blue-900'}`}>
        {season.name} · {courseSeasonStatusLabels[season.status]}。{archived ? '歷史資料僅供查閱，已停止報名、同步與修改。' : '下方數字與名單僅包含這一季。'}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-sm text-apple-gray-600">{label}</p><p className="mt-3 text-3xl font-black tabular-nums">{value}</p></div>)}</div>
      <p className="text-xs text-apple-gray-500">報名學員依信箱去重，排除需補充／重複記錄；入帳數為課程報名筆數。</p>
      <div className="rounded-2xl border border-black/10 bg-white p-5"><h3 className="text-lg font-black">{archived ? '封存核對紀錄' : '本季待核對'}</h3>
        {summary.pending.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{summary.pending.slice(0, 6).map((order) => <div key={order.id} className="rounded-xl bg-apple-gray-50 p-4"><p className="font-bold">{order.studentName}</p><p className="mt-1 text-sm">{order.courseName}</p></div>)}</div> : <p className="mt-3 text-sm text-apple-gray-600">本季沒有待核對款項。</p>}
      </div>
      <div className="rounded-2xl border border-black/10 bg-white p-5"><h3 className="text-lg font-black">本季班級入帳概況</h3><div className="mt-3 divide-y divide-black/10">{courses.map((course) => <div key={course.slug} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{course.name}</span><span className="shrink-0 tabular-nums">{course.paidCount} / {course.capacity} 已入帳</span></div>)}</div></div>
    </>}
  </section>
}
