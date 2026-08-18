'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CalendarRange, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, FileSpreadsheet, Loader2, Package, RotateCcw, Search, Trash2, X } from 'lucide-react'
import type { CourseSeason } from '@/lib/course-seasons'
import { paymentOrderStatusDescriptions, paymentOrderStatusLabels, type PaymentOrderStatus } from '@/lib/payment'
import { supabase } from '@/lib/supabase'

type PaymentStatus = PaymentOrderStatus

type AttendanceAnomaly = {
  attendanceId: string
  sessionDate: string
  billingStartSessionDate: string
  status: 'open' | 'resolved'
  outcome: '' | 'supplement_paid' | 'waived'
  resolutionNote: string
  resolvedAt: string | null
  markedAt: string
}

type Enrollment = {
  id: string
  orderKind: 'course' | 'shop'
  orderNumber: string
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
  paymentReference: string
  paymentChannelLabel: string
  assignedAccount: string
  inventoryReserved: boolean
  items: string[]
  registrationDetails: Array<{ label: string; value: string }>
  attendanceAnomalies: AttendanceAnomaly[]
  openAttendanceAnomalyCount: number
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

type SeasonSyncSource = {
  id: string
  seasonId: string
  provider: 'google_sheets'
  spreadsheetId: string
  sourceUrl: string
  active: boolean
  lastSyncedAt: string | null
  lastResult: Record<string, unknown>
  lastError: string
  updatedAt: string
}

type Props = {
  orders: Enrollment[]
  courseCapacity: Capacity[]
  seasons: CourseSeason[]
  syncSources: SeasonSyncSource[]
  runAction: (id: string, action: Record<string, unknown>) => Promise<boolean>
  updatingId: string
}

const courseStatusLabels = paymentOrderStatusLabels['zh-TW']
const shopStatusLabels: Record<PaymentStatus, string> = {
  pending_transfer: '待確認自取',
  pending_review: '待處理',
  approved: '已確認自取',
  rejected: '需聯絡顧客',
}

const shopStatusDescriptions: Record<PaymentStatus, string> = {
  pending_transfer: '訂單已建立，等待團隊確認自取安排。',
  pending_review: '訂單需要管理員進一步處理。',
  approved: '已確認跑班自取，請依團隊通知取貨。',
  rejected: '請聯絡顧客補充或確認訂單安排。',
}

const statusLegend: Array<[PaymentStatus, string]> = [
  ['pending_transfer', 'bg-amber-50 text-amber-800'],
  ['pending_review', 'bg-blue-50 text-blue-800'],
  ['approved', 'bg-emerald-50 text-emerald-800'],
  ['rejected', 'bg-red-50 text-red-800'],
]

const statusTone: Record<PaymentStatus, string> = {
  pending_transfer: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

function detail(order: Enrollment, label: string) {
  return order.registrationDetails.find((item) => item.label === label)?.value ?? ''
}

function statusLabel(order: Enrollment) {
  return order.orderKind === 'course'
    ? courseStatusLabels[order.status]
    : shopStatusLabels[order.status]
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

function resultNumber(result: Record<string, unknown>, key: string) {
  const value = Number(result[key])
  return Number.isFinite(value) ? value : 0
}

export default function AdminEnrollmentAnalytics({ orders, courseCapacity, seasons, syncSources, runAction, updatingId }: Props) {
  const initialSeasonId = seasons.find((season) => season.code === '2026-Q3')?.id
    ?? seasons.find((season) => season.isCurrent)?.id
    ?? seasons[0]?.id
    ?? ''
  const [seasonId, setSeasonId] = useState(initialSeasonId)
  const [query, setQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'new' | 'returning'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'open'>('all')
  const [listKind, setListKind] = useState<'course' | 'shop'>('course')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Enrollment | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [syncScript, setSyncScript] = useState('')
  const [syncScriptError, setSyncScriptError] = useState('')
  const [syncScriptLoading, setSyncScriptLoading] = useState(false)
  const pageSize = 25

  const season = seasons.find((item) => item.id === seasonId)
  const syncSource = syncSources.find((item) => item.seasonId === seasonId && item.active)
  const seasonOrders = useMemo(
    () => orders.filter((order) => order.orderKind === 'course' && order.seasonId === seasonId),
    [orders, seasonId]
  )
  const capacities = useMemo(
    () => courseCapacity.filter((course) => course.seasonId === seasonId),
    [courseCapacity, seasonId]
  )
  const shopOrders = useMemo(() => orders.filter((order) => order.orderKind === 'shop'), [orders])

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
      openAttendanceAnomalies: seasonOrders.reduce((sum, order) => sum + order.openAttendanceAnomalyCount, 0),
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
    const source = listKind === 'course' ? seasonOrders : shopOrders
    return source.filter((order) => {
      if (listKind === 'course' && courseFilter !== 'all' && order.courseSlug !== courseFilter) return false
      if (listKind === 'course' && typeFilter !== 'all' && studentType(order) !== typeFilter) return false
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      if (listKind === 'course' && attendanceFilter === 'open' && order.openAttendanceAnomalyCount === 0) return false
      return !text || [order.studentName, order.email, order.courseName, order.orderNumber, order.transferLastFive, order.items.join(' ')]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    })
  }, [attendanceFilter, courseFilter, listKind, query, seasonOrders, shopOrders, statusFilter, typeFilter])

  useEffect(() => setPage(1), [attendanceFilter, courseFilter, listKind, query, seasonId, statusFilter, typeFilter])
  useEffect(() => setReviewNote(selected?.reviewNote ?? ''), [selected])
  useEffect(() => setResolutionNote(''), [selected])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  function exportRoster() {
    const headers = ['類型', '季度', '訂單編號', '姓名', '信箱', '班級或商品', '身分', '金額', listKind === 'shop' ? '取貨方式' : '後五碼', '狀態', '管理備註', '提交時間']
    const rows = filtered.map((order) => [
      order.orderKind === 'shop' ? '商城' : '課程',
      order.seasonName,
      order.orderNumber,
      order.studentName,
      order.email,
      order.orderKind === 'shop' ? order.items.join('、') : order.courseName,
      order.orderKind === 'course' ? (studentType(order) === 'new' ? '新生' : studentType(order) === 'returning' ? '舊生' : '') : '',
      order.amountText,
      listKind === 'shop' ? '跑班自取' : order.transferLastFive,
      statusLabel(order),
      order.reviewNote ?? '',
      order.submittedAt,
    ])
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = listKind === 'course' ? `${season?.name || '季度'}-學員名單.csv` : '好運商城訂單.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function flagOrderForReview() {
    if (!selected) return
    const saved = await runAction(selected.id, {
      action: 'review_order',
      orderId: selected.id,
      orderKind: selected.orderKind,
      status: 'rejected',
      reviewNote,
    })
    if (saved) setSelected(null)
  }

  async function confirmShopPickup() {
    if (!selected || selected.orderKind !== 'shop') return
    const saved = await runAction(selected.id, {
      action: 'review_order',
      orderId: selected.id,
      orderKind: 'shop',
      status: 'approved',
      reviewNote: reviewNote || '已確認跑班自取，請依團隊通知取貨。',
    })
    if (saved) setSelected(null)
  }

  async function deleteOrder() {
    if (!selected || selected.status === 'approved') return
    const inventoryMessage = selected.orderKind === 'shop' && selected.inventoryReserved
      ? ' 系統會同時歸還這筆訂單預留的商品庫存。'
      : ''
    if (!window.confirm(`確定刪除「${selected.studentName}」的${selected.orderKind === 'shop' ? '商城訂單' : '課程報名'}？${inventoryMessage} 此操作無法復原。`)) return
    const deleted = await runAction(`delete-${selected.id}`, {
      action: 'delete_order',
      orderId: selected.id,
      orderKind: selected.orderKind,
    })
    if (deleted) setSelected(null)
  }

  async function resolveAttendance(anomaly: AttendanceAnomaly, outcome: 'supplement_paid' | 'waived' | 'reopen') {
    if (!selected) return
    const saved = await runAction(`attendance-${anomaly.attendanceId}`, {
      action: 'resolve_attendance_anomaly',
      attendanceId: anomaly.attendanceId,
      outcome,
      resolutionNote,
    })
    if (saved) setSelected(null)
  }

  async function loadSyncScript() {
    if (!seasonId) return
    setSyncScriptLoading(true)
    setSyncScriptError('')
    try {
      if (!supabase) throw new Error('登入服務尚未設定。')
      const { data: sessionData } = await supabase.auth.getSession()
      const response = await fetch('/api/admin/google-sheets-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ seasonId }),
      })
      const result = await response.json().catch(() => ({})) as { script?: string; error?: string }
      if (!response.ok || !result.script) throw new Error(result.error || '無法取得同步程式。')
      setSyncScript(result.script)
    } catch (error) {
      setSyncScriptError(error instanceof Error ? error.message : '無法取得同步程式。')
    } finally {
      setSyncScriptLoading(false)
    }
  }

  const selectedSummary = selected
    ? selected.orderKind === 'shop'
      ? [
          ['訂單編號', selected.orderNumber],
          ['商品', selected.items.join('、')],
          ['金額', selected.amountText],
          ['取貨方式', '跑班自取'],
          ['狀態', shopStatusLabels[selected.status]],
          ['提交時間', formatDate(selected.submittedAt)],
          ['庫存', selected.inventoryReserved ? '已預留' : '未預留'],
        ]
      : [
          ['報名班級', selected.courseName],
          ['學員身分', detail(selected, '學員身分')],
          ['金額', selected.amountText],
          ['匯款後五碼', selected.transferLastFive],
          ['狀態', courseStatusLabels[selected.status]],
          ['報名時間', formatDate(selected.submittedAt)],
        ]
    : []

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-black/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-black text-apple-gray-950">季度招生總覽</h2><p className="mt-1 text-sm font-semibold text-apple-gray-500">{season?.name}</p></div>
        <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="apple-input w-full sm:w-64">
          {seasons.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isCurrent ? '（前台招生）' : ''}</option>)}
        </select>
      </div>

      {syncSource ? (
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${syncSource.lastError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-apple-gray-950">Q3 Google 表格同步</h3>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-black ${syncSource.lastError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {syncSource.lastError ? '同步異常' : syncSource.lastSyncedAt ? '同步正常' : '已連結'}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-apple-gray-500">
                  {syncSource.lastSyncedAt ? `最近同步 ${formatDate(syncSource.lastSyncedAt)}` : '等待第一次自動同步'}
                  {syncSource.lastSyncedAt ? `｜表格 ${resultNumber(syncSource.lastResult, 'records')} 筆｜新增 ${resultNumber(syncSource.lastResult, 'inserted')}｜換班 ${resultNumber(syncSource.lastResult, 'moved')}｜更新 ${resultNumber(syncSource.lastResult, 'updated')}` : ''}
                </p>
                {syncSource.lastError ? <p className="mt-1 text-xs font-bold text-red-700">{syncSource.lastError}</p> : null}
                {resultNumber(syncSource.lastResult, 'missing') > 0 ? <p className="mt-1 text-xs font-bold text-amber-700">網站另有 {resultNumber(syncSource.lastResult, 'missing')} 筆表格中未找到的舊資料，系統已保留並等待人工確認。</p> : null}
                {resultNumber(syncSource.lastResult, 'duplicateGroups') > 0 ? <p className="mt-1 text-xs font-bold text-amber-700">表格中有 {resultNumber(syncSource.lastResult, 'duplicateGroups')} 組同班、同信箱及同姓名的重複資料，共 {resultNumber(syncSource.lastResult, 'duplicateRecords')} 筆，請在學員名單確認後再決定是否刪除。</p> : null}
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2">
              <a href={syncSource.sourceUrl} target="_blank" rel="noreferrer" className="apple-button-outline gap-2 px-4 py-2.5 text-sm"><ExternalLink className="h-4 w-4" />開啟表格</a>
              <button type="button" onClick={loadSyncScript} disabled={syncScriptLoading} className="apple-button-primary gap-2 px-4 py-2.5 text-sm disabled:opacity-40">
                {syncScriptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}同步設定
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-2 rounded-lg border border-black/10 bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
        {statusLegend.map(([status, tone]) => (
          <div key={status} className={`rounded-md px-3 py-2.5 ${tone}`}>
            <p className="text-xs font-black">{listKind === 'course' ? courseStatusLabels[status] : shopStatusLabels[status]}</p>
            <p className="mt-1 text-[11px] font-semibold leading-5 opacity-80">{listKind === 'course' ? paymentOrderStatusDescriptions[status] : shopStatusDescriptions[status]}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['報名記錄', summary.records, `去重學員 ${summary.people} 人`],
          ['已確認入帳', summary.approved, `班額使用率 ${summary.occupancy}%`],
          ['新生 / 舊生', `${summary.newCount} / ${summary.returningCount}`, `新生占 ${summary.records ? Math.round(summary.newCount / summary.records * 1000) / 10 : 0}%`],
          ['已知報名金額', `NT$ ${summary.revenue.toLocaleString('zh-TW')}`, summary.unknownAmounts ? `${summary.unknownAmounts} 筆插班金額另計` : '所有金額已計入'],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-apple-gray-500">{label}</p><p className="mt-2 text-2xl font-black text-apple-gray-950">{value}</p><p className="mt-1 text-xs font-semibold text-apple-gray-500">{note}</p>
          </div>
        ))}
      </div>

      {summary.openAttendanceAnomalies > 0 ? (
        <button type="button" onClick={() => { setListKind('course'); setAttendanceFilter('open') }} className="flex w-full items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-amber-950">
          <span className="flex min-w-0 items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><span><span className="block font-black">{summary.openAttendanceAnomalies} 筆計費起點異常待處理</span><span className="mt-1 block text-xs font-semibold leading-5 opacity-75">教練已點名到課，但到課日期早於學員選擇的計費起點。</span></span></span>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </button>
      ) : null}

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
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black text-apple-gray-950">名單與審核</h3>
            <p className="mt-1 text-xs font-semibold text-apple-gray-500">{listKind === 'course' ? '在同一份緊湊名單中查看資料、核對匯款與處理異常。' : '在同一份緊湊名單中查看商城訂單與跑班自取安排。'}</p>
          </div>
          <div className="grid grid-cols-2 rounded-lg bg-apple-gray-100 p-1">
            <button type="button" onClick={() => setListKind('course')} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${listKind === 'course' ? 'bg-white text-black shadow-sm' : 'text-apple-gray-500'}`}><CalendarRange className="h-4 w-4" />課程報名</button>
            <button type="button" onClick={() => setListKind('shop')} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold ${listKind === 'shop' ? 'bg-white text-black shadow-sm' : 'text-apple-gray-500'}`}><Package className="h-4 w-4" />商城訂單</button>
          </div>
        </div>
        <div className={`grid gap-3 border-b border-black/10 p-4 ${listKind === 'course' ? 'lg:grid-cols-[minmax(220px,1fr)_170px_120px_120px_140px_auto]' : 'lg:grid-cols-[minmax(220px,1fr)_160px_auto]'}`}>
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={listKind === 'course' ? '搜尋姓名、信箱或後五碼' : '搜尋顧客、訂單編號或商品'} className="apple-input pl-10" /></label>
          {listKind === 'course' ? <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="apple-input"><option value="all">全部班級</option>{capacities.map((course) => <option key={course.slug} value={course.slug}>{course.name}</option>)}</select> : null}
          {listKind === 'course' ? <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="apple-input"><option value="all">全部身分</option><option value="new">新生</option><option value="returning">舊生</option></select> : null}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="apple-input"><option value="all">全部狀態</option>{Object.entries(listKind === 'course' ? courseStatusLabels : shopStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          {listKind === 'course' ? <select value={attendanceFilter} onChange={(event) => setAttendanceFilter(event.target.value as typeof attendanceFilter)} className="apple-input"><option value="all">全部點名核對</option><option value="open">計費異常待處理</option></select> : null}
          <button type="button" onClick={exportRoster} disabled={!filtered.length} className="apple-button-outline gap-2 px-4 py-2.5 text-sm disabled:opacity-40"><Download className="h-4 w-4" />匯出</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-apple-gray-100 text-xs text-apple-gray-600"><tr>{[listKind === 'course' ? '學員' : '顧客', listKind === 'course' ? '班級' : '訂單 / 商品', listKind === 'course' ? '身分' : '類型', '金額', listKind === 'course' ? '後五碼' : '取貨方式', '狀態', '提交時間', ''].map((label) => <th key={label || 'action'} className="px-3 py-2.5 font-bold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-black/5">{visible.map((order) => <tr key={order.id} className="hover:bg-apple-gray-50"><td className="px-3 py-2.5"><p className="font-bold">{order.studentName}</p><p className="max-w-52 truncate text-xs text-apple-gray-500">{order.email}</p></td><td className="max-w-64 px-3 py-2.5 font-semibold text-apple-gray-700">{order.orderKind === 'shop' ? <><p className="truncate">{order.orderNumber}</p><p className="mt-1 truncate text-xs font-medium text-apple-gray-500">{order.items.join('、') || '未載入商品'}</p></> : <p className="truncate">{order.courseName}</p>}</td><td className="px-3 py-2.5">{order.orderKind === 'shop' ? '商城' : studentType(order) === 'new' ? '新生' : studentType(order) === 'returning' ? '舊生' : '-'}</td><td className="px-3 py-2.5 font-semibold">{order.amountText}</td><td className="px-3 py-2.5 font-mono">{order.orderKind === 'shop' ? '跑班自取' : order.transferLastFive || '-'}</td><td className="px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone[order.status]}`}>{statusLabel(order)}</span>{order.openAttendanceAnomalyCount > 0 ? <span className="mt-1 block w-fit rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">計費異常 {order.openAttendanceAnomalyCount}</span> : null}</td><td className="whitespace-nowrap px-3 py-2.5 text-xs text-apple-gray-500">{formatDate(order.submittedAt)}</td><td className="px-3 py-2.5 text-right"><button type="button" onClick={() => setSelected(order)} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black hover:text-white" aria-label={`查看 ${order.studentName} 的${order.orderKind === 'shop' ? '訂單' : '報名資料'}`}><ChevronRight className="h-4 w-4" /></button></td></tr>)}</tbody>
          </table>
        </div>
        {!filtered.length ? <p className="p-10 text-center text-sm font-semibold text-apple-gray-500">沒有符合條件的{listKind === 'course' ? '學員' : '商城訂單'}。</p> : null}
        <div className="flex flex-col gap-3 border-t border-black/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="font-semibold text-apple-gray-500">共 {filtered.length} 筆，第 {page} / {pageCount} 頁</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex h-9 items-center gap-1 rounded-full border px-3 font-bold disabled:opacity-30"><ChevronLeft className="h-4 w-4" />上一頁</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="inline-flex h-9 items-center gap-1 rounded-full border px-3 font-bold disabled:opacity-30">下一頁<ChevronRight className="h-4 w-4" /></button></div></div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-[90] bg-black/35" role="dialog" aria-modal="true" aria-label={selected.orderKind === 'shop' ? '商城訂單詳情' : '學員報名詳情'} onClick={() => setSelected(null)}>
          <aside className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b p-5">
              <div><p className="text-xs font-bold text-apple-gray-500">{selected.orderKind === 'shop' ? `商城訂單 ${selected.orderNumber}` : selected.seasonName}</p><h3 className="mt-1 text-2xl font-black">{selected.studentName}</h3><p className="mt-1 text-sm text-apple-gray-600">{selected.email}</p></div>
              <button type="button" onClick={() => setSelected(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border" aria-label="關閉"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">{selectedSummary.map(([label, value]) => <div key={label} className="rounded-lg bg-apple-gray-100 p-3"><p className="text-xs font-bold text-apple-gray-500">{label}</p><p className="mt-1 break-words text-sm font-bold">{value || '-'}</p></div>)}</div>
              <dl className="mt-5 divide-y border-y">{selected.registrationDetails.filter((item) => item.label !== '學員身分').map((item) => <div key={item.label} className="py-3"><dt className="text-xs font-bold text-apple-gray-500">{item.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6">{item.value}</dd></div>)}{selected.notes ? <div className="py-3"><dt className="text-xs font-bold text-apple-gray-500">客戶備註</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-semibold">{selected.notes}</dd></div> : null}</dl>
              {selected.orderKind === 'course' && selected.attendanceAnomalies.length ? (
                <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h4 className="flex items-center gap-2 font-black text-amber-950"><AlertTriangle className="h-4 w-4" />點名與計費起點核對</h4>
                  <div className="mt-3 space-y-3">
                    {selected.attendanceAnomalies.map((anomaly) => (
                      <article key={anomaly.attendanceId} className="rounded-md bg-white p-3 ring-1 ring-amber-200">
                        <p className="text-sm font-black text-amber-950">{anomaly.sessionDate} 已到課，早於計費起點 {anomaly.billingStartSessionDate}</p>
                        {anomaly.status === 'resolved' ? (
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-bold text-emerald-700">已處理：{anomaly.outcome === 'supplement_paid' ? '補繳完成' : '免除補繳'}{anomaly.resolutionNote ? `｜${anomaly.resolutionNote}` : ''}</p><button type="button" disabled={updatingId === `attendance-${anomaly.attendanceId}`} onClick={() => resolveAttendance(anomaly, 'reopen')} className="text-left text-xs font-bold underline disabled:opacity-40">重新開啟</button></div>
                        ) : (
                          <div className="mt-3">
                            <input value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} className="apple-input min-h-10 text-sm" maxLength={1000} placeholder="處理備註（選填）" />
                            <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" disabled={updatingId === `attendance-${anomaly.attendanceId}`} onClick={() => resolveAttendance(anomaly, 'supplement_paid')} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">已補繳</button><button type="button" disabled={updatingId === `attendance-${anomaly.attendanceId}`} onClick={() => resolveAttendance(anomaly, 'waived')} className="rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900 disabled:opacity-40">免除補繳</button></div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
              <label className="mt-5 block"><span className="mb-2 block text-xs font-bold text-apple-gray-500">管理備註</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="apple-input min-h-24 resize-y" placeholder={selected.orderKind === 'shop' ? '記錄自取時間、地點或聯絡結果' : '記錄核對結果或需要補充的資料'} /></label>
            </div>
            <div className="grid gap-2 border-t bg-white p-4 sm:grid-cols-2">
              <p className={`rounded-lg px-3 py-2 text-xs font-bold leading-5 sm:col-span-2 ${selected.orderKind === 'shop' ? 'bg-apple-gray-100 text-apple-gray-700' : 'bg-blue-50 text-blue-800'}`}>{selected.orderKind === 'shop' ? '商城僅提供跑班自取，不使用線上付款或銀行匯款。' : '「已確認入帳」只能由銀行對帳完成；這裡保留異常處理與刪除，避免繞過財務確認。'}</p>
              {selected.orderKind === 'shop' ? <button type="button" disabled={updatingId === selected.id || selected.status === 'rejected' || selected.status === 'approved'} onClick={confirmShopPickup} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><Package className="h-4 w-4" />確認跑班自取</button> : null}
              <button type="button" disabled={updatingId === selected.id || selected.status === 'rejected' || selected.status === 'approved'} onClick={flagOrderForReview} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-40"><RotateCcw className="h-4 w-4" />{selected.orderKind === 'shop' ? '標記需聯絡顧客' : '標記匯款資料需補充'}</button>
              <button type="button" disabled={updatingId === `delete-${selected.id}` || selected.status === 'approved'} onClick={deleteOrder} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-40">{updatingId === `delete-${selected.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}刪除記錄</button>
            </div>
          </aside>
        </div>
      ) : null}

      {syncScript || syncScriptError ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Google 表格同步設定" onClick={() => { setSyncScript(''); setSyncScriptError('') }}>
          <section className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b p-5">
              <div><p className="text-xs font-bold text-apple-blue">季度名單</p><h3 className="mt-1 text-xl font-black">Google 表格自動同步</h3></div>
              <button type="button" onClick={() => { setSyncScript(''); setSyncScriptError('') }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border" aria-label="關閉"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5">
              {syncScriptError ? <p className="rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">{syncScriptError}</p> : (
                <>
                  <ol className="grid gap-2 text-sm font-semibold leading-6 text-apple-gray-700 sm:grid-cols-3">
                    <li className="rounded-lg bg-apple-gray-100 p-3"><span className="mr-2 font-black">1</span>在 Q3 表格開啟「擴充功能 → Apps Script」</li>
                    <li className="rounded-lg bg-apple-gray-100 p-3"><span className="mr-2 font-black">2</span>貼上以下程式並儲存</li>
                    <li className="rounded-lg bg-apple-gray-100 p-3"><span className="mr-2 font-black">3</span>執行 setupGoodLuckRosterSync 並授權一次</li>
                  </ol>
                  <textarea readOnly value={syncScript} className="mt-4 min-h-[360px] w-full resize-y rounded-lg border border-black/10 bg-apple-gray-950 p-4 font-mono text-xs leading-5 text-white" aria-label="Google 表格同步程式" />
                  <button type="button" onClick={() => navigator.clipboard.writeText(syncScript)} className="apple-button-primary mt-3 w-full gap-2 py-3"><Copy className="h-4 w-4" />複製同步程式</button>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
