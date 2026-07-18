'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarRange,
  CheckCircle2,
  Copy,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Landmark,
  KeyRound,
  PanelsTopLeft,
  UserCog,
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CourseSeason } from '@/lib/course-seasons'
import type { CourseBillingConfig } from '@/lib/course-pricing'
import type { CourseOverride, SiteContent } from '@/lib/site-content'
import AdminContentManager from '@/components/admin/AdminContentManager'
import AdminEnrollmentAnalytics from '@/components/admin/AdminEnrollmentAnalytics'
import AdminProductCreator from '@/components/admin/AdminProductCreator'
import AdminProductEditor, { type AdminEditableProduct } from '@/components/admin/AdminProductEditor'
import AdminBankReconciliation from '@/components/admin/AdminBankReconciliation'
import { announceSiteContentUpdated } from '@/lib/site-content-sync'

type PaymentOrderStatus = 'pending_transfer' | 'pending_review' | 'approved' | 'rejected'

type AdminTab = 'overview' | 'students' | 'coaches' | 'seasons' | 'products' | 'content' | 'reconciliation' | 'paymentAccounts'

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
    openAttendanceAnomalyCount?: number
  }
  students: AdminStudent[]
  coaches: AdminCoach[]
  orders: AdminOrder[]
  courseCapacity: CourseCapacityRow[]
  courseSeasons: CourseSeason[]
  seasonSyncSources: CourseSeasonSyncSource[]
  products: AdminProduct[]
  paymentAccounts: PaymentAccount[]
  siteContent: SiteContent
  courses: AdminCourseSummary[]
  coachOptions: Array<{ id: string; name: string; email: string }>
  coachInvites: CoachInvite[]
  coachPublicProfiles: Array<{ coachKey: string; displayName: string; ownerProfileId: string | null }>
}

type CoachInvite = {
  id: string
  code: string
  coachKey: string
  coachName: string
  usedBy: string
  usedAt: string | null
  expiresAt: string | null
  createdAt: string
}

