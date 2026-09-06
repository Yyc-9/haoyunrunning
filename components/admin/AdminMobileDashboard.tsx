'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CalendarRange,
  Landmark,
  LayoutDashboard,
  Menu,
  PanelsTopLeft,
  Search,
  UserCog,
  UsersRound,
  X,
} from 'lucide-react'
import AdminBankReconciliation from '@/components/admin/AdminBankReconciliation'
import AdminCoachDuty from '@/components/admin/AdminCoachDuty'
import AdminContentManager from '@/components/admin/AdminContentManager'
import AdminEnrollmentAnalytics from '@/components/admin/AdminEnrollmentAnalytics'
import AdminProductWorkspace from '@/components/admin/AdminProductWorkspace'
import type {
  AdminDashboardPayload,
  AdminOrder,
  AdminStudent,
  PaymentAccount,
} from '@/app/admin/AdminDashboardClient'
import type { ProductEditState } from '@/lib/admin-products'
import { paymentOrderStatusLabels, type PaymentOrderStatus } from '@/lib/payment'
import './admin-mobile-dashboard.css'

type MobileView = 'overview' | 'reconciliation' | 'students' | 'coaches' | 'seasons' | 'products' | 'content' | 'paymentAccounts'
type StudentDetailTab = 'course' | 'payments' | 'feedback' | 'notes'
type StudentFilter = 'all' | 'plan' | 'coach' | 'payment'
type MobileAction = (id: string, action: Record<string, unknown>) => Promise<boolean>

type Props = {
  data: AdminDashboardPayload
  runAction: MobileAction
  updatingId: string
  actionMessage: string
  actionError: string
}

const statusLabels = paymentOrderStatusLabels['zh-TW']

const titles: Record<MobileView, string> = {
  overview: '營運總覽',
  reconciliation: '銀行對帳',
  students: '學員管理',
  coaches: '教練管理',
  seasons: '季度管理',
  products: '商城商品',
  content: '內容中心',
  paymentAccounts: '收款帳戶',
}

function formatDate(value: string | null | undefined) {
  if (!value) return '暫無資料'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '暫無資料'
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function waitLabel(value: string | null | undefined) {
  if (!value) return '等待時間未知'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return '等待時間未知'
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000))
  if (hours < 1) return '剛剛提交'
  if (hours < 24) return `等待 ${hours} 小時`
  return `等待 ${Math.floor(hours / 24)} 天`
}

function studentInitial(student: AdminStudent) {
  return student.name.trim().slice(0, 1) || student.email.trim().slice(0, 1).toUpperCase() || '?'
}

function studentOrders(student: AdminStudent, orders: AdminOrder[]) {
  const email = student.email.trim().toLowerCase()
  if (!email) return []
  return orders.filter((order) => order.email.trim().toLowerCase() === email)
}

function accountMask(account: PaymentAccount) {
  const number = account.account_number || ''
  if (number.length <= 4) return number
  return `${number.slice(0, 4)} ${'•'.repeat(Math.max(2, number.length - 8))} ${number.slice(-4)}`
}

