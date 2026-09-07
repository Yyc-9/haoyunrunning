'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarRange,
  CheckCircle2,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  Landmark,
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
import AdminProductWorkspace from '@/components/admin/AdminProductWorkspace'
import type { AdminEditableProduct, ProductEditState } from '@/lib/admin-products'
import AdminBankReconciliation from '@/components/admin/AdminBankReconciliation'
import AdminCoachDuty from '@/components/admin/AdminCoachDuty'
import AdminMobileDashboard from '@/components/admin/AdminMobileDashboard'
import { paymentOrderStatusLabels, type PaymentOrderStatus } from '@/lib/payment'
import { announceSiteContentUpdated } from '@/lib/site-content-sync'

type AdminTab = 'overview' | 'students' | 'coaches' | 'seasons' | 'products' | 'content' | 'reconciliation' | 'paymentAccounts'

export type AdminDashboardPayload = {
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
  coachAccounts: AdminCoachAccount[]
  coachPublicProfiles: Array<{ coachKey: string; displayName: string; ownerProfileId: string | null; verificationEmail: string }>
}

export type AdminCoachAccount = {
  id: string
  coachKey: string
  name: string
  email: string
  profileId: string | null
  role: 'student' | 'coach' | 'admin' | null
  status: 'pending' | 'enabled' | 'disabled'
  registered: boolean | null
  emailConfirmed: boolean | null
  boundStudentCount: number
  courses: string
  publicProfileName: string
  publicCoachKey: string
  createdAt: string
  updatedAt: string
  enabledAt: string | null
  disabledAt: string | null
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
  campaignLabel: string
  slogan: string
  targetAudience: string
  focus: string
  benefits: string[]
  suitableFor: string[]
  enrollmentNote: string
  signupUrl: string
  coachKeys: string[]
}

