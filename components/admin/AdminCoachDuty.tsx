'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, Loader2, RefreshCw, ShieldCheck, UserRoundCheck, X } from 'lucide-react'
import type { AcceptanceTestPhase } from '@/lib/attendance-acceptance-test'
import { supabase } from '@/lib/supabase'

type DutyItem = {
  id: string
  courseName: string
  courseSeasonCourseId: string
  sessionDate: string
  startTime: string
  scheduledCoachId: string
  scheduledCoachName: string
  actualCoachId: string
  actualCoachName: string
  coachRole: string
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
  leaveReason: string
  recommendedSubstituteName: string
  substituteCoachId: string
  substituteCoachName: string
  substituteResponse: 'none' | 'pending' | 'accepted' | 'rejected'
  adminStatus: string
  adminReason: string
  attendanceState: string
  checkedInAt: string
  manualCorrection: boolean
  salaryStatusLabel: string
  isCancelled: boolean
}

type CoachOption = { id: string; name: string; email: string }
type Audit = { assignment_id: string; action: string; reason: string; actor_profile_id: string; created_at: string }
type AcceptanceTest = {
  test: { dateLabel: string; timeLabel: string; timeZoneLabel: string }
  phase: AcceptanceTestPhase
  checkins: Array<{
    participantProfileId: string
    participantRole: 'coach' | 'student'
    checkedInAt: string
    name: string
    email: string
  }>
}

type CoachActionForm =
  | { kind: 'leave_review'; item: DutyItem; decision: 'approved' | 'rejected'; required: boolean }
  | { kind: 'assign_substitute'; item: DutyItem; required: boolean }
  | { kind: 'confirm_substitute'; item: DutyItem; emergency: boolean; required: boolean }

const attendanceLabel: Record<string, string> = {
  upcoming: '尚未開放', check_in_open: '待簽到', on_time: '準時', late: '遲到',
  not_checked_in: '應到未簽到', substitute_absent: '代班未到', cancelled: '本堂停課',
  missing_start_time: '請補齊開始時間', leave_approved: '已請假，待安排代班',
}

function auditLabel(action: string) {
  const labels: Record<string, string> = {
    review_leave: '請假核對',
    leave_approved: '核准請假',
    leave_rejected: '拒絕請假',
    assign_substitute: '指定代班',
    substitute_assigned: '指定代班',
    confirm_substitute: '確認代班',
    substitute_confirmed: '確認代班',
    emergency_substitute_confirmed: '緊急確認代班',
    manual_correction: '人工修正出勤',
  }
  return labels[action] ?? '排班資料更新'
}

function taipeiYearMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return {
    year: parts.find((part) => part.type === 'year')?.value ?? String(new Date().getFullYear()),
    month: parts.find((part) => part.type === 'month')?.value ?? String(new Date().getMonth() + 1).padStart(2, '0'),
  }
}

function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', weekday: withTime ? undefined : 'short', hour: withTime ? '2-digit' : undefined, minute: withTime ? '2-digit' : undefined }).format(new Date(withTime ? value : `${value}T12:00:00+08:00`))
}

async function accessToken() {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
  return session.access_token
}