type CourseCapacityRow = {
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

export type CourseSeasonSyncSource = {
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
  coachKeys: string[]
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
  role: 'coach' | 'admin'
  coachEnabled: boolean
  boundStudentCount: number
  courses: string
  publicCoachKey: string
  publicProfileName: string
  createdAt: string
}

type AdminOrder = {
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
  status: PaymentOrderStatus
  submittedAt: string
  notes: string
  reviewNote: string | null
  paymentReference: string
  paymentChannelLabel: string
  assignedAccount: string
  inventoryReserved: boolean
  items: string[]
  registrationDetails: Array<{ label: string; value: string }>
  attendanceAnomalies: Array<{
    attendanceId: string
    sessionDate: string
    billingStartSessionDate: string
    status: 'open' | 'resolved'
    outcome: '' | 'supplement_paid' | 'waived'
    resolutionNote: string
    resolvedAt: string | null
    markedAt: string
  }>
  openAttendanceAnomalyCount: number
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
  pending_transfer: '待付款',
  pending_review: '待對帳',
  approved: '已確認',
  rejected: '需處理',
}

const tabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: '總覽', icon: LayoutDashboard },
  { id: 'students', label: '學員管理', icon: UsersRound },
  { id: 'coaches', label: '教練管理', icon: UserCog },
  { id: 'seasons', label: '季度管理', icon: CalendarRange },
  { id: 'products', label: '商城商品', icon: Boxes },
  { id: 'content', label: '內容中心', icon: PanelsTopLeft },
  { id: 'reconciliation', label: '銀行對帳', icon: FileSpreadsheet },
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

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    message?: string
    siteContent?: SiteContent
    courses?: AdminCourseSummary[]
    seasonCourse?: { season_id: string; course_slug: string; course_data: CourseOverride; capacity: number; billing_config: CourseBillingConfig }
  }
  if (!response.ok) {
    throw new Error(payload.error || '操作失敗。')
  }

  return payload
}

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [data, setData] = useState<AdminDashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [seasonView, setSeasonView] = useState<'settings' | 'students'>('students')
  const [selectedCoachByStudent, setSelectedCoachByStudent] = useState<Record<string, string>>({})
  const [studentQuery, setStudentQuery] = useState('')
  const [coachQuery, setCoachQuery] = useState('')
  const [selectedCoachInviteKey, setSelectedCoachInviteKey] = useState('')
  const [studentPlanFilter, setStudentPlanFilter] = useState<'all' | 'enabled' | 'missing'>('all')
  const [coachRoleFilter, setCoachRoleFilter] = useState<'all' | 'coach' | 'admin'>('all')
  const [accountForm, setAccountForm] = useState({
    label: '',
    accountName: '',
    bankName: '',
    bankCode: '',
    accountNumber: '',
    weight: '1',
  })

  const loadDashboard = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      setData(await fetchAdminDashboard())
    } catch (loadError) {
      if (!background) setData(null)
      else setMessage('')
      setError(loadError instanceof Error ? loadError.message : '讀取管理員後台失敗。')
    } finally {
      if (background) setIsRefreshing(false)
      else setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (!message && !(error && data)) return
    const timer = window.setTimeout(() => {
      setMessage('')
      if (data) setError('')
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [data, error, message])

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

      return [coach.name, coach.email, coach.role, coach.courses, coach.publicProfileName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    })
  }, [coachQuery, coachRoleFilter, data?.coaches])
  const availableCoachInviteProfiles = useMemo(() => {
    const invitesByCoachKey = new Map((data?.coachInvites ?? []).map((invite) => [invite.coachKey, invite]))
    const now = Date.now()

    return (data?.coachPublicProfiles ?? []).filter((profile) => {
      if (profile.ownerProfileId) return false
      const invite = invitesByCoachKey.get(profile.coachKey)
      return !invite || Boolean(invite.expiresAt && new Date(invite.expiresAt).getTime() <= now)
    })
  }, [data?.coachInvites, data?.coachPublicProfiles])
  async function runAction(id: string, action: Record<string, unknown>) {
    setUpdatingId(id)
    setError('')
    setMessage('')

    try {
      const result = await adminAction(action)
      setMessage(result.message || '操作已完成。')
      if (action.action === 'save_site_content' && result.siteContent && result.courses) {
        setData((current) => current ? {
          ...current,
          siteContent: result.siteContent!,
          courses: result.courses!,
        } : current)
        announceSiteContentUpdated(result.siteContent)
      } else if (action.action === 'save_season_course' && result.seasonCourse) {
        const saved = result.seasonCourse
        setData((current) => current ? {
          ...current,
          courseSeasons: current.courseSeasons.map((season) => season.id === saved.season_id ? {
            ...season,
            courseOverrides: { ...season.courseOverrides, [saved.course_slug]: saved.course_data },
            courseCapacities: { ...season.courseCapacities, [saved.course_slug]: saved.capacity },
            courseBillingConfigs: { ...season.courseBillingConfigs, [saved.course_slug]: saved.billing_config },
          } : season),
        } : current)
        announceSiteContentUpdated()
      } else {
        await loadDashboard(true)
      }
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

  async function createCoachInvite() {
    if (!selectedCoachInviteKey) return
    const created = await runAction('create-coach-invite', {
      action: 'create_coach_invite',
      coachKey: selectedCoachInviteKey,
    })
    if (created) setSelectedCoachInviteKey('')
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
                付款核對已整合至季度學員名單；收款帳戶與分配結果只會顯示在超級管理員後台。
              </p>
            </div>

            <button type="button" disabled={isRefreshing} onClick={() => loadDashboard(true)} className="apple-button-outline inline-flex items-center justify-center gap-2 px-5 py-3 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? '正在同步' : '重新整理資料'}
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
            <div role="status" className="fixed right-4 top-24 z-[70] flex max-w-sm items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg sm:right-6">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {message}
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="fixed right-4 top-24 z-[70] flex max-w-sm items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg sm:right-6">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {activeTab === 'overview' && data ? (
            <section className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ['待對帳訂單', data.overview.pendingOrderCount],
                  ['已確認訂單', data.overview.approvedOrderCount],
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
                  <h2 className="text-xl font-black text-apple-gray-900">待對帳訂單</h2>
                </div>
                {pendingOrders.length === 0 ? (
                  <p className="text-sm text-apple-gray-600">目前沒有待對帳訂單。</p>
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
                      <h2 className="text-lg font-black text-apple-gray-900">專屬教練認證碼</h2>
                    </div>
                    <p className="mt-1 text-sm text-apple-gray-600">每組認證碼只對應一份公開教練資料。使用者登入並完成認證後，教練權限、公開身份與負責課程會一起連結。</p>
                  </div>
                  <div className="grid min-w-0 gap-2 sm:min-w-[360px] sm:grid-cols-[minmax(0,1fr)_auto]">
                    <select
                      value={selectedCoachInviteKey}
                      onChange={(event) => setSelectedCoachInviteKey(event.target.value)}
                      className="apple-input min-w-0 bg-white py-2.5 text-sm"
                      aria-label="選擇公開教練身份"
                    >
                      <option value="">{availableCoachInviteProfiles.length ? '選擇尚未連結的教練' : '目前皆已生成或完成連結'}</option>
                      {availableCoachInviteProfiles.map((profile) => (
                        <option key={profile.coachKey} value={profile.coachKey}>{profile.displayName}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={createCoachInvite}
                      disabled={!selectedCoachInviteKey || updatingId === 'create-coach-invite'}
                      className="apple-button-primary gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingId === 'create-coach-invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      生成專屬碼
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                  {data.coachInvites.map((invite) => {
                    const expired = Boolean(invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now())
                    return (
                      <div key={invite.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-apple-gray-900">{invite.coachName}</p>
                          <p className="mt-1 truncate font-mono text-xs font-bold text-apple-gray-600">{invite.code}</p>
                          <p className={`mt-1 text-xs font-semibold ${expired ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {expired ? '已過期，可重新生成' : `可使用 · 有效至 ${formatDate(invite.expiresAt)}`}
                          </p>
                        </div>
                        {!expired ? (
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
                    <p className="text-sm text-apple-gray-500">目前沒有可使用的專屬認證碼。</p>
                  ) : null}
                </div>
              </div>
              <div className="border-b border-black/10 p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <h2 className="text-xl font-black text-apple-gray-900">教練管理</h2>
                    <p className="mt-1 text-sm text-apple-gray-600">只有成功使用教練認證碼的帳號與超級管理員會顯示在這裡。取消後如需重新啟用，必須使用新的認證碼。</p>
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
                      <option value="admin">管理員</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-apple-gray-100 text-apple-gray-600">
                    <tr>
                      <th className="w-[10%] px-3 py-3 font-bold">姓名</th>
                      <th className="w-[16%] px-3 py-3 font-bold">信箱</th>
                      <th className="w-[12%] px-3 py-3 font-bold">權限狀態</th>
                      <th className="w-[18%] px-3 py-3 font-bold">公開教練身份</th>
                      <th className="w-[8%] px-3 py-3 font-bold">學員數</th>
                      <th className="w-[14%] px-3 py-3 font-bold">負責課程</th>
                      <th className="w-[11%] px-3 py-3 font-bold">建立時間</th>
                      <th className="w-[11%] px-3 py-3 font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {filteredCoaches.map((coach) => (
                      <tr key={coach.id}>
                        <td className="truncate px-3 py-3 font-bold text-apple-gray-900" title={coach.name}>{coach.name}</td>
                        <td className="truncate px-3 py-3 text-apple-gray-600" title={coach.email || undefined}>{coach.email || '-'}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${coach.coachEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-apple-gray-100 text-apple-gray-600'}`}>
                            {coach.role === 'admin' ? '管理員' : coach.coachEnabled ? '教練已啟用' : '未啟用'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={coach.publicCoachKey}
                            disabled={!coach.coachEnabled || updatingId === `coach-profile-${coach.id}`}
                            onChange={(event) => runAction(`coach-profile-${coach.id}`, { action: 'link_coach_public_profile', userId: coach.id, coachKey: event.target.value })}
                            className="apple-input w-full min-w-0 py-2 text-xs disabled:opacity-50"
                            aria-label={`設定 ${coach.name} 的公開教練身份`}
                          >
                            <option value="">尚未連結</option>
                            {data.coachPublicProfiles.map((profile) => <option key={profile.coachKey} value={profile.coachKey}>{profile.displayName}{profile.ownerProfileId && profile.ownerProfileId !== coach.id ? '（已連結其他帳號）' : ''}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-apple-gray-700">{coach.boundStudentCount}</td>
                        <td className="truncate px-3 py-3 text-apple-gray-600" title={coach.courses || undefined}>{coach.courses || '暫無資料'}</td>
                        <td className="px-3 py-3 text-xs text-apple-gray-600">{formatDate(coach.createdAt)}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            disabled={coach.role === 'admin' || updatingId === coach.id}
                            onClick={() => runAction(coach.id, { action: 'set_coach_role', userId: coach.id, enabled: false })}
                            className="w-full rounded-lg bg-black px-2 py-2 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {coach.role === 'admin' ? '保留管理員權限' : '取消教練權限'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-black/10 xl:hidden">
                {filteredCoaches.map((coach) => (
                  <article key={coach.id} className="p-4 sm:p-5">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-apple-gray-900">{coach.name}</h3>
                        <p className="mt-1 truncate text-sm text-apple-gray-500">{coach.email || '未提供信箱'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${coach.coachEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-apple-gray-100 text-apple-gray-600'}`}>
                        {coach.role === 'admin' ? '管理員' : coach.coachEnabled ? '教練已啟用' : '未啟用'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-apple-gray-50 p-3 text-sm">
                      <div>
                        <p className="text-xs font-bold text-apple-gray-400">綁定學員</p>
                        <p className="mt-1 font-black text-apple-gray-900">{coach.boundStudentCount} 位</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-apple-gray-400">建立時間</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-apple-gray-700">{formatDate(coach.createdAt)}</p>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <p className="text-xs font-bold text-apple-gray-400">負責課程</p>
                        <p className="mt-1 break-words font-semibold leading-5 text-apple-gray-700">{coach.courses || '暫無資料'}</p>
                      </div>
                    </div>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-xs font-bold text-apple-gray-500">公開教練身份</span>
                      <select
                        value={coach.publicCoachKey}
                        disabled={!coach.coachEnabled || updatingId === `coach-profile-${coach.id}`}
                        onChange={(event) => runAction(`coach-profile-${coach.id}`, { action: 'link_coach_public_profile', userId: coach.id, coachKey: event.target.value })}
                        className="apple-input w-full min-w-0 py-2.5 text-sm disabled:opacity-50"
                        aria-label={`設定 ${coach.name} 的公開教練身份`}
                      >
                        <option value="">尚未連結</option>
                        {data.coachPublicProfiles.map((profile) => <option key={profile.coachKey} value={profile.coachKey}>{profile.displayName}{profile.ownerProfileId && profile.ownerProfileId !== coach.id ? '（已連結其他帳號）' : ''}</option>)}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={coach.role === 'admin' || updatingId === coach.id}
                      onClick={() => runAction(coach.id, { action: 'set_coach_role', userId: coach.id, enabled: false })}
                      className="mt-3 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {coach.role === 'admin' ? '保留管理員權限' : '取消教練權限'}
                    </button>
                  </article>
                ))}
              </div>
              {filteredCoaches.length === 0 ? (
                <div className="p-8 text-center text-sm font-semibold text-apple-gray-500">
                  目前沒有符合條件的教練帳號。生成認證碼後，使用者完成認證就會加入這份名單。
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'products' && data ? (
	            <section className="space-y-3">
	              <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
	                <div>
	                  <h2 className="text-xl font-black text-apple-gray-900">商城商品管理</h2>
	                  <p className="mt-1 text-sm text-apple-gray-600">商品以精簡清單顯示，需要修改時再展開完整內容。</p>
	                </div>
	                <div className="flex flex-wrap gap-2 text-xs font-bold">
	                  <span className="rounded-full bg-white px-3 py-1.5 text-apple-gray-600 ring-1 ring-black/10">共 {data.products.length} 件</span>
	                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">上架 {data.products.filter((product) => product.active).length}</span>
	                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">低庫存 {data.products.filter((product) => product.stockQuantity <= 5).length}</span>
	                </div>
	              </div>
	              <AdminProductCreator runAction={runAction} />
	              {data.products.length === 0 ? (
	                <div className="apple-card p-10 text-center text-sm font-semibold text-apple-gray-500">目前沒有商品，請使用上方表單建立第一件商品。</div>
	              ) : data.products.map((product) => (
	                <AdminProductEditor key={product.id} product={product} runAction={runAction} />
	              ))}
	            </section>
	          ) : null}

              {activeTab === 'content' && data ? (
                <AdminContentManager content={data.siteContent} courses={data.courses} seasons={data.courseSeasons} scope="content" runAction={runAction} />
              ) : null}

              {activeTab === 'seasons' && data ? (
                <section className="space-y-5">
                  <div className="flex flex-col gap-4 border-b border-black/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-apple-gray-950">季度管理</h2>
                      <p className="mt-1 text-sm font-semibold text-apple-gray-500">季度設定、課程資料、歷史學員與招生統計集中在這裡。</p>
                    </div>
                    <div className="grid grid-cols-2 rounded-lg bg-apple-gray-100 p-1" role="tablist" aria-label="季度管理內容">
                      <button type="button" role="tab" aria-selected={seasonView === 'students'} onClick={() => setSeasonView('students')} className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition ${seasonView === 'students' ? 'bg-white text-black shadow-sm' : 'text-apple-gray-500 hover:text-black'}`}><BarChart3 className="h-4 w-4" />學員與統計</button>
                      <button type="button" role="tab" aria-selected={seasonView === 'settings'} onClick={() => setSeasonView('settings')} className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition ${seasonView === 'settings' ? 'bg-white text-black shadow-sm' : 'text-apple-gray-500 hover:text-black'}`}><CalendarRange className="h-4 w-4" />季度設定</button>
                    </div>
                  </div>
                  {seasonView === 'students' ? (
                    <AdminEnrollmentAnalytics orders={data.orders} courseCapacity={data.courseCapacity} seasons={data.courseSeasons} syncSources={data.seasonSyncSources} runAction={runAction} updatingId={updatingId} />
                  ) : (
                    <AdminContentManager content={data.siteContent} courses={data.courses} seasons={data.courseSeasons} scope="seasons" runAction={runAction} />
                  )}
                </section>
              ) : null}

	          {activeTab === 'reconciliation' && data ? (
	            <AdminBankReconciliation paymentAccounts={data.paymentAccounts} />
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