export default function AdminMobileDashboard({ data, runAction, updatingId, actionMessage, actionError }: Props) {
  const dashboardRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<MobileView>('overview')
  const [moreOpen, setMoreOpen] = useState(false)
  const [studentQuery, setStudentQuery] = useState('')
  const [studentFilter, setStudentFilter] = useState<StudentFilter>('all')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentTab, setStudentTab] = useState<StudentDetailTab>('course')
  const [bindOpen, setBindOpen] = useState(false)
  const [bindCoachId, setBindCoachId] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountForm, setAccountForm] = useState({
    label: '',
    accountName: '',
    bankName: '',
    bankCode: '',
    accountNumber: '',
    weight: '1',
  })
  const [mobileMessage, setMobileMessage] = useState('')
  const [mobileError, setMobileError] = useState('')
  const [productEditState, setProductEditState] = useState<ProductEditState>({ dirty: false, busy: false })
  const [seasonSection, setSeasonSection] = useState<'students' | 'settings'>('students')

  const pendingOrders = useMemo(
    () => data.orders.filter((order) => order.status === 'pending_review'),
    [data.orders]
  )
  const pendingCourseCount = pendingOrders.filter((order) => order.orderKind === 'course').length
  const pendingShopCount = pendingOrders.filter((order) => order.orderKind === 'shop').length
  const longestPending = pendingOrders.reduce<AdminOrder | null>((longest, order) => {
    if (!longest) return order
    return new Date(order.submittedAt).getTime() < new Date(longest.submittedAt).getTime() ? order : longest
  }, null)
  const anomalyCount = data.overview.openAttendanceAnomalyCount ?? 0
  const paidWithoutPlanCount = data.students.filter((student) => student.paymentStatus === 'approved' && !student.planEnabled).length
  const withoutCoachCount = data.students.filter((student) => student.bindings.length === 0).length
  const attentionStudentCount = data.students.filter((student) => (
    (student.paymentStatus === 'approved' && !student.planEnabled) || student.bindings.length === 0
  )).length
  const recruitingSeasonIds = new Set(data.courseSeasons.filter((season) => season.status === 'enrolling').map((season) => season.id))
  const recruitingClassCount = new Set(
    data.courseCapacity
      .filter((course) => recruitingSeasonIds.has(course.seasonId))
      .map((course) => `${course.seasonId}:${course.slug}`)
  ).size
  const selectedStudent = data.students.find((student) => student.id === selectedStudentId) ?? null
  const selectedStudentOrders = selectedStudent ? studentOrders(selectedStudent, data.orders) : []

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase()
    return data.students.filter((student) => {
      if (studentFilter === 'plan' && student.planEnabled) return false
      if (studentFilter === 'coach' && student.bindings.length > 0) return false
      if (studentFilter === 'payment' && student.paymentStatus !== 'pending_review') return false
      if (!query) return true
      return [student.name, student.email, student.program, student.paymentCourse, student.paymentStatus, student.boundCoachNames]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    })
  }, [data.students, studentFilter, studentQuery])

  useEffect(() => {
    if (!moreOpen && !bindOpen && !accountOpen) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableElements = () => Array.from(
      dashboardRef.current?.querySelectorAll<HTMLElement>(
        '.admin-mobile-sheet button:not([disabled]), .admin-mobile-sheet input:not([disabled]), .admin-mobile-sheet select:not([disabled]), .admin-mobile-sheet textarea:not([disabled]), .admin-mobile-sheet [href], .admin-mobile-sheet [tabindex]:not([tabindex="-1"])'
      ) ?? []
    )
    const closeSheets = () => {
      setMoreOpen(false)
      setBindOpen(false)
      setAccountOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSheets()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = focusableElements()
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.classList.add('admin-mobile-sheet-open')
    const frame = window.requestAnimationFrame(() => focusableElements()[0]?.focus())
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.classList.remove('admin-mobile-sheet-open')
      document.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => previousFocus?.focus())
    }
  }, [accountOpen, bindOpen, moreOpen])

  useEffect(() => {
    if (!mobileMessage && !mobileError) return
    const timer = window.setTimeout(() => {
      setMobileMessage('')
      setMobileError('')
    }, 4500)
    return () => window.clearTimeout(timer)
  }, [mobileError, mobileMessage])

  useEffect(() => {
    setBindCoachId('')
  }, [selectedStudentId])

  function navigate(nextView: MobileView) {
    if (view === 'products' && nextView !== 'products') {
      if (productEditState.busy) {
        setMobileError('商品正在儲存，完成後才能離開。')
        return false
      }
      if (productEditState.dirty && !window.confirm('商品仍有未儲存變更，確定要放棄並離開嗎？')) return false
      setProductEditState({ dirty: false, busy: false })
    }
    setMoreOpen(false)
    setView(nextView)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    contentRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    return true
  }

  function openStudent(student: AdminStudent) {
    setSelectedStudentId(student.id)
    setStudentTab('course')
    navigate('students')
  }

  async function mobileAction(id: string, action: Record<string, unknown>) {
    setMobileError('')
    setMobileMessage('')
    const success = await runAction(id, action)
    if (success) setMobileMessage('操作已完成。')
    else setMobileError('操作未完成，請查看錯誤提示後再試一次。')
    return success
  }

  async function addBinding() {
    if (!selectedStudent || !bindCoachId) {
      setMobileError('請先選擇要新增綁定的教練。')
      return
    }
    const success = await mobileAction(`bind-${selectedStudent.id}-${bindCoachId}`, {
      action: 'bind_student',
      studentId: selectedStudent.id,
      coachId: bindCoachId,
    })
    if (success) setBindCoachId('')
  }

  async function removeBinding(bindingId: string) {
    await mobileAction(`unbind-${bindingId}`, { action: 'unbind_student', bindingId })
  }

  async function createPaymentAccount() {
    if (!accountForm.label.trim() || !accountForm.accountName.trim() || !accountForm.bankName.trim() || !accountForm.accountNumber.trim()) {
      setMobileError('請填寫通道名稱、戶名、銀行名稱與收款帳號。')
      return
    }
    const success = await mobileAction('create-payment-account', {
      action: 'create_payment_account',
      label: accountForm.label,
      accountName: accountForm.accountName,
      bankName: accountForm.bankName,
      bankCode: accountForm.bankCode,
      accountNumber: accountForm.accountNumber,
      weight: Number(accountForm.weight || 1),
    })
    if (!success) return
    setAccountOpen(false)
    setAccountForm({ label: '', accountName: '', bankName: '', bankCode: '', accountNumber: '', weight: '1' })
  }

  const currentTitle = selectedStudent && view === 'students' ? '學員詳情' : titles[view]
  const navActive = view === 'seasons' || view === 'products' || view === 'content' || view === 'paymentAccounts' ? 'more' : view

  return (
    <section ref={dashboardRef} className="admin-mobile-dashboard" aria-label="手機管理員後台">
      <header className="admin-mobile-topbar">
        <div className="admin-mobile-brandmark" aria-label="好運跑班">好運</div>
        <div className="admin-mobile-topcopy">
          <strong>{currentTitle}</strong>
          <small>{actionError ? '同步異常，請查看提示' : '正式資料已連線'}</small>
        </div>
        <button type="button" className="admin-mobile-iconbutton" aria-label="開啟更多管理功能" onClick={() => setMoreOpen(true)}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div ref={contentRef} className="admin-mobile-content">
        {view === 'overview' ? (
          <section className="admin-mobile-screen">
            <div className="admin-mobile-eyeline"><span>{new Intl.DateTimeFormat('zh-TW', { month: '2-digit', day: '2-digit', weekday: 'short' }).format(new Date())}</span><span>即時資料</span></div>
            <h1 className="admin-mobile-hero">今天先處理 {pendingOrders.length + anomalyCount + attentionStudentCount} 件事</h1>
            <p className="admin-mobile-subtitle">依等待時間與營運影響排序，完成後會自動移到紀錄。</p>
            <div className="admin-mobile-sectionhead"><h2>待處理</h2><span>最急的排前面</span></div>
            <div className="admin-mobile-stack">
              <button type="button" className="admin-mobile-task" data-tone="warning" onClick={() => navigate('reconciliation')}>
                <div className="admin-mobile-task-grid"><span className="admin-mobile-task-icon"><Landmark className="h-5 w-5" aria-hidden="true" /></span><span><h3>待核對匯款</h3><p>課程 {pendingCourseCount} 筆 · 商城 {pendingShopCount} 筆</p></span><span className="admin-mobile-task-value">{pendingOrders.length}</span></div>
                <div className="admin-mobile-task-note"><span>{longestPending ? `最久${waitLabel(longestPending.submittedAt)}` : '目前沒有待核對款項'}</span><strong>開始核對 →</strong></div>
              </button>
              <button type="button" className="admin-mobile-task" data-tone="danger" onClick={() => navigate('coaches')}>
                <div className="admin-mobile-task-grid"><span className="admin-mobile-task-icon"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span><span><h3>排班與簽到異常</h3><p>未簽到、代班與人工修正待處理</p></span><span className="admin-mobile-task-value">{anomalyCount}</span></div>
              </button>
              <button type="button" className="admin-mobile-task" onClick={() => navigate('students')}>
                <div className="admin-mobile-task-grid"><span className="admin-mobile-task-icon"><UsersRound className="h-5 w-5" aria-hidden="true" /></span><span><h3>學員待處理（去重）</h3><p>已確認付款但課表待開通 {paidWithoutPlanCount} 位 · 未綁教練 {withoutCoachCount} 位（同一學員可能同時符合）</p></span><span className="admin-mobile-task-value">{attentionStudentCount}</span></div>
              </button>
            </div>

            <div className="admin-mobile-sectionhead"><h2>營運概況</h2><span>本季度</span></div>
            <div className="admin-mobile-metrics">
              <article className="admin-mobile-metric"><small>學員總數</small><strong>{data.overview.studentCount}</strong><em>目前帳號</em></article>
              <article className="admin-mobile-metric"><small>招生班級</small><strong>{recruitingClassCount}</strong><em>招生中季度課程</em></article>
              <article className="admin-mobile-metric"><small>已確認入帳</small><strong>{data.overview.approvedOrderCount}</strong><em>已完成核對</em></article>
              <article className="admin-mobile-metric" data-tone="warning"><small>低庫存商品</small><strong>{data.overview.lowStockCount}</strong><em>需要補貨</em></article>
            </div>
          </section>
        ) : null}

        {view === 'reconciliation' ? (
          <section className="admin-mobile-screen admin-mobile-external">
            <div className="admin-mobile-backrow"><button type="button" className="admin-mobile-back" onClick={() => navigate('overview')}><ArrowLeft className="h-4 w-4" />返回總覽</button></div>
            <AdminBankReconciliation paymentAccounts={data.paymentAccounts} />
          </section>
        ) : null}

        {view === 'students' && !selectedStudent ? (
          <section className="admin-mobile-screen">
            <div className="admin-mobile-eyeline"><span>學員管理</span><span>共 {data.students.length} 位</span></div>
            <h1 className="admin-mobile-page-title">快速找到學員</h1>
            <div className="admin-mobile-toolbar">
              <label className="admin-mobile-search"><Search aria-hidden="true" /><input aria-label="搜尋學員" value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="姓名、信箱、教練或課程" /></label>
              <div className="admin-mobile-chiprow" role="tablist" aria-label="學員篩選">
                {([['all', '全部'], ['plan', '待開通課表'], ['coach', '未綁教練'], ['payment', '匯款待核對']] as const).map(([id, label]) => <button type="button" role="tab" aria-selected={studentFilter === id} key={id} className="admin-mobile-chip" data-active={studentFilter === id} onClick={() => setStudentFilter(id)}>{label}</button>)}
              </div>
            </div>
            <div className="admin-mobile-stack">
              {filteredStudents.map((student) => {
                const statusTone = student.paymentStatus === 'pending_review' ? 'wait' : student.planEnabled ? 'ok' : 'wait'
                return <article key={student.id} className="admin-mobile-card admin-mobile-student-card">
                  <div className="admin-mobile-cardtop"><div className="admin-mobile-identity"><span className="admin-mobile-avatar">{studentInitial(student)}</span><div><h3>{student.name}</h3><p>{student.email || '未提供信箱'}</p></div></div><span className="admin-mobile-status" data-tone={statusTone}>{student.paymentStatus === 'pending_review' ? '匯款待核對' : student.planEnabled ? '課表已開通' : '課表待處理'}</span></div>
                  <div className="admin-mobile-info"><div className="admin-mobile-info-line"><span>報名課程</span><strong>{student.program || student.paymentCourse || '尚無課程'}</strong></div><div className="admin-mobile-info-line"><span>綁定教練</span><strong>{student.boundCoachNames || '尚未綁定'}</strong></div><div className="admin-mobile-info-line"><span>付款狀態</span><strong>{statusLabels[student.paymentStatus as PaymentOrderStatus] || student.paymentStatus}</strong></div><div className="admin-mobile-info-line"><span>最近回饋</span><strong>{formatDate(student.lastFeedbackAt)}</strong></div></div>
                  <div className="admin-mobile-student-actions"><button type="button" className="admin-mobile-button" onClick={() => openStudent(student)}>查看資料</button><button type="button" className="admin-mobile-button" onClick={() => { setSelectedStudentId(student.id); setBindCoachId(''); setBindOpen(true) }}>調整教練</button></div>
                </article>
              })}
              {!filteredStudents.length ? <p className="admin-mobile-boundary">沒有符合條件的學員。</p> : null}
            </div>
          </section>
        ) : null}

        {view === 'students' && selectedStudent ? (
          <section className="admin-mobile-screen">
            <div className="admin-mobile-backrow"><button type="button" className="admin-mobile-back" onClick={() => { setSelectedStudentId(''); navigate('students') }}><ArrowLeft className="h-4 w-4" />返回學員列表</button><span className="admin-mobile-status" data-tone="ok">帳號資料</span></div>
            <article className="admin-mobile-card admin-mobile-detail-card"><div className="admin-mobile-detail-head"><span className="admin-mobile-detail-avatar">{studentInitial(selectedStudent)}</span><div><h2>{selectedStudent.name}</h2><p>{selectedStudent.email || '未提供信箱'}</p></div></div><div className="admin-mobile-info"><div className="admin-mobile-info-line"><span>加入時間</span><strong>{formatDate(selectedStudent.createdAt)}</strong></div><div className="admin-mobile-info-line"><span>課表權限</span><strong>{selectedStudent.planEnabled ? '已開通' : '尚未開通'}</strong></div></div></article>
            <div className="admin-mobile-tabs" role="tablist" aria-label="學員詳情頁籤">{([['course', '課程與權限'], ['payments', '付款紀錄'], ['feedback', '訓練回饋'], ['notes', '備註']] as const).map(([id, label]) => <button type="button" role="tab" aria-selected={studentTab === id} key={id} className="admin-mobile-tab" data-active={studentTab === id} onClick={() => setStudentTab(id)}>{label}</button>)}</div>
            <div className="admin-mobile-stack" style={{ marginTop: 10 }}>
              {studentTab === 'course' ? <>
                <article className="admin-mobile-card admin-mobile-detail-card"><div className="admin-mobile-sectionhead" style={{ marginTop: 0 }}><h2>目前課程</h2><span>{statusLabels[selectedStudent.paymentStatus as PaymentOrderStatus] || selectedStudent.paymentStatus}</span></div><div className="admin-mobile-detail-list"><div className="admin-mobile-detail-line"><span>報名課程</span><strong>{selectedStudent.program || selectedStudent.paymentCourse || '尚無課程'}</strong></div><div className="admin-mobile-detail-line"><span>綁定教練</span><strong>{selectedStudent.boundCoachNames || '尚未綁定'}</strong></div><div className="admin-mobile-detail-line"><span>最近回饋</span><strong>{formatDate(selectedStudent.lastFeedbackAt)}</strong></div></div></article>
                <article className="admin-mobile-card admin-mobile-detail-card"><div className="admin-mobile-sectionhead" style={{ marginTop: 0 }}><h2>教練與課表權限</h2><button type="button" className="admin-mobile-back" onClick={() => setBindOpen(true)}>調整教練</button></div><div className="admin-mobile-detail-list"><div className="admin-mobile-detail-line"><span>目前教練</span><strong>{selectedStudent.boundCoachNames || '尚未綁定'}</strong></div><div className="admin-mobile-detail-line"><span>課表權限</span><strong>{selectedStudent.planEnabled ? '已開通（由現有付款／課表資料判定）' : '尚未開通'}</strong></div></div><div className="admin-mobile-boundary"><strong>目前可用範圍：</strong>後台目前沒有獨立編輯學員資料或切換課表權限的操作；此處保留真實狀態與教練綁定功能，不顯示未實際完成的切換。</div></article>
              </> : null}
              {studentTab === 'payments' ? <article className="admin-mobile-card admin-mobile-detail-card"><div className="admin-mobile-sectionhead" style={{ marginTop: 0 }}><h2>付款紀錄</h2><span>{selectedStudentOrders.length} 筆</span></div>{selectedStudentOrders.length ? <div className="admin-mobile-detail-list">{selectedStudentOrders.slice(0, 8).map((order) => <div key={`${order.orderKind}-${order.id}`} className="admin-mobile-detail-line"><span>{formatDate(order.submittedAt)}</span><strong>{order.amountText} · {order.orderNumber}<br />{order.orderKind === 'shop' ? order.items.join('、') : order.courseName || '課程報名'}<br />{statusLabels[order.status] || order.status}</strong></div>)}</div> : <p className="admin-mobile-boundary">目前沒有與此信箱相符的付款紀錄。</p>}</article> : null}
              {studentTab === 'feedback' ? <article className="admin-mobile-card admin-mobile-detail-card"><div className="admin-mobile-sectionhead" style={{ marginTop: 0 }}><h2>訓練回饋</h2></div><div className="admin-mobile-detail-line"><span>最近回饋</span><strong>{formatDate(selectedStudent.lastFeedbackAt)}</strong></div><div className="admin-mobile-boundary"><strong>目前可用範圍：</strong>這裡只提供最近回饋時間；完整內容請到既有教練／學員頁面查看。</div></article> : null}
              {studentTab === 'notes' ? <article className="admin-mobile-card admin-mobile-detail-card"><div className="admin-mobile-sectionhead" style={{ marginTop: 0 }}><h2>管理員備註</h2></div><div className="admin-mobile-boundary"><strong>目前可用範圍：</strong>後台目前沒有提供備註欄位的儲存功能，因此手機端暫不提供可能無法保留的輸入框。</div></article> : null}
            </div>
          </section>
        ) : null}

        {view === 'coaches' ? <section className="admin-mobile-screen admin-mobile-external"><div className="admin-mobile-backrow"><button type="button" className="admin-mobile-back" onClick={() => navigate('overview')}><ArrowLeft className="h-4 w-4" />返回總覽</button></div><div className="admin-mobile-coach"><AdminCoachDuty /></div></section> : null}

        {view === 'seasons' ? <section className="admin-mobile-screen admin-mobile-external"><div className="admin-mobile-backrow"><button type="button" className="admin-mobile-back" onClick={() => navigate('overview')}><ArrowLeft className="h-4 w-4" />返回總覽</button></div><div className="admin-mobile-segmented" role="tablist" aria-label="季度管理分段"><button type="button" role="tab" aria-selected={seasonSection === 'students'} data-active={seasonSection === 'students'} onClick={() => setSeasonSection('students')}>學員與統計</button><button type="button" role="tab" aria-selected={seasonSection === 'settings'} data-active={seasonSection === 'settings'} onClick={() => setSeasonSection('settings')}>季度設定</button></div>{seasonSection === 'students' ? <div className="admin-mobile-enrollment"><AdminEnrollmentAnalytics orders={data.orders} courseCapacity={data.courseCapacity} seasons={data.courseSeasons} syncSources={data.seasonSyncSources} runAction={mobileAction} updatingId={updatingId} /></div> : <div className="admin-mobile-content-manager"><AdminContentManager content={data.siteContent} courses={data.courses} seasons={data.courseSeasons} scope="seasons" runAction={mobileAction} /></div>}</section> : null}
        {view === 'products' ? <section className="admin-mobile-screen admin-mobile-external"><div className="admin-mobile-backrow"><button type="button" className="admin-mobile-back" onClick={() => navigate('overview')}><ArrowLeft className="h-4 w-4" />返回總覽</button></div><div className="admin-mobile-product"><AdminProductWorkspace products={data.products} runAction={mobileAction} onStateChange={setProductEditState} /></div><div className="admin-mobile-boundary"><strong>未儲存保護：</strong>{productEditState.dirty ? '目前商品有未儲存變更，請先儲存或放棄後再離開。' : '商品編輯器沿用現有圖片裁切、規格、上下架與刪除保護。'}</div></section> : null}
        {view === 'content' ? <section className="admin-mobile-screen admin-mobile-external"><div className="admin-mobile-backrow"><button type="button" className="admin-mobile-back" onClick={() => navigate('overview')}><ArrowLeft className="h-4 w-4" />返回總覽</button></div><AdminContentManager content={data.siteContent} courses={data.courses} seasons={data.courseSeasons} scope="content" runAction={mobileAction} /></section> : null}

        {view === 'paymentAccounts' ? <section className="admin-mobile-screen"><div className="admin-mobile-backrow"><button type="button" className="admin-mobile-back" onClick={() => navigate('overview')}><ArrowLeft className="h-4 w-4" />返回總覽</button><button type="button" className="admin-mobile-back" onClick={() => setAccountOpen(true)}>＋ 新增</button></div><h1 className="admin-mobile-page-title">收款帳戶</h1><p className="admin-mobile-subtitle">管理課程與商城匯款使用的官方帳戶；內部權重不會顯示給學員。</p><div className="admin-mobile-stack" style={{ marginTop: 14 }}>{data.paymentAccounts.map((account) => <article key={account.id} className="admin-mobile-card admin-mobile-detail-card"><div className="admin-mobile-cardtop"><div><span className="admin-mobile-status" data-tone={account.active ? 'ok' : 'wait'}>{account.active ? '啟用中' : '已停用'}</span><h2 style={{ margin: '7px 0 0', color: '#092d3a', fontSize: 16 }}>{account.label}</h2><p className="admin-mobile-subtitle" style={{ marginTop: 4 }}>{account.bank_name}{account.bank_code ? `（${account.bank_code}）` : ''} · {account.account_name}</p></div><span className="admin-mobile-status">權重 {account.weight}</span></div><div className="admin-mobile-boundary" style={{ marginTop: 12, color: '#092d3a', fontSize: 13, fontWeight: 900 }}>{accountMask(account)}</div><div className="admin-mobile-cardtop" style={{ marginTop: 10 }}><span className="admin-mobile-subtitle" style={{ margin: 0 }}>最近分配：{formatDate(account.last_assigned_at)}</span><button type="button" className="admin-mobile-button" disabled={updatingId === `account-${account.id}`} onClick={() => void mobileAction(`account-${account.id}`, { action: 'toggle_payment_account', accountId: account.id, active: !account.active })}>{account.active ? '停用' : '啟用'}</button></div></article>)}</div><button type="button" className="admin-mobile-button" data-tone="primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setAccountOpen(true)}>＋ 新增收款帳戶</button></section> : null}
      </div>

      <nav className="admin-mobile-bottomnav" aria-label="管理員主要導航">
        {([['overview', '總覽', LayoutDashboard], ['reconciliation', '對帳', Landmark], ['students', '學員', UsersRound], ['coaches', '教練', UserCog], ['more', '更多', Menu]] as const).map(([id, label, Icon]) => {
          const active = navActive === id
          return <button type="button" key={id} className="admin-mobile-navbutton" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => id === 'more' ? setMoreOpen(true) : navigate(id as MobileView)}><span><Icon className="h-5 w-5" aria-hidden="true" /></span><span>{label}</span></button>
        })}
      </nav>

      {moreOpen ? <div className="admin-mobile-sheet-layer" role="dialog" aria-modal="true" aria-labelledby="admin-mobile-more-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoreOpen(false) }}><section className="admin-mobile-sheet"><div className="admin-mobile-sheet-handle" /><div className="admin-mobile-sheet-head"><div><h2 id="admin-mobile-more-title">更多管理功能</h2><p>季度、商品、內容與收款帳戶集中在這裡。</p></div><button type="button" className="admin-mobile-iconbutton" aria-label="關閉更多管理功能" onClick={() => setMoreOpen(false)}><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="admin-mobile-sheet-grid"><button type="button" className="admin-mobile-more-item" onClick={() => navigate('seasons')}><CalendarRange className="h-5 w-5" aria-hidden="true" /><strong>季度管理</strong><small>招生季度、課程與統計</small></button><button type="button" className="admin-mobile-more-item" onClick={() => navigate('products')}><Boxes className="h-5 w-5" aria-hidden="true" /><strong>商城商品</strong><small>內容、規格、庫存與上下架</small></button><button type="button" className="admin-mobile-more-item" onClick={() => navigate('content')}><PanelsTopLeft className="h-5 w-5" aria-hidden="true" /><strong>內容中心</strong><small>首頁、公開頁面與教練資料</small></button><button type="button" className="admin-mobile-more-item" onClick={() => navigate('paymentAccounts')}><Landmark className="h-5 w-5" aria-hidden="true" /><strong>收款帳戶</strong><small>通道、權重與啟用狀態</small></button></div></section></div> : null}

      {bindOpen && selectedStudent ? <div className="admin-mobile-sheet-layer" role="dialog" aria-modal="true" aria-labelledby="admin-mobile-bind-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setBindOpen(false) }}><section className="admin-mobile-sheet"><div className="admin-mobile-sheet-handle" /><div className="admin-mobile-sheet-head"><div><h2 id="admin-mobile-bind-title">新增或解除綁定教練</h2><p>{selectedStudent.name} · 可同時保留多位已綁定教練，請逐筆管理。</p></div><button type="button" className="admin-mobile-iconbutton" aria-label="關閉教練綁定管理" onClick={() => setBindOpen(false)}><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="admin-mobile-bindings"><div className="admin-mobile-bindings-head"><h3>目前已綁定教練</h3><span>{selectedStudent.bindings.length} 位</span></div>{selectedStudent.bindings.length ? <div className="admin-mobile-bindings-list">{selectedStudent.bindings.map((binding) => <div key={binding.id} className="admin-mobile-binding-row"><div className="min-w-0"><strong>{binding.coachName}</strong><span>{binding.coachEmail || '未提供信箱'}</span></div><button type="button" className="admin-mobile-button" data-tone="danger" disabled={updatingId === 'unbind-' + binding.id} onClick={() => void removeBinding(binding.id)}>{updatingId === 'unbind-' + binding.id ? '處理中…' : '解除目前綁定'}</button></div>)}</div> : <p className="admin-mobile-boundary">目前尚未綁定教練。</p>}</div><div className="admin-mobile-form"><label className="admin-mobile-field"><span>新增綁定教練</span><select className="admin-mobile-control" value={bindCoachId} onChange={(event) => setBindCoachId(event.target.value)}><option value="">選擇教練</option>{data.coachOptions.filter((coach) => !selectedStudent.bindings.some((binding) => binding.coachId === coach.id)).map((coach) => <option key={coach.id} value={coach.id}>{coach.name || coach.email}</option>)}</select></label><div className="admin-mobile-notice"><strong>操作說明：</strong>新增會保留目前其他綁定；解除只會取消你選定的那一位教練。</div></div><div className="admin-mobile-sheet-actions"><button type="button" className="admin-mobile-button" onClick={() => setBindOpen(false)}>關閉</button><button type="button" className="admin-mobile-button" data-tone="accent" disabled={!bindCoachId || Boolean(updatingId)} onClick={() => void addBinding()}>新增綁定</button></div></section></div> : null}

      {accountOpen ? <div className="admin-mobile-sheet-layer" role="dialog" aria-modal="true" aria-labelledby="admin-mobile-account-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountOpen(false) }}><section className="admin-mobile-sheet"><div className="admin-mobile-sheet-handle" /><div className="admin-mobile-sheet-head"><div><h2 id="admin-mobile-account-title">新增收款帳戶</h2><p>建立後加入對帳帳戶池，可隨時停用。</p></div><button type="button" className="admin-mobile-iconbutton" aria-label="關閉新增收款帳戶" onClick={() => setAccountOpen(false)}><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="admin-mobile-form">{([['label', '通道名稱 *', '例如 A 帳戶'], ['accountName', '戶名 *', '輸入銀行戶名'], ['bankName', '銀行名稱 *', '銀行'], ['bankCode', '銀行代碼', '000'], ['accountNumber', '收款帳號 *', '輸入完整帳號'], ['weight', '分配權重', '1']] as const).map(([field, label, placeholder]) => <label key={field} className="admin-mobile-field"><span>{label}</span><input className="admin-mobile-control" value={accountForm[field]} onChange={(event) => setAccountForm((current) => ({ ...current, [field]: field === 'weight' ? event.target.value.replace(/\D/g, '') : event.target.value }))} placeholder={placeholder} inputMode={field === 'weight' || field === 'bankCode' || field === 'accountNumber' ? 'numeric' : undefined} /></label>)}</div><div className="admin-mobile-sheet-actions"><button type="button" className="admin-mobile-button" onClick={() => setAccountOpen(false)}>取消</button><button type="button" className="admin-mobile-button" data-tone="accent" disabled={Boolean(updatingId)} onClick={() => void createPaymentAccount()}>建立帳戶</button></div></section></div> : null}

      {actionMessage || actionError || mobileMessage || mobileError ? <div className="admin-mobile-notice" data-tone={actionError || mobileError ? 'error' : 'success'} role={actionError || mobileError ? 'alert' : 'status'} style={{ position: 'absolute', zIndex: 60, right: 14, bottom: 82, left: 14, boxShadow: '0 10px 30px rgba(9,45,58,.12)' }}>{actionError || mobileError || actionMessage || mobileMessage}</div> : null}
    </section>
  )
}
