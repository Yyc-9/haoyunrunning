'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Landmark,
  KeyRound,
  PanelsTopLeft,
  UserCog,
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { SiteContent } from '@/lib/site-content'
import AdminContentManager from '@/components/admin/AdminContentManager'
import AdminProductCreator from '@/components/admin/AdminProductCreator'
import AdminProductEditor, { type AdminEditableProduct } from '@/components/admin/AdminProductEditor'

type PaymentOrderStatus = 'pending_transfer' | 'pending_review' | 'approved' | 'rejected'

type AdminTab = 'overview' | 'students' | 'coaches' | 'orders' | 'products' | 'content' | 'paymentAccounts'

type AdminDashboardPayload = {
  admin: { id: string; email: string; name: string; role: string }
 overview: {
    studentCount: number
    coachCount: number
    pendingOrderCount: number
    approvedOrderCount: number
    unopenedPlanCount: number
    recentFeedbackCount: number
    productCount: number
    lowStockCount: number
    paymentAccountCount: number
  }
  students: AdminStudent[]
  coaches: AdminCoach[]
  orders: AdminOrder[]
  products: AdminProduct[]
  paymentAccounts: PaymentAccount[]
  siteContent: SiteContent
  courses: AdminCourseSummary[]
  coachOptions: Array<{ id: string; name: string; email: string }>
  coachInvites: CoachInvite[]
}

type CoachInvite = {
  id: string
  code: string
  usedBy: string
  usedAt: string | null
  expiresAt: string | null
  createdAt: string
}

type AdminCourseSummary = {
  slug: string
  name: string
  weekday: string
  location: string
  period: string
  classTime: string
  meetingPoint: string
  feeNote: string
  targetAudience: string
  focus: string
  signupUrl: string
}

type AdminStudent = {
  id: string
  name: string
  email: string
  program: string
  paymentStatus: string
  paymentCourse: string
  planEnabled: boolean
  lastFeedbackAt: string | null
  createdAt: string
  bindings: Array<{ id: string; coachId: string; coachName: string; coachEmail: string }>
  boundCoachNames: string
}

type AdminCoach = {
  id: string
  name: string
  email: string
  role: 'student' | 'coach' | 'admin'
  coachEnabled: boolean
  boundStudentCount: number
  courses: string
  createdAt: string
}

type AdminOrder = {
  id: string
  orderKind: 'course' | 'shop'
  orderNumber: string
  studentName: string
  email: string
  courseName: string
  amountText: string
  transferLastFive: string
  status: PaymentOrderStatus
  submittedAt: string
  notes: string
  reviewNote: string | null
  paymentReference: string
  paymentChannelLabel: string
  assignedAccount: string
  inventoryReserved: boolean
  items: string[]
}

type AdminProduct = AdminEditableProduct

type PaymentAccount = {
  id: string
  label: string
  account_name: string
  bank_name: string
  bank_code: string
  account_number: string
  active: boolean
  weight: number
  last_assigned_at: string | null
  created_at: string
}

const statusLabels: Record<PaymentOrderStatus, string> = {
  pending_transfer: '待匯款 / 待填寫後五碼',
  pending_review: '已提交後五碼，待人工核對',
  approved: '已核准 / 已完成',
  rejected: '核對未透過或需補充資料',
}

const statusTone: Record<PaymentOrderStatus, string> = {
  pending_transfer: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

const tabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: '總覽', icon: LayoutDashboard },
  { id: 'students', label: '學員管理', icon: UsersRound },
  { id: 'coaches', label: '教練管理', icon: UserCog },
  { id: 'orders', label: '訂單審核', icon: ClipboardList },
  { id: 'products', label: '商城商品', icon: Boxes },
  { id: 'content', label: '內容中心', icon: PanelsTopLeft },
  { id: 'paymentAccounts', label: '收款帳戶', icon: Landmark },
]