export type AdminStudent = {
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

export type AdminCoach = {
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

export type AdminOrder = {
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

export type AdminProduct = AdminEditableProduct

export type PaymentAccount = {
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

const statusLabels = paymentOrderStatusLabels['zh-TW']

const tabs: Array<{ id: AdminTab; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: '總覽', description: '掌握待處理事項、報名與營運概況。', icon: LayoutDashboard },
  { id: 'students', label: '學員管理', description: '查找學員、課程、匯款與課表權限。', icon: UsersRound },
  { id: 'coaches', label: '教練管理', description: '管理教練身份、到課、請假與代班。', icon: UserCog },
  { id: 'seasons', label: '季度管理', description: '管理招生季度、課程資料與學員名單。', icon: CalendarRange },
  { id: 'products', label: '商城商品', description: '維護商品內容、庫存與上下架狀態。', icon: Boxes },
  { id: 'content', label: '內容中心', description: '更新網站圖片、文字與公開頁面內容。', icon: PanelsTopLeft },
  { id: 'reconciliation', label: '銀行對帳', description: '匯入銀行資料並完成人工入帳核對。', icon: FileSpreadsheet },
  { id: 'paymentAccounts', label: '收款帳戶', description: '維護課程匯款所使用的官方帳戶。', icon: Landmark },
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
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [seasonView, setSeasonView] = useState<'settings' | 'students'>('students')
  const [selectedCoachByStudent, setSelectedCoachByStudent] = useState<Record<string, string>>({})
  const [studentQuery, setStudentQuery] = useState('')
  const [coachQuery, setCoachQuery] = useState('')
  const [productEditState, setProductEditState] = useState<ProductEditState>({ dirty: false, busy: false })
  const [selectedCoachAccountKey, setSelectedCoachAccountKey] = useState('')
  const [selectedCoachAccountEmail, setSelectedCoachAccountEmail] = useState('')
  const [studentPlanFilter, setStudentPlanFilter] = useState<'all' | 'enabled' | 'missing'>('all')
  const [coachStatusFilter, setCoachStatusFilter] = useState<'all' | 'enabled' | 'pending' | 'disabled'>('all')
  const [accountForm, setAccountForm] = useState({
    label: '',
    accountName: '',
    bankName: '',
    bankCode: '',
    accountNumber: '',
    weight: '1',
  })

  const loadDashboard = useCallback(async (background = false) => {
    if (!background) setIsLoading(true)
    setError('')

    try {
      setData(await fetchAdminDashboard())
    } catch (loadError) {
      if (!background) setData(null)
      else setMessage('')
      setError(loadError instanceof Error ? loadError.message : '讀取管理員後台失敗。')
    } finally {
      if (!background) setIsLoading(false)
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
  const filteredCoachAccounts = useMemo(() => {
    const text = coachQuery.trim().toLowerCase()

    return (data?.coachAccounts ?? []).filter((account) => {
      if (coachStatusFilter !== 'all' && account.status !== coachStatusFilter) return false
      if (!text) return true

      return [account.name, account.email, account.role || '', account.status, account.courses, account.publicProfileName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    })
  }, [coachQuery, coachStatusFilter, data?.coachAccounts])
  const availableCoachAccountProfiles = useMemo(() => {
    const registeredKeys = new Set((data?.coachAccounts ?? []).map((account) => account.coachKey))
    return (data?.coachPublicProfiles ?? []).filter((profile) => !registeredKeys.has(profile.coachKey))
  }, [data?.coachAccounts, data?.coachPublicProfiles])
  const enabledCoachAccountCount = (data?.coachAccounts ?? []).filter((account) => account.status === 'enabled').length
  const pendingCoachAccountCount = (data?.coachAccounts ?? []).filter((account) => account.status === 'pending').length
  const activeTabDefinition = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]
  const ActiveTabIcon = activeTabDefinition.icon
  const overviewMetrics = data ? [
    { label: '已回報，待人工核對', value: data.overview.pendingOrderCount, tone: 'attention', featured: true },
    { label: '已確認入帳', value: data.overview.approvedOrderCount, tone: 'success', featured: true },
    { label: '商城商品', value: data.overview.productCount, tone: 'neutral', featured: false },
    { label: '低庫存商品', value: data.overview.lowStockCount, tone: 'warning', featured: false },
    { label: '收款帳戶', value: data.overview.paymentAccountCount, tone: 'neutral', featured: false },
    { label: '學員總數', value: data.overview.studentCount, tone: 'neutral', featured: false },
  ] : []
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
        if (action.action === 'save_coach_public_profile') announceSiteContentUpdated()
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

  async function registerCoachAccount() {
    if (!selectedCoachAccountKey || !selectedCoachAccountEmail.trim()) return
    const created = await runAction('register-coach-account', {
      action: 'register_coach_account',
      coachKey: selectedCoachAccountKey,
      verificationEmail: selectedCoachAccountEmail,
    })
    if (created) {
      setSelectedCoachAccountKey('')
      setSelectedCoachAccountEmail('')
    }
  }

  function renderStudentBindingControls(student: AdminStudent, compact = false) {
    return (
      <div className={compact ? 'grid gap-2' : 'flex min-w-[280px] gap-2'}>
        <select
          value={selectedCoachByStudent[student.id] ?? ''}
          onChange={(event) => setSelectedCoachByStudent((current) => ({ ...current, [student.id]: event.target.value }))}
          aria-label={`選擇要綁定給 ${student.name} 的教練`}
          className={`apple-input text-xs ${compact ? 'min-h-11 w-full' : 'min-w-0 flex-1 py-2'}`}
        >
          <option value="">選擇教練</option>
          {data?.coachOptions.map((coach) => (
            <option key={coach.id} value={coach.id}>{coach.name || coach.email}</option>
          ))}
        </select>
        <div className={`grid gap-2 ${student.bindings[0] ? 'grid-cols-2' : 'grid-cols-1'} ${compact ? '' : 'shrink-0'}`}>
          <button
            type="button"
            disabled={!selectedCoachByStudent[student.id] || updatingId === `bind-${student.id}`}
            onClick={() => runAction(`bind-${student.id}`, { action: 'bind_student', studentId: student.id, coachId: selectedCoachByStudent[student.id] })}
            className="min-h-11 rounded-full bg-black px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            綁定
          </button>
          {student.bindings[0] ? (
            <button
              type="button"
              disabled={updatingId === `unbind-${student.bindings[0].id}`}
              onClick={() => runAction(`unbind-${student.bindings[0].id}`, { action: 'unbind_student', bindingId: student.bindings[0].id })}
              className="min-h-11 rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              解綁
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <main className="admin-shell min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <div className="container mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-apple-gray-500" />
          <p className="mt-4 font-semibold text-apple-gray-600">正在讀取管理員後台...</p>
        </div>
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="admin-shell min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
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
    <main className={`admin-shell min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24 ${activeTab === 'products' ? 'admin-products-mode' : ''}`}>
      {data ? <AdminMobileDashboard data={data} runAction={runAction} updatingId={updatingId} actionMessage={message} actionError={error} /> : null}
      <section className="admin-desktop-shell px-4 py-10 sm:px-6 lg:px-8">
        <div className="admin-dashboard-grid container mx-auto max-w-[1600px]">
          <div className="admin-dashboard-header mb-8 lg:mb-7">
            <div className="admin-dashboard-heading">
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">管理員後台</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-apple-gray-600">
                集中管理學員、教練、季度、網站內容與課程匯款資料。
              </p>
            </div>
            <div key={activeTab} className="admin-dashboard-context hidden lg:flex" aria-live="polite">
              <span className="admin-dashboard-context-icon" aria-hidden="true"><ActiveTabIcon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#64808b]">目前工作區</p>
                <p className="mt-0.5 font-black text-[#092d3a]">{activeTabDefinition.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#526a74]">{activeTabDefinition.description}</p>
              </div>
            </div>
          </div>

          <nav aria-label="管理員後台導航" className="admin-dashboard-sidebar mb-8 overflow-x-auto lg:sticky lg:top-24 lg:mb-0 lg:overflow-visible">
            <div className="admin-sidebar-panel min-w-max rounded-3xl bg-white/85 p-2 shadow-sm ring-1 ring-black/10 backdrop-blur lg:min-w-0 lg:rounded-2xl lg:shadow-none lg:backdrop-blur-none">
              <div className="admin-sidebar-identity hidden lg:block">
                <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                  <span className="admin-live-dot" aria-hidden="true" />
                  正式資料已連線
                </div>
                <p className="mt-3 text-lg font-black text-white">營運工作台</p>
                <p className="mt-1 truncate text-xs text-white/55">{data?.admin.name || data?.admin.email}</p>
              </div>
              <div className="admin-sidebar-tabs flex min-w-max gap-2 lg:min-w-0 lg:flex-col lg:gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  const count = tab.id === 'overview'
                    ? data?.overview.pendingOrderCount ?? 0
                    : tab.id === 'coaches'
                      ? data?.overview.openAttendanceAnomalyCount ?? 0
                      : 0

                  return (
                    <button
                      key={tab.id}
                      id={`admin-tab-${tab.id}`}
                      type="button"
                      onClick={() => {
                        if (tab.id === activeTab) return
                        if (activeTab === 'products' && productEditState.busy) return
                        if (activeTab === 'products' && productEditState.dirty && !window.confirm('商品有未儲存的變更。確定放棄並切換工作區？')) return
                        setProductEditState({ dirty: false, busy: false })
                        setActiveTab(tab.id)
                      }}
                      aria-current={active ? 'page' : undefined}
                      aria-controls={`admin-panel-${tab.id}`}
                      data-active={active ? 'true' : 'false'}
                      className={`admin-sidebar-tab inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition lg:min-h-12 lg:w-full lg:justify-start lg:rounded-xl ${
                        active ? 'bg-black text-white' : 'text-apple-gray-600 hover:bg-apple-gray-100 hover:text-apple-gray-900'
                      }`}
                    >
                      <span className="admin-sidebar-icon" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                      <span className="whitespace-nowrap">{tab.label}</span>
                      {count > 0 ? <span className="admin-sidebar-count">{count}</span> : null}
                    </button>
                  )
                })}
              </div>
              <div className="admin-sidebar-footer hidden lg:block">
                <p className="text-xs font-bold text-white/55">超級管理員</p>
                <p className="mt-1 truncate text-xs text-white/80">{data?.admin.email}</p>
              </div>
            </div>
          </nav>

          {message ? (
            <div role="status" className="admin-toast fixed right-4 top-24 z-[70] flex max-w-sm items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg sm:right-6">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {message}
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="admin-toast fixed right-4 top-24 z-[70] flex max-w-sm items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg sm:right-6">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div
            key={activeTab}
            id={`admin-panel-${activeTab}`}
            role="region"
            aria-labelledby={`admin-tab-${activeTab}`}
            className="admin-dashboard-workspace"
          >
            {activeTab === 'overview' && data ? (
            <section className="space-y-8">
              <div className="admin-overview-metrics grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    data-tone={metric.tone}
                    className={`admin-metric-card apple-card p-5 ${metric.featured ? 'xl:col-span-2' : ''}`}
                  >
                    <p className="text-sm font-semibold text-apple-gray-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-black tabular-nums text-apple-gray-900">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="admin-operational-card apple-card p-6">
                <div className="mb-5 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-black text-apple-gray-900">已回報，待人工核對</h2>
                </div>
                {pendingOrders.length === 0 ? (
                  <p className="text-sm text-apple-gray-600">目前沒有已回報、待人工核對的記錄。</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {pendingOrders.slice(0, 4).map((order) => (
                      <div key={order.id} className="rounded-2xl bg-apple-gray-100 p-4">
                        <p className="font-bold text-apple-gray-900">{order.studentName}</p>
                        <p className="mt-1 text-sm text-apple-gray-600">
                          {order.orderKind === 'shop' ? `${order.orderNumber} · 跑班自取` : `${order.courseName || '未填寫課程'} · 後五碼 ${order.transferLastFive || '-'}`}
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
                    <p className="mt-1 text-sm text-apple-gray-600">顯示所有學員、綁定教練、匯款狀態、課表狀態與最近訓練回饋。</p>
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
              <div className="divide-y divide-black/10 md:hidden">
                {filteredStudents.map((student) => (
                  <article key={student.id} className="space-y-5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-black text-apple-gray-900">{student.name}</h3>
                        <p className="mt-1 break-all text-sm leading-6 text-apple-gray-600">{student.email || '未提供信箱'}</p>
                      </div>
                      <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${student.planEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {student.planEnabled ? '課表已開通' : '課表未開通'}
                      </span>
                    </div>

                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-bold text-apple-gray-500">綁定教練</dt>
                        <dd className="mt-1 leading-6 text-apple-gray-800">{student.boundCoachNames || '尚未綁定'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-bold text-apple-gray-500">報名課程</dt>
                        <dd className="mt-1 leading-6 text-apple-gray-800">{student.program || student.paymentCourse || '尚無課程'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-bold text-apple-gray-500">匯款狀態</dt>
                        <dd className="mt-2">
                          <span className="inline-flex whitespace-nowrap rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                            {statusLabels[student.paymentStatus as PaymentOrderStatus] || student.paymentStatus}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-bold text-apple-gray-500">最近回饋</dt>
                        <dd className="mt-1 tabular-nums text-apple-gray-700">{formatDate(student.lastFeedbackAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-bold text-apple-gray-500">建立時間</dt>
                        <dd className="mt-1 tabular-nums text-apple-gray-700">{formatDate(student.createdAt)}</dd>
                      </div>
                    </dl>

                    <div>
                      <p className="mb-2 text-xs font-bold text-apple-gray-500">綁定操作</p>
                      {renderStudentBindingControls(student, true)}
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1560px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[120px]" />
                    <col className="w-[210px]" />
                    <col className="w-[160px]" />
                    <col className="w-[210px]" />
                    <col className="w-[170px]" />
                    <col className="w-[120px]" />
                    <col className="w-[130px]" />
                    <col className="w-[140px]" />
                    <col className="w-[300px]" />
                  </colgroup>
                  <thead className="bg-apple-gray-100 text-apple-gray-600">
                    <tr>
                      {['姓名', '信箱', '綁定教練', '報名課程', '匯款狀態', '課表', '最近回饋', '建立時間', '綁定操作'].map((header) => (
                        <th key={header} className="whitespace-nowrap px-4 py-3 font-bold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="whitespace-nowrap px-4 py-4 font-bold text-apple-gray-900">{student.name}</td>
                        <td className="truncate px-4 py-4 text-apple-gray-600" title={student.email || undefined}>{student.email || '-'}</td>
                        <td className="px-4 py-4 leading-6 text-apple-gray-700">{student.boundCoachNames || '尚未綁定'}</td>
                        <td className="px-4 py-4 leading-6 text-apple-gray-600">{student.program || student.paymentCourse || '-'}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex whitespace-nowrap rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                            {statusLabels[student.paymentStatus as PaymentOrderStatus] || student.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${student.planEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {student.planEnabled ? '已開通' : '未開通'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 tabular-nums text-apple-gray-600">{formatDate(student.lastFeedbackAt)}</td>
                        <td className="whitespace-nowrap px-4 py-4 tabular-nums text-apple-gray-600">{formatDate(student.createdAt)}</td>
                        <td className="px-4 py-4">
                          {renderStudentBindingControls(student)}
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
              <AdminCoachDuty />
              <div className="border-b border-black/10 bg-apple-gray-100 p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <h2 className="text-xl font-black text-apple-gray-900">教練帳號登記</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-apple-gray-600">管理員只需登記既有公開教練資料的登入信箱；已註冊帳號會在信箱已驗證後原子連結，未註冊者會等首次登入，不會替他建立帳號或寄送郵件。</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">已啟用 {enabledCoachAccountCount}</span>
                      <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">待啟用 {pendingCoachAccountCount}</span>
                      <span className="rounded-full bg-black/5 px-3 py-1.5 text-apple-gray-700">共 {data.coachAccounts.length} 筆登記</span>
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto] lg:min-w-[560px]">
                    <select
                      value={selectedCoachAccountKey}
                      onChange={(event) => {
                        const coachKey = event.target.value
                        const profile = availableCoachAccountProfiles.find((item) => item.coachKey === coachKey)
                        setSelectedCoachAccountKey(coachKey)
                        setSelectedCoachAccountEmail(profile?.verificationEmail ?? '')
                      }}
                      className="apple-input min-w-0 bg-white py-2.5 text-sm"
                      aria-label="選擇要登記的公開教練身份"
                    >
                      <option value="">{availableCoachAccountProfiles.length ? '選擇要登記的教練' : '目前沒有待登記的公開教練'}</option>
                      {availableCoachAccountProfiles.map((profile) => (
                        <option key={profile.coachKey} value={profile.coachKey}>{profile.displayName}</option>
                      ))}
                    </select>
                    <input
                      type="email"
                      value={selectedCoachAccountEmail}
                      onChange={(event) => setSelectedCoachAccountEmail(event.target.value)}
                      placeholder="教練登入信箱"
                      className="apple-input min-w-0 bg-white py-2.5 text-sm"
                      aria-label="教練登入信箱"
                    />
                    <button
                      type="button"
                      onClick={registerCoachAccount}
                      disabled={!selectedCoachAccountKey || !selectedCoachAccountEmail.trim() || updatingId === 'register-coach-account'}
                      className="apple-button-primary gap-2 whitespace-nowrap px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingId === 'register-coach-account' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      登記教練帳號
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-b border-black/10 p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <h2 className="text-xl font-black text-apple-gray-900">教練管理</h2>
                    <p className="mt-1 text-sm text-apple-gray-600">名冊會顯示全部已登記信箱，包括尚未註冊、尚未驗證及明確停用的帳號。停用不會因日後登入自動恢復。</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_150px] lg:w-[520px]">
                    <input
                      value={coachQuery}
                      onChange={(event) => setCoachQuery(event.target.value)}
                      placeholder="搜尋姓名、信箱或課程"
                      className="apple-input"
                    />
                    <select
                      value={coachStatusFilter}
                      onChange={(event) => setCoachStatusFilter(event.target.value as typeof coachStatusFilter)}
                      className="apple-input"
                      aria-label="篩選教練帳號狀態"
                    >
                      <option value="all">全部狀態</option>
                      <option value="enabled">已啟用</option>
                      <option value="pending">待啟用</option>
                      <option value="disabled">已停用</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-black/10">
                {filteredCoachAccounts.map((account) => {
                  const isLegacy = account.id.startsWith('legacy:')
                  const statusLabel = account.status === 'enabled' ? '教練已啟用' : account.status === 'disabled' ? '已停用' : '待啟用'
                  const statusClass = account.status === 'enabled' ? 'bg-emerald-50 text-emerald-700' : account.status === 'disabled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  return (
                    <article key={account.id} className="p-4 sm:p-5">
                      <div className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,1fr)_minmax(220px,1.1fr)_minmax(190px,auto)] xl:items-center">
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3 xl:block">
                            <div className="min-w-0">
                              <h3 className="truncate font-black text-apple-gray-900">{account.name}</h3>
                              <p className="mt-1 truncate text-sm text-apple-gray-500">{account.email || '未提供信箱'}</p>
                            </div>
                            <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ' + statusClass}>{statusLabel}</span>
                          </div>
                          <p className="mt-2 text-xs text-apple-gray-500">{account.registered === null ? '帳號狀態暫不可查' : account.registered ? (account.emailConfirmed ? '已註冊 · 信箱已驗證' : '已註冊 · 等待信箱驗證') : '尚未註冊，等待首次登入'}{account.role === 'admin' ? ' · 管理員權限保留' : ''}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-apple-gray-50 p-3 text-sm">
                          <div><p className="text-xs font-bold text-apple-gray-400">綁定學員</p><p className="mt-1 font-black text-apple-gray-900">{account.boundStudentCount} 位</p></div>
                          <div><p className="text-xs font-bold text-apple-gray-400">建立時間</p><p className="mt-1 text-xs font-semibold leading-5 text-apple-gray-700">{formatDate(account.createdAt)}</p></div>
                          <div className="col-span-2"><p className="text-xs font-bold text-apple-gray-400">負責課程</p><p className="mt-1 break-words font-semibold leading-5 text-apple-gray-700">{account.courses || '暫無資料'}</p></div>
                        </div>
                        <label className="block min-w-0">
                          <span className="mb-2 block text-xs font-bold text-apple-gray-500">公開教練身份</span>
                          <select
                            value={account.publicCoachKey}
                            disabled={account.status !== 'enabled' || !account.profileId || isLegacy || updatingId === 'coach-profile-' + account.profileId}
                            onChange={(event) => runAction('coach-profile-' + account.profileId, { action: 'link_coach_public_profile', userId: account.profileId, coachKey: event.target.value })}
                            className="apple-input w-full min-w-0 py-2.5 text-sm disabled:opacity-50"
                            aria-label={'設定 ' + account.name + ' 的公開教練身份'}
                          >
                            <option value="">尚未連結</option>
                            {data.coachPublicProfiles.map((profile) => <option key={profile.coachKey} value={profile.coachKey}>{profile.displayName}{profile.ownerProfileId && profile.ownerProfileId !== account.profileId ? '（已連結其他帳號）' : ''}</option>)}
                          </select>
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          {account.role === 'admin' ? (
                            <button type="button" disabled className="w-full rounded-xl border border-black/10 bg-apple-gray-100 px-4 py-2.5 text-sm font-bold text-apple-gray-500">保留管理員權限（不可停用）</button>
                          ) : isLegacy ? (
                            <p className="rounded-xl bg-apple-gray-50 px-4 py-2.5 text-center text-xs font-semibold leading-5 text-apple-gray-500">完成資料庫登記後可管理狀態</p>
                          ) : account.status === 'disabled' ? (
                            <button type="button" disabled={updatingId === account.id} onClick={() => runAction(account.id, { action: 'set_coach_account_status', allowlistId: account.id, enabled: true })} className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">重新啟用</button>
                          ) : (
                            <button type="button" disabled={updatingId === account.id} onClick={() => void runAction(account.id, { action: 'set_coach_account_status', allowlistId: account.id, enabled: false })} className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40">停用教練帳號</button>
                          )}
                          {account.status === 'pending' && account.registered && account.emailConfirmed && !isLegacy ? (
                            <button type="button" disabled={updatingId === 'activate-' + account.id} onClick={() => runAction('activate-' + account.id, { action: 'set_coach_account_status', allowlistId: account.id, enabled: true })} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">檢查並啟用</button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              {filteredCoachAccounts.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-apple-gray-500">目前沒有符合條件的教練帳號。</div> : null}
            </section>
          ) : null}

          {activeTab === 'products' && data ? (
            <AdminProductWorkspace products={data.products} runAction={runAction} onStateChange={setProductEditState} />
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
                    <AdminContentManager content={data.siteContent} courses={data.courses} seasons={data.courseSeasons} scope="seasons" onBack={() => setSeasonView('students')} runAction={runAction} />
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
	                <p className="mt-1 text-sm leading-6 text-apple-gray-600">帳戶池供管理員整理銀行對帳通道；商城買家會在結帳頁看到目前的好運官方匯款資料，不會看到內部帳戶分配結果。</p>
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
	                  <Landmark className="h-4 w-4" />
	                  新增帳戶
	                </button>
	              </div>

	              <div className="apple-card overflow-hidden">
	                <div className="border-b border-black/10 p-5">
	                  <h2 className="text-xl font-black text-apple-gray-900">收款帳戶池</h2>
	                  <p className="mt-1 text-sm text-apple-gray-600">供課程與商城匯款對帳使用；商城付款完成後仍採跑班自取。</p>
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

        </div>
      </section>
    </main>
  )
}
