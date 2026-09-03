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
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
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
import AdminCoachDuty from '@/components/admin/AdminCoachDuty'
import { paymentOrderStatusLabels, type PaymentOrderStatus } from '@/lib/payment'
import { announceSiteContentUpdated } from '@/lib/site-content-sync'

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
  coachPublicProfiles: Array<{ coachKey: string; displayName: string; ownerProfileId: string | null; verificationEmail: string }>
}

type CoachInvite = {
  id: string
  code: string
  coachKey: string
  coachName: string
  verificationEmail: string
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

async function fetchCoachInviteStatus() {
  const token = await getAccessToken()
  if (!token) throw new Error('請先登入管理員帳號。')

  const response = await fetch('/api/admin/coach-invite-status', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = (await response.json().catch(() => ({}))) as Pick<
    AdminDashboardPayload,
    'coachInvites' | 'coachPublicProfiles'
  > & { error?: string }

  if (!response.ok) throw new Error(payload.error || '讀取教練認證狀態失敗。')
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
  const [selectedCoachInviteKey, setSelectedCoachInviteKey] = useState('')
  const [selectedCoachInviteEmail, setSelectedCoachInviteEmail] = useState('')
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
    if (activeTab !== 'coaches') return

    let cancelled = false
    const syncCoachInviteStatus = async () => {
      try {
        const snapshot = await fetchCoachInviteStatus()
        if (cancelled) return
        setData((current) => current ? {
          ...current,
          coachInvites: snapshot.coachInvites,
          coachPublicProfiles: snapshot.coachPublicProfiles,
        } : current)
      } catch {
        // The full dashboard refresh remains available if a background sync is interrupted.
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncCoachInviteStatus()
    }

    syncCoachInviteStatus()
    const timer = window.setInterval(syncCoachInviteStatus, 10_000)
    window.addEventListener('focus', syncCoachInviteStatus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', syncCoachInviteStatus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeTab])

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
    return (data?.coachPublicProfiles ?? []).filter((profile) => !profile.ownerProfileId)
  }, [data?.coachPublicProfiles])
  const assignedCoachInvites = useMemo(
    () => (data?.coachInvites ?? []).filter((invite) => Boolean(invite.verificationEmail)),
    [data?.coachInvites]
  )
  const unassignedCoachInviteCount = (data?.coachInvites.length ?? 0) - assignedCoachInvites.length
  const verificationCoachProfiles = useMemo(
    () => (data?.coachPublicProfiles ?? []).filter((profile) => Boolean(profile.verificationEmail)),
    [data?.coachPublicProfiles]
  )
  const verifiedCoachProfileCount = verificationCoachProfiles.filter((profile) => Boolean(profile.ownerProfileId)).length
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

  async function createCoachInvite() {
    if (!selectedCoachInviteKey || !selectedCoachInviteEmail.trim()) return
    const created = await runAction('create-coach-invite', {
      action: 'create_coach_invite',
      coachKey: selectedCoachInviteKey,
      verificationEmail: selectedCoachInviteEmail,
    })
    if (created) {
      setSelectedCoachInviteKey('')
      setSelectedCoachInviteEmail('')
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
    <main className="admin-shell min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
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
                      onClick={() => setActiveTab(tab.id)}
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-apple-gray-100 text-apple-gray-600">
                    <tr>
                      {['姓名', '信箱', '綁定教練', '報名課程', '匯款狀態', '課表', '最近回饋', '建立時間', '綁定操作'].map((header) => (
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
              <AdminCoachDuty />
              <div className="border-b border-black/10 bg-apple-gray-100 p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-apple-gray-700" />
                      <h2 className="text-lg font-black text-apple-gray-900">專屬教練認證碼</h2>
                    </div>
                    <p className="mt-1 text-sm text-apple-gray-600">每組認證碼只對應一份公開教練資料。使用者登入並完成認證後，教練權限、公開身份與負責課程會一起連結。</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">
                        已完成 {verifiedCoachProfileCount} / {verificationCoachProfiles.length}
                      </span>
                      <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">
                        待認證 {assignedCoachInvites.length}
                      </span>
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_auto] lg:min-w-[520px]">
                    <select
                      value={selectedCoachInviteKey}
                      onChange={(event) => {
                        const coachKey = event.target.value
                        const profile = availableCoachInviteProfiles.find((item) => item.coachKey === coachKey)
                        setSelectedCoachInviteKey(coachKey)
                        setSelectedCoachInviteEmail(profile?.verificationEmail ?? '')
                      }}
                      className="apple-input min-w-0 bg-white py-2.5 text-sm"
                      aria-label="選擇公開教練身份"
                    >
                      <option value="">{availableCoachInviteProfiles.length ? '選擇尚未認證的教練' : '所有教練皆已完成認證'}</option>
                      {availableCoachInviteProfiles.map((profile) => (
                        <option key={profile.coachKey} value={profile.coachKey}>{profile.displayName}</option>
                      ))}
                    </select>
                    <input
                      type="email"
                      value={selectedCoachInviteEmail}
                      onChange={(event) => setSelectedCoachInviteEmail(event.target.value)}
                      placeholder="教練登入信箱"
                      className="apple-input min-w-0 bg-white py-2.5 text-sm"
                      aria-label="教練登入信箱"
                    />
                    <button
                      type="button"
                      onClick={createCoachInvite}
                      disabled={!selectedCoachInviteKey || !selectedCoachInviteEmail.trim() || updatingId === 'create-coach-invite'}
                      className="apple-button-primary gap-2 whitespace-nowrap px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingId === 'create-coach-invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      儲存認證資料
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                  {assignedCoachInvites.map((invite) => {
                    const expired = Boolean(invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now())
                    return (
                      <div key={invite.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-apple-gray-900">{invite.coachName}</p>
                          <p className="mt-1 truncate font-mono text-xs font-bold text-apple-gray-600">{invite.code}</p>
                          <p className="mt-1 truncate text-xs text-apple-gray-500">{invite.verificationEmail}</p>
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
                  {assignedCoachInvites.length === 0 ? (
                    <p className="text-sm font-semibold text-emerald-700">
                      {verificationCoachProfiles.length > 0 && verifiedCoachProfileCount === verificationCoachProfiles.length
                        ? '名單中的教練皆已完成身份認證。'
                        : '目前沒有可使用的專屬認證碼。'}
                    </p>
                  ) : null}
                </div>
                {unassignedCoachInviteCount > 0 ? (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                    另有 {unassignedCoachInviteCount} 份舊教練資料尚未指定登入信箱，認證碼不會對任何普通帳戶開放；可從上方選擇教練後補上信箱。
                  </p>
                ) : null}
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