function formatDate(value: string | null | undefined) {
  if (!value) return '暫無資料'

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function csvCell(value: unknown) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

async function getAccessToken() {
  if (!supabase) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

async function fetchAdminDashboard() {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('請先登入管理員帳號。')
  }

  const response = await fetch('/api/admin', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as AdminDashboardPayload & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || '讀取管理員後台失敗。')
  }

  return payload
}

async function adminAction(body: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('請先登入管理員帳號。')
  }

  const response = await fetch('/api/admin', {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
  if (!response.ok) {
    throw new Error(payload.error || '操作失敗。')
  }

  return payload.message || '操作已完成。'
}

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [data, setData] = useState<AdminDashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [selectedCoachByStudent, setSelectedCoachByStudent] = useState<Record<string, string>>({})
  const [studentQuery, setStudentQuery] = useState('')
  const [coachQuery, setCoachQuery] = useState('')
  const [orderQuery, setOrderQuery] = useState('')
  const [studentPlanFilter, setStudentPlanFilter] = useState<'all' | 'enabled' | 'missing'>('all')
  const [coachRoleFilter, setCoachRoleFilter] = useState<'all' | 'coach' | 'student' | 'admin'>('all')
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | PaymentOrderStatus>('all')
  const [orderReviewNotes, setOrderReviewNotes] = useState<Record<string, string>>({})
  const [accountForm, setAccountForm] = useState({
    label: '',
    accountName: '',
    bankName: '',
    bankCode: '',
    accountNumber: '',
    weight: '1',
  })

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setData(await fetchAdminDashboard())
    } catch (loadError) {
      setData(null)
      setError(loadError instanceof Error ? loadError.message : '讀取管理員後台失敗。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const pendingOrders = useMemo(
    () => data?.orders.filter((order) => order.status === 'pending_review') ?? [],
    [data]
  )
  const filteredStudents = useMemo(() => {
    const text = studentQuery.trim().toLowerCase()

    return (data?.students ?? []).filter((student) => {
      if (studentPlanFilter === 'enabled' && !student.planEnabled) return false
      if (studentPlanFilter === 'missing' && student.planEnabled) return false
      if (!text) return true

      return [
        student.name,
        student.email,
        student.boundCoachNames,
        student.program,
        student.paymentCourse,
        student.paymentStatus,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    })
  }, [data?.students, studentPlanFilter, studentQuery])
  const filteredCoaches = useMemo(() => {
    const text = coachQuery.trim().toLowerCase()

    return (data?.coaches ?? []).filter((coach) => {
      if (coachRoleFilter !== 'all' && coach.role !== coachRoleFilter) return false
      if (!text) return true

      return [coach.name, coach.email, coach.role, coach.courses]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    })
  }, [coachQuery, coachRoleFilter, data?.coaches])
  const filteredOrders = useMemo(() => {
    const text = orderQuery.trim().toLowerCase()

    return (data?.orders ?? []).filter((order) => {
      if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) return false
      if (!text) return true

      return [
        order.orderKind,
        order.orderNumber,
        order.studentName,
        order.email,
        order.courseName,
        order.amountText,
        order.transferLastFive,
        order.paymentReference,
        order.paymentChannelLabel,
        order.assignedAccount,
        order.items.join(' '),
        order.notes,
        order.reviewNote ?? '',
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    })
  }, [data?.orders, orderQuery, orderStatusFilter])

  function downloadOrders() {
    const headers = ['類型', '訂單編號', '姓名', '信箱', '課程或商城訂單', '金額', '狀態', '商品', '取貨與客戶備註', '管理備註', '付款代號', '付款通道', '分配帳戶', '提交時間']
    const rows = filteredOrders.map((order) => [
      order.orderKind === 'shop' ? '商城' : '課程',
      order.orderNumber,
      order.studentName,
      order.email,
      order.courseName,
      order.amountText,
      statusLabels[order.status],
      order.items.join('、'),
      order.notes,
      orderReviewNotes[order.id] || order.reviewNote || '',
      order.paymentReference,
      order.paymentChannelLabel,
      order.assignedAccount,
      formatDate(order.submittedAt),
    ])
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `好運跑班訂單-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function runAction(id: string, action: Record<string, unknown>) {
    setUpdatingId(id)
    setError('')
    setMessage('')

    try {
      const nextMessage = await adminAction(action)
      setMessage(nextMessage)
      await loadDashboard()
      return true
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '操作失敗。')
      return false
    } finally {
      setUpdatingId('')
    }
  }

  async function createPaymentAccount() {
    const created = await runAction('create-payment-account', {
      action: 'create_payment_account',
      label: accountForm.label,
      accountName: accountForm.accountName,
      bankName: accountForm.bankName,
      bankCode: accountForm.bankCode,
      accountNumber: accountForm.accountNumber,
      weight: Number(accountForm.weight || 1),
    })
    if (created) {
      setAccountForm({
        label: '',
        accountName: '',
        bankName: '',
        bankCode: '',
        accountNumber: '',
        weight: '1',
      })
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <div className="container mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-apple-gray-500" />
          <p className="mt-4 font-semibold text-apple-gray-600">正在讀取管理員後台...</p>
        </div>
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <section className="container mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="apple-card p-8">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <h1 className="mt-4 text-3xl font-black text-apple-gray-900">無法進入管理員後台</h1>
            <p className="mt-3 leading-7 text-apple-gray-600">{error}</p>
            <Link href="/" className="apple-button-primary mt-6 inline-flex px-6 py-3">
              返回首頁
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                超級管理員
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">管理員後台</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                集中管理網站內容、商城商品、課程、活動、訂單與收款資料。
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-apple-gray-500">
                訂單審核與收款帳戶僅限超級管理員；戶名、帳號與分配結果不會顯示在買家端。
              </p>
            </div>

            <button type="button" onClick={loadDashboard} className="apple-button-outline inline-flex items-center justify-center gap-2 px-5 py-3">
              <RefreshCw className="h-4 w-4" />
              重新整理資料
            </button>
          </div>

          <nav aria-label="管理員後台導航" className="mb-8 overflow-x-auto">
            <div className="flex min-w-max gap-2 rounded-3xl bg-white/85 p-2 shadow-sm ring-1 ring-black/10 backdrop-blur">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      active ? 'bg-black text-white' : 'text-apple-gray-600 hover:bg-apple-gray-100 hover:text-apple-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </nav>

          {message ? (
            <div className="mb-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : null}

          {activeTab === 'overview' && data ? (
            <section className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ['待核對訂單', data.overview.pendingOrderCount],
                  ['已核准訂單', data.overview.approvedOrderCount],
                  ['商城商品', data.overview.productCount],
                  ['低庫存商品', data.overview.lowStockCount],
                  ['收款帳戶', data.overview.paymentAccountCount],
                  ['學員總數', data.overview.studentCount],
                ].map(([label, value]) => (
                  <div key={label} className="apple-card p-5">
                    <p className="text-sm text-apple-gray-500">{label}</p>
                    <p className="mt-2 text-3xl font-black text-apple-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="apple-card p-6">
                <div className="mb-5 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-black text-apple-gray-900">待核對訂單</h2>
                </div>
                {pendingOrders.length === 0 ? (
                  <p className="text-sm text-apple-gray-600">暫無待核對訂單。</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {pendingOrders.slice(0, 4).map((order) => (
                      <div key={order.id} className="rounded-2xl bg-apple-gray-100 p-4">
                        <p className="font-bold text-apple-gray-900">{order.studentName}</p>
                        <p className="mt-1 text-sm text-apple-gray-600">
                          {order.orderKind === 'shop' ? order.orderNumber : order.courseName || '未填寫課程'} · 後五碼 {order.transferLastFive || '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === 'students' && data ? (
            <section className="apple-card overflow-hidden">
              <div className="border-b border-black/10 p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <h2 className="text-xl font-black text-apple-gray-900">學員管理</h2>
                    <p className="mt-1 text-sm text-apple-gray-600">顯示所有學員、綁定教練、付款狀態、課表狀態與最近訓練回饋。</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_160px] lg:w-[520px]">
                    <input
                      value={studentQuery}
                      onChange={(event) => setStudentQuery(event.target.value)}
                      placeholder="搜尋姓名、信箱、教練或課程"
                      className="apple-input"
                    />
                    <select
                      value={studentPlanFilter}
                      onChange={(event) => setStudentPlanFilter(event.target.value as typeof studentPlanFilter)}
                      className="apple-input"
                    >
                      <option value="all">全部課表</option>
                      <option value="enabled">已開通</option>
                      <option value="missing">未開通</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-apple-gray-100 text-apple-gray-600">
                    <tr>
                      {['姓名', '信箱', '綁定教練', '報名課程', '付款狀態', '課表', '最近回饋', '建立時間', '綁定操作'].map((header) => (
                        <th key={header} className="px-4 py-3 font-bold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-4 font-bold text-apple-gray-900">{student.name}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{student.email || '-'}</td>
                        <td className="px-4 py-4 text-apple-gray-700">{student.boundCoachNames || '尚未綁定'}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{student.program || student.paymentCourse || '-'}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                            {statusLabels[student.paymentStatus as PaymentOrderStatus] || student.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${student.planEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {student.planEnabled ? '已開通' : '未開通'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-apple-gray-600">{formatDate(student.lastFeedbackAt)}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{formatDate(student.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-[260px] gap-2">
                            <select
                              value={selectedCoachByStudent[student.id] ?? ''}
                              onChange={(event) => setSelectedCoachByStudent((current) => ({ ...current, [student.id]: event.target.value }))}
                              className="apple-input py-2 text-xs"
                            >
                              <option value="">選擇教練</option>
                              {data.coachOptions.map((coach) => (
                                <option key={coach.id} value={coach.id}>{coach.name || coach.email}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!selectedCoachByStudent[student.id] || updatingId === `bind-${student.id}`}
                              onClick={() => runAction(`bind-${student.id}`, { action: 'bind_student', studentId: student.id, coachId: selectedCoachByStudent[student.id] })}
                              className="rounded-full bg-black px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              綁定
                            </button>
                            {student.bindings[0] ? (
                              <button
                                type="button"
                                disabled={updatingId === `unbind-${student.bindings[0].id}`}
                                onClick={() => runAction(`unbind-${student.bindings[0].id}`, { action: 'unbind_student', bindingId: student.bindings[0].id })}
                                className="rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                解綁
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-sm font-semibold text-apple-gray-500">
                  沒有符合條件的學員。
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'coaches' && data ? (
            <section className="apple-card overflow-hidden">
              <div className="border-b border-black/10 bg-apple-gray-100 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-apple-gray-700" />
                      <h2 className="text-lg font-black text-apple-gray-900">教練認證碼</h2>
                    </div>
                    <p className="mt-1 text-sm text-apple-gray-600">認證碼限用一次，有效期 30 天；使用者登入後輸入即可升級為教練。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => runAction('create-coach-invite', { action: 'create_coach_invite' })}
                    disabled={updatingId === 'create-coach-invite'}
                    className="apple-button-primary gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingId === 'create-coach-invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    生成認證碼
                  </button>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {data.coachInvites.slice(0, 6).map((invite) => {
                    const expired = Boolean(invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now())
                    const status = invite.usedAt ? `已由 ${invite.usedBy || '教練帳號'} 使用` : expired ? '已過期' : '可使用'
                    return (
                      <div key={invite.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-bold text-apple-gray-900">{invite.code}</p>
                          <p className={`mt-1 text-xs font-semibold ${invite.usedAt || expired ? 'text-apple-gray-500' : 'text-emerald-700'}`}>{status}</p>
                        </div>
                        {!invite.usedAt && !expired ? (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(invite.code)}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-apple-gray-700 hover:bg-apple-gray-100"
                            aria-label="複製認證碼"
                            title="複製認證碼"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                  {data.coachInvites.length === 0 ? (
                    <p className="text-sm text-apple-gray-500">目前尚未生成認證碼。</p>
                  ) : null}
                </div>
              </div>
              <div className="border-b border-black/10 p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <h2 className="text-xl font-black text-apple-gray-900">教練管理</h2>
                    <p className="mt-1 text-sm text-apple-gray-600">管理員可以授予或取消教練權限；admin 角色不會在這裡被降級。</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_150px] lg:w-[500px]">
                    <input
                      value={coachQuery}
                      onChange={(event) => setCoachQuery(event.target.value)}
                      placeholder="搜尋姓名、信箱或課程"
                      className="apple-input"
                    />
                    <select
                      value={coachRoleFilter}
                      onChange={(event) => setCoachRoleFilter(event.target.value as typeof coachRoleFilter)}
                      className="apple-input"
                    >
                      <option value="all">全部角色</option>
                      <option value="coach">教練</option>
                      <option value="student">普通學員</option>
                      <option value="admin">管理員</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="bg-apple-gray-100 text-apple-gray-600">
                    <tr>
                      {['姓名', '信箱', '權限狀態', '綁定學員數', '負責課程', '建立時間', '操作'].map((header) => (
                        <th key={header} className="px-4 py-3 font-bold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {filteredCoaches.map((coach) => (
                      <tr key={coach.id}>
                        <td className="px-4 py-4 font-bold text-apple-gray-900">{coach.name}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{coach.email || '-'}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${coach.coachEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-apple-gray-100 text-apple-gray-600'}`}>
                            {coach.role === 'admin' ? '管理員' : coach.coachEnabled ? '教練已啟用' : '未啟用'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-apple-gray-700">{coach.boundStudentCount}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{coach.courses || '暫無資料'}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{formatDate(coach.createdAt)}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={coach.role === 'admin' || updatingId === coach.id}
                            onClick={() => runAction(coach.id, { action: 'set_coach_role', userId: coach.id, enabled: !coach.coachEnabled })}
                            className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {coach.coachEnabled ? '取消教練權限' : '授予教練權限'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredCoaches.length === 0 ? (
                <div className="p-8 text-center text-sm font-semibold text-apple-gray-500">
                  沒有符合條件的帳號。
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'orders' && data ? (
            <section className="grid gap-4">
              <div className="apple-card p-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
	                  <input
	                    value={orderQuery}
	                    onChange={(event) => setOrderQuery(event.target.value)}
	                    placeholder="搜尋姓名、信箱、訂單編號、後五碼、付款通道或商品"
	                    className="apple-input"
	                  />
                  <select
                    value={orderStatusFilter}
                    onChange={(event) => setOrderStatusFilter(event.target.value as typeof orderStatusFilter)}
                    className="apple-input"
                  >
                    <option value="all">全部狀態</option>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={downloadOrders} disabled={filteredOrders.length === 0} className="apple-button-outline gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40">
                    <Download className="h-4 w-4" />
                    匯出目前結果
                  </button>
                </div>
              </div>
	              {data.orders.length === 0 ? (
	                <div className="apple-card p-10 text-center text-apple-gray-600">暫無訂單。</div>
              ) : filteredOrders.length === 0 ? (
                <div className="apple-card p-10 text-center text-apple-gray-600">沒有符合條件的訂單。</div>
              ) : filteredOrders.map((order) => (
                <article key={order.id} className="apple-card p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
	                      <div className="mb-3 flex flex-wrap items-center gap-2">
	                        <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
	                          {order.orderKind === 'shop' ? '商城' : '課程'}
	                        </span>
	                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[order.status]}`}>
	                          {statusLabels[order.status]}
	                        </span>
	                        {order.inventoryReserved ? (
	                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">庫存已保留</span>
	                        ) : null}
	                        <span className="text-xs font-semibold text-apple-gray-500">{formatDate(order.submittedAt)}</span>
	                      </div>
	                      <h2 className="text-2xl font-black text-apple-gray-900">{order.studentName}</h2>
	                      <p className="mt-2 text-sm text-apple-gray-600">{order.email || '未填寫信箱'}</p>
	                      {order.orderNumber ? <p className="mt-1 text-sm font-semibold text-apple-gray-500">{order.orderNumber}</p> : null}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        disabled={updatingId === order.id || order.status === 'approved'}
	                        onClick={() => runAction(order.id, { action: 'review_order', orderId: order.id, orderKind: order.orderKind, status: 'approved', reviewNote: orderReviewNotes[order.id] || order.reviewNote || '' })}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        核准透過
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === order.id || order.status === 'rejected'}
	                        onClick={() => runAction(order.id, { action: 'review_order', orderId: order.id, orderKind: order.orderKind, status: 'rejected', reviewNote: orderReviewNotes[order.id] || order.reviewNote || '' })}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        標記異常
                      </button>
                    </div>
                  </div>
	                  <div className="mt-5 grid gap-3 md:grid-cols-3">
	                    {[
	                      [order.orderKind === 'shop' ? '商城訂單' : '報名課程', order.courseName],
	                      ['應付金額', order.amountText],
	                      ['後五碼（人工對帳參考）', order.transferLastFive],
	                      ['付款代號', order.paymentReference],
	                      ['付款通道', order.paymentChannelLabel || '-'],
	                      ['分配帳戶（僅後台）', order.assignedAccount || '-'],
	                    ].map(([label, value]) => (
	                      <div key={label} className="rounded-2xl bg-apple-gray-100 p-4">
	                        <p className="text-xs font-semibold text-apple-gray-500">{label}</p>
	                        <p className="mt-2 break-words text-sm font-bold text-apple-gray-900">{value || '-'}</p>
	                      </div>
	                    ))}
	                  </div>
	                  {order.items.length > 0 || order.notes || order.reviewNote ? (
	                    <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-black/10">
	                      {order.items.length > 0 ? (
	                        <p className="text-sm leading-6 text-apple-gray-700">商品：{order.items.join('、')}</p>
	                      ) : null}
	                      <p className="mt-1 text-sm leading-6 text-apple-gray-600">備註：{order.notes || order.reviewNote || '暫無備註'}</p>
	                    </div>
	                  ) : null}
	                  <label className="mt-3 block">
	                    <span className="mb-2 block text-xs font-bold text-apple-gray-500">管理備註</span>
	                    <textarea
	                      value={orderReviewNotes[order.id] ?? order.reviewNote ?? ''}
	                      onChange={(event) => setOrderReviewNotes((current) => ({ ...current, [order.id]: event.target.value }))}
	                      className="apple-input min-h-20 resize-y"
	                      placeholder="記錄核對結果、聯絡狀況或後續處理"
	                    />
	                  </label>
	                </article>
              ))}
	            </section>
	          ) : null}

	          {activeTab === 'products' && data ? (
	            <section className="space-y-5">
	              <AdminProductCreator runAction={runAction} />
	              <div className="px-1">
	                <h2 className="text-xl font-black text-apple-gray-900">商品資料與庫存</h2>
	                <p className="mt-1 text-sm text-apple-gray-600">直接修改商品內容、圖片、影片、款式、售價、庫存與上架狀態。</p>
	              </div>
	              {data.products.length === 0 ? (
	                <div className="apple-card p-10 text-center text-sm font-semibold text-apple-gray-500">目前沒有商品，請使用上方表單建立第一件商品。</div>
	              ) : data.products.map((product) => (
	                <AdminProductEditor key={product.id} product={product} runAction={runAction} />
	              ))}
	            </section>
	          ) : null}

              {activeTab === 'content' && data ? (
                <AdminContentManager content={data.siteContent} courses={data.courses} runAction={runAction} />
              ) : null}

	          {activeTab === 'paymentAccounts' && data ? (
	            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
	              <div className="apple-card p-5">
	                <h2 className="text-xl font-black text-apple-gray-900">新增收款帳戶</h2>
	                <p className="mt-1 text-sm leading-6 text-apple-gray-600">這些資料只在管理員後台顯示，不會把戶名、帳號或分配結果提供給買家。</p>
	                <div className="mt-5 grid gap-3">
	                  {[
	                    ['label', '通道名稱，例如 A 帳戶'],
	                    ['accountName', '戶名'],
	                    ['bankName', '銀行名稱'],
	                    ['bankCode', '銀行代碼，可留空'],
	                    ['accountNumber', '收款帳號'],
	                    ['weight', '分配權重'],
	                  ].map(([field, placeholder]) => (
	                    <input
	                      key={field}
	                      value={accountForm[field as keyof typeof accountForm]}
	                      onChange={(event) => setAccountForm((current) => ({ ...current, [field]: field === 'weight' ? event.target.value.replace(/\D/g, '') : event.target.value }))}
	                      placeholder={placeholder}
	                      inputMode={field === 'weight' ? 'numeric' : undefined}
	                      className="apple-input"
	                    />
	                  ))}
	                </div>
	                <button
	                  type="button"
	                  onClick={createPaymentAccount}
	                  disabled={updatingId === 'create-payment-account'}
	                  className="apple-button-primary mt-4 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
	                >
	                  <CreditCard className="h-4 w-4" />
	                  新增帳戶
	                </button>
	              </div>

	              <div className="apple-card overflow-hidden">
	                <div className="border-b border-black/10 p-5">
	                  <h2 className="text-xl font-black text-apple-gray-900">收款帳戶池</h2>
	                  <p className="mt-1 text-sm text-apple-gray-600">活躍帳戶會被新商城訂單隨機分配。</p>
	                </div>
	                {data.paymentAccounts.length === 0 ? (
	                  <div className="p-10 text-center text-sm font-semibold text-apple-gray-500">
	                    還沒有收款帳戶。
	                  </div>
	                ) : (
	                  <div className="divide-y divide-black/10">
	                    {data.paymentAccounts.map((account) => (
	                      <article key={account.id} className="p-5">
	                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
	                          <div>
	                            <div className="mb-2 flex flex-wrap items-center gap-2">
	                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${account.active ? 'bg-emerald-50 text-emerald-700' : 'bg-apple-gray-100 text-apple-gray-500'}`}>
	                                {account.active ? '啟用中' : '已停用'}
	                              </span>
	                              <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-600">權重 {account.weight}</span>
	                            </div>
	                            <h3 className="text-lg font-black text-apple-gray-900">{account.label}</h3>
	                            <p className="mt-2 text-sm leading-6 text-apple-gray-600">
	                              {account.bank_name}{account.bank_code ? ` (${account.bank_code})` : ''} · {account.account_name}
	                            </p>
	                            <p className="mt-1 break-all text-sm font-bold text-apple-gray-900">{account.account_number}</p>
	                            <p className="mt-1 text-xs text-apple-gray-500">最近分配：{formatDate(account.last_assigned_at)}</p>
	                          </div>
	                          <button
	                            type="button"
	                            disabled={updatingId === `account-${account.id}`}
	                            onClick={() => runAction(`account-${account.id}`, { action: 'toggle_payment_account', accountId: account.id, active: !account.active })}
	                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-apple-gray-800 transition hover:bg-apple-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
	                          >
	                            {account.active ? '停用' : '啟用'}
	                          </button>
	                        </div>
	                      </article>
	                    ))}
	                  </div>
	                )}
	              </div>
	            </section>
	          ) : null}

        </div>
      </section>
    </main>
  )
}
