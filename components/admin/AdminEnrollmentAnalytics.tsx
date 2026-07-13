'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarRange, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react'
import type { CourseSeason } from '@/lib/course-seasons'

type PaymentStatus = 'pending_transfer' | 'pending_review' | 'approved' | 'rejected'

type Enrollment = {
  id: string
  orderKind: 'course' | 'shop'
  studentName: string
  email: string
  courseName: string
  courseSlug: string
  seasonId: string
  seasonName: string
  amountText: string
  transferLastFive: string
  status: PaymentStatus
  submittedAt: string
  notes: string
  reviewNote: string | null
  registrationDetails: Array<{ label: string; value: string }>
}

type Capacity = {
  slug: string
  name: string
  seasonId: string
  seasonName: string
  capacity: number
  paidCount: number
  pendingTransferCount: number
  pendingReviewCount: number
  remaining: number
}

type Props = {
  orders: Enrollment[]
  courseCapacity: Capacity[]
  seasons: CourseSeason[]
}

const statusLabels: Record<PaymentStatus, string> = {
  pending_transfer: '待付款',
  pending_review: '待核對',
  approved: '已確認',
  rejected: '需處理',
}

const statusTone: Record<PaymentStatus, string> = {
  pending_transfer: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

function detail(order: Enrollment, label: string) {
  return order.registrationDetails.find((item) => item.label === label)?.value ?? ''
}

function studentType(order: Enrollment) {
  const value = detail(order, '學員身分')
  if (value.includes('新生')) return 'new'
  if (value.includes('舊生')) return 'returning'
  return 'unknown'
}

function knownAmount(value: string) {
  const match = value.replaceAll(',', '').match(/(?:\$|NT\$?)?\s*(\d{3,6})/i)
  return match ? Number(match[1]) : null
}

function formatDate(value: string) {
  const timestamp = new Date(value)
  if (!value || Number.isNaN(timestamp.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function csvCell(value: unknown) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export default function AdminEnrollmentAnalytics({ orders, courseCapacity, seasons }: Props) {
  const initialSeasonId = seasons.find((season) => season.code === '2026-Q3')?.id
    ?? seasons.find((season) => season.isCurrent)?.id
    ?? seasons[0]?.id
    ?? ''
  const [seasonId, setSeasonId] = useState(initialSeasonId)
  const [query, setQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'new' | 'returning'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Enrollment | null>(null)
  const pageSize = 25

  const season = seasons.find((item) => item.id === seasonId)
  const seasonOrders = useMemo(
    () => orders.filter((order) => order.orderKind === 'course' && order.seasonId === seasonId),
    [orders, seasonId]
  )
  const capacities = useMemo(
    () => courseCapacity.filter((course) => course.seasonId === seasonId),
    [courseCapacity, seasonId]
  )

  const summary = useMemo(() => {
    const approved = seasonOrders.filter((order) => order.status === 'approved').length
    const capacity = capacities.reduce((sum, course) => sum + course.capacity, 0)
    const amounts = seasonOrders.map((order) => knownAmount(order.amountText)).filter((value): value is number => value !== null)
    const classCounts = capacities.map((course) => course.paidCount).sort((a, b) => a - b)
    const midpoint = Math.floor(classCounts.length / 2)
    const median = classCounts.length === 0 ? 0 : classCounts.length % 2
      ? classCounts[midpoint]
      : (classCounts[midpoint - 1] + classCounts[midpoint]) / 2

    return {
      records: seasonOrders.length,
      people: new Set(seasonOrders.map((order) => `${order.email.trim().toLowerCase()}|${order.studentName.trim()}`)).size,
      approved,
      newCount: seasonOrders.filter((order) => studentType(order) === 'new').length,
      returningCount: seasonOrders.filter((order) => studentType(order) === 'returning').length,
      revenue: amounts.reduce((sum, amount) => sum + amount, 0),
      unknownAmounts: seasonOrders.length - amounts.length,
      occupancy: capacity ? Math.round((approved / capacity) * 1000) / 10 : 0,
      average: classCounts.length ? approved / classCounts.length : 0,
      median,
    }
  }, [capacities, seasonOrders])

  const trend = useMemo(() => {
    const counts = new Map<string, number>()
    seasonOrders.forEach((order) => {
      const timestamp = new Date(order.submittedAt)
      if (Number.isNaN(timestamp.getTime())) return
      const date = timestamp.toISOString().slice(0, 10)
      counts.set(date, (counts.get(date) ?? 0) + 1)
    })
    const entries = [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-14)
    const max = Math.max(1, ...entries.map(([, count]) => count))
    return entries.map(([date, count]) => ({ date, count, width: `${Math.max(8, (count / max) * 100)}%` }))
  }, [seasonOrders])

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()
    return seasonOrders.filter((order) => {
      if (courseFilter !== 'all' && order.courseSlug !== courseFilter) return false
      if (typeFilter !== 'all' && studentType(order) !== typeFilter) return false
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      return !text || [order.studentName, order.email, order.courseName, order.transferLastFive]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    })
  }, [courseFilter, query, seasonOrders, statusFilter, typeFilter])

  useEffect(() => setPage(1), [courseFilter, query, seasonId, statusFilter, typeFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  function exportRoster() {
    const headers = ['季度', '姓名', '信箱', '班級', '身分', '金額', '後五碼', '狀態', '報名時間']
    const rows = filtered.map((order) => [
      order.seasonName,
      order.studentName,
      order.email,
      order.courseName,
      studentType(order) === 'new' ? '新生' : studentType(order) === 'returning' ? '舊生' : '',
      order.amountText,
      order.transferLastFive,
      statusLabels[order.status],
      order.submittedAt,
    ])
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${season?.name || '季度'}-學員名單.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-black/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-black text-apple-gray-950">季度招生總覽</h2><p className="mt-1 text-sm font-semibold text-apple-gray-500">{season?.name}</p></div>
        <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="apple-input w-full sm:w-64">
          {seasons.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isCurrent ? '（前台招生）' : ''}</option>)}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['報名記錄', summary.records, `去重學員 ${summary.people} 人`],
          ['已確認', summary.approved, `班額使用率 ${summary.occupancy}%`],
          ['新生 / 舊生', `${summary.newCount} / ${summary.returningCount}`, `新生占 ${summary.records ? Math.round(summary.newCount / summary.records * 1000) / 10 : 0}%`],
          ['已知報名金額', `NT$ ${summary.revenue.toLocaleString('zh-TW')}`, summary.unknownAmounts ? `${summary.unknownAmounts} 筆插班金額另計` : '所有金額已計入'],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-apple-gray-500">{label}</p><p className="mt-2 text-2xl font-black text-apple-gray-950">{value}</p><p className="mt-1 text-xs font-semibold text-apple-gray-500">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section className="rounded-lg border border-black/10 bg-white">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-black"><BarChart3 className="h-4 w-4" />班級名額</h3><span className="text-xs font-bold text-apple-gray-500">平均 {summary.average.toFixed(1)}｜中位數 {summary.median}</span></div>
          <div className="divide-y divide-black/5">
            {capacities.map((course) => {
              const used = course.capacity ? Math.min(100, course.paidCount / course.capacity * 100) : 0
              return <div key={course.slug} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_90px_140px] sm:items-center"><p className="truncate text-sm font-bold">{course.name}</p><p className={`text-sm font-black ${course.remaining <= 2 ? 'text-red-600' : 'text-apple-gray-700'}`}>{course.paidCount} / {course.capacity}</p><div className="h-2 overflow-hidden rounded-full bg-apple-gray-100"><div className={`h-full rounded-full ${used >= 95 ? 'bg-red-500' : used >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${used}%` }} /></div></div>
            })}
          </div>
        </section>
        <section className="rounded-lg border border-black/10 bg-white">
          <div className="border-b border-black/10 px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-black"><CalendarRange className="h-4 w-4" />報名趨勢</h3></div>
          <div className="space-y-2 p-4">{trend.length ? trend.map((item) => <div key={item.date} className="grid grid-cols-[52px_minmax(0,1fr)_28px] items-center gap-2"><span className="text-xs font-semibold text-apple-gray-500">{item.date.slice(5).replace('-', '/')}</span><div className="h-2 rounded-full bg-apple-gray-100"><div className="h-2 rounded-full bg-black" style={{ width: item.width }} /></div><span className="text-right text-xs font-black">{item.count}</span></div>) : <p className="py-8 text-center text-sm font-semibold text-apple-gray-500">本季度尚無報名資料。</p>}</div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white">
        <div className="grid gap-3 border-b border-black/10 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_130px_130px_auto]">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋姓名、信箱或後五碼" className="apple-input pl-10" /></label>
          <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="apple-input"><option value="all">全部班級</option>{capacities.map((course) => <option key={course.slug} value={course.slug}>{course.name}</option>)}</select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="apple-input"><option value="all">全部身分</option><option value="new">新生</option><option value="returning">舊生</option></select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="apple-input"><option value="all">全部狀態</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button type="button" onClick={exportRoster} disabled={!filtered.length} className="apple-button-outline gap-2 px-4 py-2.5 text-sm disabled:opacity-40"><Download className="h-4 w-4" />匯出</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-apple-gray-100 text-xs text-apple-gray-600"><tr>{['學員', '班級', '身分', '金額', '後五碼', '狀態', '報名時間', ''].map((label) => <th key={label || 'action'} className="px-3 py-2.5 font-bold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-black/5">{visible.map((order) => <tr key={order.id} className="hover:bg-apple-gray-50"><td className="px-3 py-2.5"><p className="font-bold">{order.studentName}</p><p className="max-w-52 truncate text-xs text-apple-gray-500">{order.email}</p></td><td className="max-w-64 truncate px-3 py-2.5 font-semibold text-apple-gray-700">{order.courseName}</td><td className="px-3 py-2.5">{studentType(order) === 'new' ? '新生' : studentType(order) === 'returning' ? '舊生' : '-'}</td><td className="px-3 py-2.5 font-semibold">{order.amountText}</td><td className="px-3 py-2.5 font-mono">{order.transferLastFive || '-'}</td><td className="px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone[order.status]}`}>{statusLabels[order.status]}</span></td><td className="whitespace-nowrap px-3 py-2.5 text-xs text-apple-gray-500">{formatDate(order.submittedAt)}</td><td className="px-3 py-2.5 text-right"><button type="button" onClick={() => setSelected(order)} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black hover:text-white" aria-label={`查看 ${order.studentName} 的報名資料`}><ChevronRight className="h-4 w-4" /></button></td></tr>)}</tbody>
          </table>
        </div>
        {!filtered.length ? <p className="p-10 text-center text-sm font-semibold text-apple-gray-500">沒有符合條件的學員。</p> : null}
        <div className="flex flex-col gap-3 border-t border-black/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="font-semibold text-apple-gray-500">共 {filtered.length} 筆，第 {page} / {pageCount} 頁</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex h-9 items-center gap-1 rounded-full border px-3 font-bold disabled:opacity-30"><ChevronLeft className="h-4 w-4" />上一頁</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="inline-flex h-9 items-center gap-1 rounded-full border px-3 font-bold disabled:opacity-30">下一頁<ChevronRight className="h-4 w-4" /></button></div></div>
      </section>

      {selected ? <div className="fixed inset-0 z-[90] bg-black/35" role="dialog" aria-modal="true" aria-label="學員報名詳情" onClick={() => setSelected(null)}><aside className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b p-5"><div><p className="text-xs font-bold text-apple-gray-500">{selected.seasonName}</p><h3 className="mt-1 text-2xl font-black">{selected.studentName}</h3><p className="mt-1 text-sm text-apple-gray-600">{selected.email}</p></div><button type="button" onClick={() => setSelected(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border" aria-label="關閉"><X className="h-4 w-4" /></button></div><div className="flex-1 overflow-y-auto p-5"><div className="grid gap-3 sm:grid-cols-2">{[['報名班級', selected.courseName], ['學員身分', detail(selected, '學員身分')], ['金額', selected.amountText], ['匯款後五碼', selected.transferLastFive], ['狀態', statusLabels[selected.status]], ['報名時間', formatDate(selected.submittedAt)]].map(([label, value]) => <div key={label} className="rounded-lg bg-apple-gray-100 p-3"><p className="text-xs font-bold text-apple-gray-500">{label}</p><p className="mt-1 break-words text-sm font-bold">{value || '-'}</p></div>)}</div><dl className="mt-5 divide-y border-y">{selected.registrationDetails.filter((item) => item.label !== '學員身分').map((item) => <div key={item.label} className="py-3"><dt className="text-xs font-bold text-apple-gray-500">{item.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6">{item.value}</dd></div>)}{selected.notes ? <div className="py-3"><dt className="text-xs font-bold text-apple-gray-500">備註</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-semibold">{selected.notes}</dd></div> : null}</dl></div></aside></div> : null}
    </section>
  )
}
