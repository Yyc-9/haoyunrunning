'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  UserCog,
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type PaymentOrderStatus = 'pending_transfer' | 'pending_review' | 'approved' | 'rejected'

type AdminTab = 'overview' | 'students' | 'coaches' | 'orders' | 'refunds' | 'products' | 'events' | 'settings'

type AdminDashboardPayload = {
  admin: { id: string; email: string; name: string; role: string }
  overview: {
    studentCount: number
    coachCount: number
    pendingOrderCount: number
    approvedOrderCount: number
    unopenedPlanCount: number
    recentFeedbackCount: number
  }
  students: AdminStudent[]
  coaches: AdminCoach[]
  orders: AdminOrder[]
  coachOptions: Array<{ id: string; name: string; email: string }>
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
  studentName: string
  email: string
  courseName: string
  amountText: string
  transferLastFive: string
  status: PaymentOrderStatus
  submittedAt: string
  notes: string
  reviewNote: string | null
}

const statusLabels: Record<PaymentOrderStatus, string> = {
  pending_transfer: '待汇款 / 待填写后五码',
  pending_review: '已提交后五码，待人工核对',
  approved: '已核准，课表已开通',
  rejected: '核对未通过或需补充资料',
}

const statusTone: Record<PaymentOrderStatus, string> = {
  pending_transfer: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

const tabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard; ready: boolean }> = [
  { id: 'overview', label: '总览', icon: LayoutDashboard, ready: true },
  { id: 'students', label: '学员管理', icon: UsersRound, ready: true },
  { id: 'coaches', label: '教练管理', icon: UserCog, ready: true },
  { id: 'orders', label: '订单审核', icon: ClipboardList, ready: true },
  { id: 'refunds', label: '退款申请', icon: RotateCcw, ready: false },
  { id: 'products', label: '商城商品', icon: Boxes, ready: false },
  { id: 'events', label: '活动报名', icon: CreditCard, ready: false },
  { id: 'settings', label: '系统设置', icon: Settings, ready: false },
]

function formatDate(value: string | null | undefined) {
  if (!value) return '暂无数据'

  return new Intl.DateTimeFormat('zh-CN', {
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
    throw new Error('请先登录管理员账号。')
  }

  const response = await fetch('/api/admin', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as AdminDashboardPayload & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || '读取管理员后台失败。')
  }

  return payload
}