export default function AdminCoachDuty() {
  const currentPeriod = taipeiYearMonth()
  const [items, setItems] = useState<DutyItem[]>([])
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [acceptanceTest, setAcceptanceTest] = useState<AcceptanceTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [yearFilter, setYearFilter] = useState(currentPeriod.year)
  const [monthFilter, setMonthFilter] = useState(currentPeriod.month)
  const [courseFilter, setCourseFilter] = useState('all')
  const [coachFilter, setCoachFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [scheduleFilter, setScheduleFilter] = useState('all')
  const [substituteByItem, setSubstituteByItem] = useState<Record<string, string>>({})
  const [correctionItem, setCorrectionItem] = useState<DutyItem | null>(null)
  const [correctionState, setCorrectionState] = useState<'on_time' | 'late' | 'not_checked_in'>('not_checked_in')
  const [correctionReason, setCorrectionReason] = useState('')
  const correctionDialogRef = useRef<HTMLElement>(null)
  const [actionForm, setActionForm] = useState<CoachActionForm | null>(null)
  const [actionReason, setActionReason] = useState('')
  const actionDialogRef = useRef<HTMLElement>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/coach-duty', { cache: 'no-store', headers: { Authorization: `Bearer ${await accessToken()}` } })
      const payload = await response.json().catch(() => ({})) as { items?: DutyItem[]; coaches?: CoachOption[]; audits?: Audit[]; acceptanceTest?: AcceptanceTest; error?: string }
      if (!response.ok) throw new Error(payload.error || '讀取教練到課資料失敗。')
      setItems(payload.items ?? [])
      setCoaches(payload.coaches ?? [])
      setAudits(payload.audits ?? [])
      setAcceptanceTest(payload.acceptanceTest ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取教練到課資料失敗。')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => { void load(true) }, 45_000)
    return () => window.clearInterval(timer)
  }, [load])
  useEffect(() => {
    if (!correctionItem) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableElements = () => Array.from(
      correctionDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ) ?? []
    )
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setCorrectionItem(null)
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
    const frame = window.requestAnimationFrame(() => correctionDialogRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus())
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.classList.remove('admin-mobile-sheet-open')
      document.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => previousFocus?.focus())
    }
  }, [correctionItem])

  useEffect(() => {
    if (!actionForm) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableElements = () => Array.from(
      actionDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ) ?? []
    )
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setActionForm(null)
        setActionReason('')
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
    const frame = window.requestAnimationFrame(() => actionDialogRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus())
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.classList.remove('admin-mobile-sheet-open')
      document.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => previousFocus?.focus())
    }
  }, [actionForm])

  const yearOptions = [...new Set([currentPeriod.year, ...items.map((item) => item.sessionDate.slice(0, 4))])].sort((a, b) => b.localeCompare(a))
  const periodItems = useMemo(() => items.filter((item) => {
    if (yearFilter !== 'all' && item.sessionDate.slice(0, 4) !== yearFilter) return false
    if (monthFilter !== 'all' && item.sessionDate.slice(5, 7) !== monthFilter) return false
    return true
  }), [items, monthFilter, yearFilter])
  const summaries = [
    ['期間應到', periodItems.filter((item) => !item.isCancelled).length, 'text-black'],
    ['準時', periodItems.filter((item) => item.attendanceState === 'on_time').length, 'text-emerald-700'],
    ['遲到', periodItems.filter((item) => item.attendanceState === 'late').length, 'text-amber-700'],
    ['請假代班完成', periodItems.filter((item) => item.leaveStatus === 'approved' && item.actualCoachId && ['on_time', 'late'].includes(item.attendanceState)).length, 'text-blue-700'],
    ['待安排代班', periodItems.filter((item) => item.leaveStatus === 'approved' && !item.actualCoachId).length, 'text-amber-700'],
    ['應到未簽到', periodItems.filter((item) => item.attendanceState === 'not_checked_in').length, 'text-red-700'],
    ['代班未到', periodItems.filter((item) => item.attendanceState === 'substitute_absent').length, 'text-red-700'],
  ] as const

  const courseOptions = [...new Map(items.map((item) => [item.courseSeasonCourseId, item.courseName])).entries()]
  const scheduledCoachesBySession = useMemo(() => {
    const grouped = new Map<string, Array<{ id: string; name: string; role: string }>>()
    for (const item of items) {
      const key = `${item.courseSeasonCourseId}:${item.sessionDate}`
      const coachesForSession = grouped.get(key) ?? []
      if (!coachesForSession.some((coach) => coach.id === item.scheduledCoachId)) {
        coachesForSession.push({ id: item.scheduledCoachId, name: item.scheduledCoachName, role: item.coachRole })
      }
      grouped.set(key, coachesForSession)
    }
    const roleOrder: Record<string, number> = { head_coach: 0, coach: 1, assistant: 2, substitute: 3 }
    return new Map([...grouped.entries()].map(([key, sessionCoaches]) => [
      key,
      sessionCoaches
        .sort((left, right) => (roleOrder[left.role] ?? 9) - (roleOrder[right.role] ?? 9) || left.name.localeCompare(right.name, 'zh-Hant'))
        .map((coach) => coach.name),
    ]))
  }, [items])

  const filtered = useMemo(() => items.filter((item) => {
    if (yearFilter !== 'all' && item.sessionDate.slice(0, 4) !== yearFilter) return false
    if (monthFilter !== 'all' && item.sessionDate.slice(5, 7) !== monthFilter) return false
    if (courseFilter !== 'all' && item.courseSeasonCourseId !== courseFilter) return false
    if (coachFilter !== 'all' && ![item.scheduledCoachId, item.actualCoachId, item.substituteCoachId].includes(coachFilter)) return false
    const isSubstitute = Boolean(item.substituteCoachId || item.coachRole === 'substitute' || (item.actualCoachId && item.actualCoachId !== item.scheduledCoachId))
    if (scheduleFilter === 'leave' && item.leaveStatus === 'none') return false
    if (scheduleFilter === 'substitute' && !isSubstitute) return false
    if (scheduleFilter === 'regular' && (item.leaveStatus !== 'none' || isSubstitute)) return false
    if (statusFilter === 'anomaly' && !['not_checked_in', 'substitute_absent', 'missing_start_time'].includes(item.attendanceState) && !(item.leaveStatus === 'approved' && !item.actualCoachId)) return false
    if (statusFilter !== 'all' && statusFilter !== 'anomaly' && item.attendanceState !== statusFilter) return false
    return true
  }), [coachFilter, courseFilter, items, monthFilter, scheduleFilter, statusFilter, yearFilter])

  async function action(id: string, body: Record<string, unknown>) {
    setSaving(id)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/coach-duty', { method: 'PATCH', headers: { Authorization: 'Bearer ' + await accessToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ assignmentId: id, ...body }) })
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string }
      if (!response.ok) throw new Error(payload.error || '更新失敗。')
      setMessage(payload.message || '資料已更新。')
      await load()
      return true
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '更新失敗。')
      return false
    } finally {
      setSaving('')
    }
  }

  function courseHasStarted(item: DutyItem) {
    if (!item.startTime) return false
    const timestamp = new Date(`${item.sessionDate}T${item.startTime}:00+08:00`).getTime()
    return Number.isFinite(timestamp) && timestamp <= Date.now()
  }

  function openActionForm(form: CoachActionForm) {
    setActionForm(form)
    setActionReason('')
    setError('')
  }

  async function submitActionForm() {
    if (!actionForm) return
    const reason = actionReason.trim()
    if (actionForm.required && !reason) {
      setError('請填寫原因。')
      return
    }

    const body = actionForm.kind === 'leave_review'
      ? { action: 'review_leave', decision: actionForm.decision, reason }
      : actionForm.kind === 'assign_substitute'
        ? { action: 'assign_substitute', substituteCoachId: substituteByItem[actionForm.item.id] || actionForm.item.substituteCoachId, reason }
        : { action: 'confirm_substitute', emergency: actionForm.emergency, reason }
    const saved = await action(actionForm.item.id, body)
    if (saved) {
      setActionForm(null)
      setActionReason('')
    }
  }

  function openCorrection(item: DutyItem) {
    setCorrectionItem(item)
    setCorrectionState(item.attendanceState === 'late' ? 'late' : item.attendanceState === 'on_time' ? 'on_time' : 'not_checked_in')
    setCorrectionReason('')
    setError('')
  }

  async function saveCorrection() {
    if (!correctionItem) return
    const reason = correctionReason.trim()
    if (!reason) {
      setError('人工修正必須填寫原因。')
      return
    }
    const saved = await action(correctionItem.id, { action: 'manual_correction', attendanceState: correctionState, reason })
    if (saved) {
      setCorrectionItem(null)
      setCorrectionReason('')
    }
  }

  return (
    <>
      <details open className="group border-b border-black/10 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5"><div><div className="flex flex-wrap items-center gap-2"><UserRoundCheck className="h-5 w-5" /><h2 className="text-lg font-black">教練簽到、請假與代班</h2><span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-800">待處理 {periodItems.filter((item) => item.adminStatus === 'pending').length}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-800">代班待回覆 {periodItems.filter((item) => item.adminStatus === 'not_required' && item.substituteResponse === 'pending').length}</span><span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-800">異常 {periodItems.filter((item) => ['not_checked_in', 'substitute_absent', 'missing_start_time'].includes(item.attendanceState) || (item.leaveStatus === 'approved' && !item.actualCoachId)).length}</span></div><p className="mt-1 text-sm text-apple-gray-600">原教練可直接邀請代班；受邀教練接受後立即生效，管理員保留查看與修正權限。</p></div><ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" /></summary>
      <div className="border-t border-black/10 p-4 sm:p-5">
        {acceptanceTest && acceptanceTest.phase !== 'hidden' ? (
          <details open className="mb-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white"><ShieldCheck className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-black text-blue-700">網站驗收測試</p>
                  <p className="text-sm font-black text-blue-950">{acceptanceTest.test.dateLabel} · {acceptanceTest.test.timeLabel}（{acceptanceTest.test.timeZoneLabel}）</p>
                </div>
              </div>
              <div className="flex gap-2 text-xs font-black">
                <span className="rounded-full bg-white px-3 py-1.5 text-blue-800">教練 {acceptanceTest.checkins.filter((item) => item.participantRole === 'coach').length}</span>
                <span className="rounded-full bg-white px-3 py-1.5 text-blue-800">學員 {acceptanceTest.checkins.filter((item) => item.participantRole === 'student').length}</span>
              </div>
            </summary>
            <div className="border-t border-blue-200 p-4">
              <p className="mb-3 text-xs font-semibold leading-5 text-blue-800">測試期間每 30 秒自動更新；這些紀錄不會進入正式出勤、點名、課酬或季度統計。</p>
              {acceptanceTest.checkins.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {acceptanceTest.checkins.map((item) => (
                    <div key={`${item.participantRole}:${item.participantProfileId}`} className="flex items-center gap-2 rounded-lg bg-white p-3 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="min-w-0">
                        <p className="truncate font-black text-black">{item.name} · {item.participantRole === 'coach' ? '教練' : '學員'}</p>
                        <p className="truncate font-semibold text-apple-gray-500">{formatDate(item.checkedInAt, true)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="rounded-lg border border-dashed border-blue-200 bg-white p-6 text-center text-sm font-semibold text-blue-700">尚未有人完成測試簽到。</p>}
            </div>
          </details>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">{summaries.map(([label, value, tone]) => <div key={label} className="rounded-lg border border-black/10 bg-apple-gray-50 p-3"><p className={`text-xl font-black ${tone}`}>{value}</p><p className="mt-1 text-[11px] font-bold text-apple-gray-500">{label}</p></div>)}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-apple-gray-500">資料會每 45 秒自動更新；需要立即核對時可手動刷新。</p>
          <button type="button" onClick={() => void load()} disabled={loading} className="apple-button-outline gap-2 px-4 py-2 text-xs disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />刷新教練出勤</button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-[120px_130px_1fr_1fr_170px_150px]">
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="apple-input" aria-label="年份篩選">
            <option value="all">全部年份</option>
            {yearOptions.map((year) => <option key={year} value={year}>{year} 年</option>)}
          </select>
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="apple-input" aria-label="月份篩選">
            <option value="all">全部月份</option>
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((month) => <option key={month} value={month}>{Number(month)} 月</option>)}
          </select>
          <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="apple-input"><option value="all">全部課程</option>{courseOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          <select value={coachFilter} onChange={(event) => setCoachFilter(event.target.value)} className="apple-input"><option value="all">全部教練</option>{coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}</select>
          <select value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value)} className="apple-input"><option value="all">全部排班</option><option value="leave">只看請假</option><option value="substitute">只看代班</option><option value="regular">原定出勤</option></select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="apple-input"><option value="all">全部狀態</option><option value="anomaly">只看異常</option><option value="on_time">準時</option><option value="late">遲到</option><option value="not_checked_in">應到未簽到</option><option value="substitute_absent">代班未到</option><option value="missing_start_time">未設定時間</option></select>
        </div>
        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        <div className="mt-4 space-y-2">
          {loading && !items.length ? <p className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></p> : filtered.map((item) => {
            const latestAudit = audits.find((audit) => audit.assignment_id === item.id)
            const anomaly = ['not_checked_in', 'substitute_absent', 'missing_start_time'].includes(item.attendanceState) || (item.leaveStatus === 'approved' && !item.actualCoachId)
            const scheduledCoachNames = scheduledCoachesBySession.get(`${item.courseSeasonCourseId}:${item.sessionDate}`) ?? [item.scheduledCoachName]
            const isDirectInvitation = item.adminStatus === 'not_required' && Boolean(item.substituteCoachId)
            const isDirectSubstituteActive = isDirectInvitation
              && item.substituteResponse === 'accepted'
              && item.actualCoachId === item.substituteCoachId
            return <details key={item.id} className={`rounded-lg border ${anomaly ? 'border-red-200 bg-red-50/40' : 'border-black/10 bg-white'}`}><summary className="grid cursor-pointer list-none gap-2 p-3 text-sm md:grid-cols-[140px_minmax(0,1.3fr)_minmax(0,1.35fr)_minmax(0,1fr)_140px_130px] md:items-center"><span className="font-black">{formatDate(item.sessionDate)} {item.startTime || '未設定'}</span><span className="truncate font-bold">{item.courseName}</span><span className="break-words leading-5">原定：{scheduledCoachNames.join('、')}</span><span className="truncate">實際：{item.actualCoachName || '待安排'}</span><span className={`font-black ${anomaly ? 'text-red-700' : 'text-apple-gray-700'}`}>{attendanceLabel[item.attendanceState] || item.attendanceState}</span><span className="text-xs font-bold text-violet-700">{item.salaryStatusLabel}</span></summary><div className="border-t border-black/10 p-4">
              <div className="grid gap-2 text-xs font-semibold text-apple-gray-600 sm:grid-cols-2 lg:grid-cols-4"><p>本筆原定教練：{item.scheduledCoachName}</p><p>角色：{item.coachRole === 'substitute' ? '代班教練' : item.coachRole === 'head_coach' ? '主教練' : item.coachRole === 'assistant' ? '助教' : '教練'}</p><p>排班：{isDirectSubstituteActive ? '代班已接受並生效' : isDirectInvitation && item.substituteResponse === 'pending' ? '原教練已邀請，待代班回覆' : isDirectInvitation && item.substituteResponse === 'rejected' ? '代班已拒絕，待重新邀請' : item.leaveStatus === 'requested' ? '請假待核對' : item.leaveStatus === 'approved' ? '請假已核准' : item.leaveStatus === 'rejected' ? '請假已拒絕' : '原定排班'}</p><p>代班：{item.substituteCoachName ? `${item.substituteCoachName}（${item.substituteResponse === 'accepted' ? '已接受' : item.substituteResponse === 'rejected' ? '已拒絕' : '待回覆'}）` : '未安排'}</p><p>簽到：{item.checkedInAt ? `${formatDate(item.checkedInAt, true)}${item.manualCorrection ? '（人工修正）' : ''}` : '尚無記錄'}</p></div>
              {item.leaveReason ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-800">請假原因：{item.leaveReason}{item.recommendedSubstituteName ? `｜原教練邀請：${item.recommendedSubstituteName}` : ''}</p> : null}
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {item.leaveStatus === 'requested' && !isDirectInvitation ? <><button type="button" disabled={saving === item.id} onClick={() => openActionForm({ kind: 'leave_review', item, decision: 'approved', required: false })} className="min-h-11 rounded-lg bg-black px-3 py-2.5 text-xs font-bold text-white">核准請假</button><button type="button" disabled={saving === item.id} onClick={() => openActionForm({ kind: 'leave_review', item, decision: 'rejected', required: true })} className="min-h-11 rounded-lg border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-700">拒絕請假</button></> : null}
                {item.leaveStatus === 'approved' || item.leaveStatus === 'requested' ? <><select value={substituteByItem[item.id] ?? item.substituteCoachId} onChange={(event) => setSubstituteByItem((current) => ({ ...current, [item.id]: event.target.value }))} className="apple-input min-h-11 py-2 text-xs"><option value="">選擇代班教練</option>{coaches.filter((coach) => coach.id !== item.scheduledCoachId).map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}</select><button type="button" disabled={!substituteByItem[item.id] && !item.substituteCoachId} onClick={() => openActionForm({ kind: 'assign_substitute', item, required: courseHasStarted(item) })} className="min-h-11 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs font-bold">指定／更換代班</button></> : null}
                {item.substituteResponse === 'accepted' && !isDirectSubstituteActive ? <button type="button" onClick={() => openActionForm({ kind: 'confirm_substitute', item, emergency: false, required: false })} className="min-h-11 rounded-lg bg-blue-700 px-3 py-2.5 text-xs font-bold text-white">最終確認代班</button> : null}
                {item.substituteCoachId && item.substituteResponse !== 'accepted' ? <button type="button" onClick={() => openActionForm({ kind: 'confirm_substitute', item, emergency: true, required: true })} className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800">緊急確認代班</button> : null}
                <button type="button" onClick={() => openCorrection(item)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs font-bold">人工修正出勤</button>
              </div>
              {latestAudit ? <p className="mt-3 text-[11px] font-semibold text-apple-gray-500">最近稽核：{auditLabel(latestAudit.action)} · {formatDate(latestAudit.created_at, true)}{latestAudit.reason ? ` · ${latestAudit.reason}` : ''}</p> : null}
            </div></details>
          })}
          {!loading && !filtered.length ? <p className="rounded-lg border border-dashed border-black/15 p-8 text-center text-sm font-semibold text-apple-gray-500">目前沒有符合篩選條件的課次。</p> : null}
        </div>
        <p className="mt-4 rounded-lg bg-violet-50 p-3 text-xs font-bold leading-5 text-violet-800">課酬目前只預留事實來源與狀態欄位，所有課次統一顯示「待設定課酬」；尚未啟用金額、扣薪、結算或付款。</p>
      </div>
      </details>
      {actionForm ? (
        <div className="fixed inset-0 z-[125] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="coach-action-title" onMouseDown={(event) => { if (event.target === event.currentTarget) { setActionForm(null); setActionReason('') } }}>
          <section ref={actionDialogRef} className="admin-coach-action-sheet w-full max-w-xl rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="coach-action-title" className="text-xl font-black text-apple-gray-900">{actionForm.kind === 'leave_review' ? (actionForm.decision === 'approved' ? '核准請假' : '拒絕請假') : actionForm.kind === 'assign_substitute' ? '指定／更換代班' : actionForm.emergency ? '緊急確認代班' : '最終確認代班'}</h2>
                <p className="mt-1 text-xs leading-5 text-apple-gray-500">{actionForm.item.courseName} · {formatDate(actionForm.item.sessionDate)} {actionForm.item.startTime || '未設定'}</p>
              </div>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-apple-gray-600 hover:bg-apple-gray-100" aria-label="關閉操作視窗" onClick={() => { setActionForm(null); setActionReason('') }}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-apple-gray-50 p-3 text-xs">
                <p><span className="block text-apple-gray-400">原定教練</span><strong className="mt-1 block text-apple-gray-900">{actionForm.item.scheduledCoachName || '待安排'}</strong></p>
                <p><span className="block text-apple-gray-400">目前代班</span><strong className="mt-1 block text-apple-gray-900">{actionForm.item.substituteCoachName || '尚未指定'}</strong></p>
              </div>
              {actionForm.kind === 'assign_substitute' ? <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">請先在課次卡片選擇代班教練，再回到這裡確認指定。</p> : null}
              <label className="grid gap-1.5"><span className="text-xs font-bold text-apple-gray-500">操作說明{actionForm.required ? ' *' : '（可留空）'}</span><textarea value={actionReason} onChange={(event) => { setActionReason(event.target.value); if (error) setError('') }} className="min-h-24 w-full rounded-xl border border-black/10 px-3 py-3 text-sm outline-none focus:border-[#1597a8] focus:ring-4 focus:ring-[#1597a8]/10" placeholder={actionForm.required ? '請填寫原因' : '可補充這次處理的原因'} /></label>
              {actionForm.required ? <p className="text-xs leading-5 text-amber-700">這項處理需要留下原因，方便日後核對。</p> : null}
              {error ? <p className="rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-700" role="alert">{error}</p> : null}
              <p className="rounded-xl bg-[#eef4f5] p-3 text-xs leading-5 text-[#4c656e]">儲存後會保留操作人、時間與原因，方便日後追查。</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-black/10 pt-3"><button type="button" className="min-h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-bold" onClick={() => { setActionForm(null); setActionReason('') }}>取消</button><button type="button" className="min-h-11 rounded-xl bg-black px-3 text-sm font-bold text-white disabled:opacity-40" disabled={saving === actionForm.item.id || (actionForm.kind === 'assign_substitute' && !(substituteByItem[actionForm.item.id] || actionForm.item.substituteCoachId))} onClick={() => void submitActionForm()}>{saving === actionForm.item.id ? '儲存中…' : actionForm.kind === 'leave_review' ? (actionForm.decision === 'approved' ? '確認核准' : '確認拒絕') : actionForm.kind === 'assign_substitute' ? '確認指定' : actionForm.emergency ? '確認緊急代班' : '確認代班'}</button></div>
          </section>
        </div>
      ) : null}
      {correctionItem ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="coach-correction-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setCorrectionItem(null) }}>
          <section ref={correctionDialogRef} className="admin-coach-action-sheet w-full max-w-xl rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="coach-correction-title" className="text-xl font-black text-apple-gray-900">人工修正出勤</h2><p className="mt-1 text-xs leading-5 text-apple-gray-500">{correctionItem.courseName} · {formatDate(correctionItem.sessionDate)} {correctionItem.startTime || '未設定'}</p></div><button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-apple-gray-600 hover:bg-apple-gray-100" aria-label="關閉人工修正" onClick={() => setCorrectionItem(null)}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3">
              <fieldset><legend className="mb-2 text-xs font-bold text-apple-gray-500">簽到結果</legend><div className="grid grid-cols-3 gap-2">{([['on_time', '準時'], ['late', '遲到'], ['not_checked_in', '未到']] as const).map(([value, label]) => <button type="button" aria-pressed={correctionState === value} key={value} className={correctionState === value ? 'min-h-11 rounded-xl border border-[#0c7887] bg-[#edf8f7] px-2 text-xs font-black text-[#0c7887]' : 'min-h-11 rounded-xl border border-black/10 bg-white px-2 text-xs font-black text-apple-gray-700'} onClick={() => setCorrectionState(value)}>{label}</button>)}</div></fieldset>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-apple-gray-50 p-3 text-xs"><p><span className="block text-apple-gray-400">實際到課教練</span><strong className="mt-1 block text-apple-gray-900">{correctionItem.actualCoachName || correctionItem.scheduledCoachName || '待安排'}</strong></p><p><span className="block text-apple-gray-400">目前簽到時間</span><strong className="mt-1 block text-apple-gray-900">{correctionItem.checkedInAt ? formatDate(correctionItem.checkedInAt, true) : '尚無記錄'}</strong></p><p><span className="block text-apple-gray-400">薪資狀態</span><strong className="mt-1 block text-apple-gray-900">{correctionItem.salaryStatusLabel}</strong></p></div>
              <label className="grid gap-1.5"><span className="text-xs font-bold text-apple-gray-500">管理員修正原因 *</span><textarea value={correctionReason} onChange={(event) => { setCorrectionReason(event.target.value); if (error) setError('') }} className="min-h-24 w-full rounded-xl border border-black/10 px-3 py-3 text-sm outline-none focus:border-[#1597a8] focus:ring-4 focus:ring-[#1597a8]/10" placeholder="請說明為何需要人工修正" /></label>
              {error ? <p className="rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-700" role="alert">{error}</p> : null}
              <p className="rounded-xl bg-[#eef4f5] p-3 text-xs leading-5 text-[#4c656e]">儲存後會保留操作人、時間與原因，方便日後追查。</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-black/10 pt-3"><button type="button" className="min-h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-bold" onClick={() => setCorrectionItem(null)}>取消</button><button type="button" className="min-h-11 rounded-xl bg-black px-3 text-sm font-bold text-white disabled:opacity-40" disabled={saving === correctionItem.id} onClick={() => void saveCorrection()}>{saving === correctionItem.id ? '儲存中…' : '儲存簽到'}</button></div>
          </section>
        </div>
      ) : null}
    </>
  )
}