async function adminAction(body: Record<string, unknown>) {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('请先登录管理员账号。')
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
    throw new Error(payload.error || '操作失败。')
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

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setData(await fetchAdminDashboard())
    } catch (loadError) {
      setData(null)
      setError(loadError instanceof Error ? loadError.message : '读取管理员后台失败。')
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

  async function runAction(id: string, action: Record<string, unknown>) {
    setUpdatingId(id)
    setError('')
    setMessage('')

    try {
      const nextMessage = await adminAction(action)
      setMessage(nextMessage)
      await loadDashboard()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '操作失败。')
    } finally {
      setUpdatingId('')
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <div className="container mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-apple-gray-500" />
          <p className="mt-4 font-semibold text-apple-gray-600">正在读取管理员后台...</p>
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
            <h1 className="mt-4 text-3xl font-black text-apple-gray-900">无法进入管理员后台</h1>
            <p className="mt-3 leading-7 text-apple-gray-600">{error}</p>
            <Link href="/" className="apple-button-primary mt-6 inline-flex px-6 py-3">
              返回首页
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
                Admin console
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">管理员后台</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                第一阶段后台用于查看并管理学员、教练权限和课程报名付款订单。
              </p>
            </div>

            <button type="button" onClick={loadDashboard} className="apple-button-outline inline-flex items-center justify-center gap-2 px-5 py-3">
              <RefreshCw className="h-4 w-4" />
              刷新数据
            </button>
          </div>

          <nav aria-label="管理员后台导航" className="mb-8 overflow-x-auto">
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
                    {!tab.ready ? <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">预留</span> : null}
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
                  ['学员总数', data.overview.studentCount],
                  ['教练总数', data.overview.coachCount],
                  ['待核对订单', data.overview.pendingOrderCount],
                  ['已核准订单', data.overview.approvedOrderCount],
                  ['未开通课表', data.overview.unopenedPlanCount],
                  ['最近回馈', data.overview.recentFeedbackCount],
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
                  <h2 className="text-xl font-black text-apple-gray-900">待核对订单</h2>
                </div>
                {pendingOrders.length === 0 ? (
                  <p className="text-sm text-apple-gray-600">暂无待核对课程付款订单。</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {pendingOrders.slice(0, 4).map((order) => (
                      <div key={order.id} className="rounded-2xl bg-apple-gray-100 p-4">
                        <p className="font-bold text-apple-gray-900">{order.studentName}</p>
                        <p className="mt-1 text-sm text-apple-gray-600">{order.courseName || '未填写课程'} · 后五码 {order.transferLastFive || '-'}</p>
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
                <h2 className="text-xl font-black text-apple-gray-900">学员管理</h2>
                <p className="mt-1 text-sm text-apple-gray-600">显示所有学员、绑定教练、付款状态、课表状态与最近训练回馈。</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-apple-gray-100 text-apple-gray-600">
                    <tr>
                      {['姓名', '邮箱', '绑定教练', '报名课程', '付款状态', '课表', '最近回馈', '创建时间', '绑定操作'].map((header) => (
                        <th key={header} className="px-4 py-3 font-bold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {data.students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-4 font-bold text-apple-gray-900">{student.name}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{student.email || '-'}</td>
                        <td className="px-4 py-4 text-apple-gray-700">{student.boundCoachNames || '尚未绑定'}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{student.program || student.paymentCourse || '-'}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                            {statusLabels[student.paymentStatus as PaymentOrderStatus] || student.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${student.planEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {student.planEnabled ? '已开通' : '未开通'}
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
                              <option value="">选择教练</option>
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
                              绑定
                            </button>
                            {student.bindings[0] ? (
                              <button
                                type="button"
                                disabled={updatingId === `unbind-${student.bindings[0].id}`}
                                onClick={() => runAction(`unbind-${student.bindings[0].id}`, { action: 'unbind_student', bindingId: student.bindings[0].id })}
                                className="rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                解绑
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeTab === 'coaches' && data ? (
            <section className="apple-card overflow-hidden">
              <div className="border-b border-black/10 p-5">
                <h2 className="text-xl font-black text-apple-gray-900">教练管理</h2>
                <p className="mt-1 text-sm text-apple-gray-600">管理员可以授予或取消教练权限；admin 角色不会在这里被降级。</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="bg-apple-gray-100 text-apple-gray-600">
                    <tr>
                      {['姓名', '邮箱', '权限状态', '绑定学员数', '负责课程', '创建时间', '操作'].map((header) => (
                        <th key={header} className="px-4 py-3 font-bold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {data.coaches.map((coach) => (
                      <tr key={coach.id}>
                        <td className="px-4 py-4 font-bold text-apple-gray-900">{coach.name}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{coach.email || '-'}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${coach.coachEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-apple-gray-100 text-apple-gray-600'}`}>
                            {coach.role === 'admin' ? '管理员' : coach.coachEnabled ? '教练已启用' : '未启用'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-apple-gray-700">{coach.boundStudentCount}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{coach.courses || '暂无资料'}</td>
                        <td className="px-4 py-4 text-apple-gray-600">{formatDate(coach.createdAt)}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={coach.role === 'admin' || updatingId === coach.id}
                            onClick={() => runAction(coach.id, { action: 'set_coach_role', userId: coach.id, enabled: !coach.coachEnabled })}
                            className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {coach.coachEnabled ? '取消教练权限' : '授予教练权限'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeTab === 'orders' && data ? (
            <section className="grid gap-4">
              {data.orders.length === 0 ? (
                <div className="apple-card p-10 text-center text-apple-gray-600">暂无课程付款订单。</div>
              ) : data.orders.map((order) => (
                <article key={order.id} className="apple-card p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                        <span className="text-xs font-semibold text-apple-gray-500">{formatDate(order.submittedAt)}</span>
                      </div>
                      <h2 className="text-2xl font-black text-apple-gray-900">{order.studentName}</h2>
                      <p className="mt-2 text-sm text-apple-gray-600">{order.email || '未填写邮箱'}</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        disabled={updatingId === order.id || order.status === 'approved'}
                        onClick={() => runAction(order.id, { action: 'review_order', orderId: order.id, status: 'approved' })}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        核准通过
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === order.id || order.status === 'rejected'}
                        onClick={() => runAction(order.id, { action: 'review_order', orderId: order.id, status: 'rejected' })}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        标记异常
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    {[
                      ['报名课程', order.courseName],
                      ['应付金额', order.amountText],
                      ['银行后五码', order.transferLastFive],
                      ['备注', order.notes || order.reviewNote || '暂无备注'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-apple-gray-100 p-4">
                        <p className="text-xs font-semibold text-apple-gray-500">{label}</p>
                        <p className="mt-2 break-words text-sm font-bold text-apple-gray-900">{value || '-'}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {!tabs.find((tab) => tab.id === activeTab)?.ready ? (
            <section className="apple-card p-10 text-center">
              <Settings className="mx-auto h-10 w-10 text-apple-gray-400" />
              <h2 className="mt-4 text-2xl font-black text-apple-gray-900">后续阶段开放</h2>
              <p className="mt-2 text-apple-gray-600">这个入口已预留，第一阶段先保证管理员权限、学员、教练和订单审核可用。</p>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  )
}
