'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRing,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  UserRoundCheck,
  X,
} from 'lucide-react'
import { APP_TIME_ZONE_LABEL } from '@/lib/app-time'
import AcceptanceTestCheckin from '@/components/AcceptanceTestCheckin'
import {
  groupCoachDutyCalendarItems,
  selectCoachDutyCalendarDate,
} from '@/lib/coach-duty-calendar'
import { supabase } from '@/lib/supabase'

type DutyItem = {
  id: string
  courseName: string
  location: string
  sessionDate: string
  startTime: string
  scheduledCoachId: string
  scheduledCoachName: string
  actualCoachId: string
  actualCoachName: string
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
  leaveReason: string
  substituteCoachId: string
  substituteCoachName: string
  substituteResponse: 'none' | 'pending' | 'accepted' | 'rejected'
  adminStatus: 'not_required' | 'pending' | 'approved' | 'rejected'
  attendanceState: string
  checkedInAt: string
  punctuality: '' | 'on_time' | 'late'
  canViewCheckIn: boolean
  canCheckIn: boolean
  checkInOpensAt: string
  canRequestLeave: boolean
  canRespondSubstitute: boolean
  managedByAdmin: boolean
  isCancelled: boolean
}

type CoachOption = { id: string; name: string }

const weekdays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

const stateMeta: Record<string, { label: string; chip: string; dot: string }> = {
  upcoming: { label: '尚未開放', chip: 'border-blue-200 bg-blue-50 text-blue-800', dot: 'bg-blue-400' },
  check_in_open: { label: '可簽到', chip: 'border-blue-700 bg-blue-700 text-white', dot: 'bg-blue-700' },
  on_time: { label: '準時簽到', chip: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  late: { label: '遲到簽到', chip: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  not_checked_in: { label: '應到未簽到', chip: 'border-red-200 bg-red-50 text-red-800', dot: 'bg-red-500' },
  substitute_absent: { label: '代班未到', chip: 'border-red-200 bg-red-50 text-red-800', dot: 'bg-red-500' },
  cancelled: { label: '本堂停課', chip: 'border-gray-200 bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  missing_start_time: { label: '請補齊開始時間', chip: 'border-red-200 bg-red-50 text-red-800', dot: 'bg-red-500' },
  leave_approved: { label: '已請假，待完成代班', chip: 'border-orange-200 bg-orange-50 text-orange-800', dot: 'bg-orange-500' },
}

function taipeiDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(typeof value === 'string' ? new Date(value) : value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${value}T12:00:00+08:00`))
}

function formatTime(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', timeZone: 'Asia/Taipei' })
    .format(new Date(Date.UTC(year, month - 1, 15)))
}

async function token() {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
  return session.access_token
}

export default function CoachDutyPanel() {
  const [items, setItems] = useState<DutyItem[]>([])
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [serverTime, setServerTime] = useState('')
  const [viewYear, setViewYear] = useState(0)
  const [viewMonth, setViewMonth] = useState(0)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [leaveReason, setLeaveReason] = useState<Record<string, string>>({})
  const [recommendedCoach, setRecommendedCoach] = useState<Record<string, string>>({})
  const desktopDialogRef = useRef<HTMLDivElement>(null)
  const mobileDialogRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const dateRefs = useRef(new Map<string, HTMLButtonElement>())

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/coach/session-duty', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${await token()}` },
      })
      const payload = await response.json().catch(() => ({})) as {
        items?: DutyItem[]
        coaches?: CoachOption[]
        serverTime?: string
        error?: string
      }
      if (!response.ok) throw new Error(payload.error || '讀取到課資料失敗。')
      setItems(payload.items ?? [])
      setCoaches(payload.coaches ?? [])
      setServerTime(payload.serverTime || new Date().toISOString())
      if (!viewYear || !viewMonth) {
        const today = taipeiDateKey(payload.serverTime || new Date())
        setViewYear(Number(today.slice(0, 4)))
        setViewMonth(Number(today.slice(5, 7)))
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取到課資料失敗。')
    } finally {
      setLoading(false)
    }
  }, [viewMonth, viewYear])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load(true) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load])

  const selectedItem = items.find((item) => item.id === selectedId) ?? null
  const selectedDateItems = selectedDate
    ? groupCoachDutyCalendarItems(items).get(selectedDate) ?? []
    : []
  const pendingInvitations = useMemo(
    () => items
      .filter((item) => item.canRespondSubstitute)
      .sort((left, right) => `${left.sessionDate}${left.startTime}`.localeCompare(`${right.sessionDate}${right.startTime}`)),
    [items],
  )
  const closeSelected = useCallback(() => {
    const activeDate = selectedDate
    setSelectedDate('')
    setSelectedId('')
    window.requestAnimationFrame(() => dateRefs.current.get(activeDate)?.focus())
  }, [selectedDate])

  useEffect(() => {
    if (!selectedItem) return
    const activeDialog = () => window.matchMedia('(min-width: 768px)').matches
      ? desktopDialogRef.current
      : mobileDialogRef.current
    window.requestAnimationFrame(() => activeDialog()?.focus())
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSelected()
    }
    const closeOnOutside = (event: PointerEvent) => {
      if (activeDialog()?.contains(event.target as Node)) return
      if (dateRefs.current.get(selectedDate)?.contains(event.target as Node)) return
      closeSelected()
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutside)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutside)
    }
  }, [closeSelected, selectedDate, selectedItem])

  const todayKey = taipeiDateKey(serverTime || new Date())
  const monthDays = useMemo(() => {
    if (!viewYear || !viewMonth) return []
    const first = new Date(Date.UTC(viewYear, viewMonth - 1, 1))
    const mondayOffset = (first.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate()
    const slots = Math.ceil((mondayOffset + daysInMonth) / 7) * 7
    return Array.from({ length: slots }, (_, index) => {
      const date = new Date(Date.UTC(viewYear, viewMonth - 1, index - mondayOffset + 1))
      const key = date.toISOString().slice(0, 10)
      return {
        key,
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === viewMonth - 1,
        column: index % 7,
      }
    })
  }, [viewMonth, viewYear])
  const eventsByDate = useMemo(() => groupCoachDutyCalendarItems(items), [items])

  function moveMonth(offset: number) {
    const date = new Date(Date.UTC(viewYear, viewMonth - 1 + offset, 1))
    setViewYear(date.getUTCFullYear())
    setViewMonth(date.getUTCMonth() + 1)
    closeSelected()
  }

  function goToday() {
    setViewYear(Number(todayKey.slice(0, 4)))
    setViewMonth(Number(todayKey.slice(5, 7)))
    closeSelected()
  }

  async function act(id: string, body: Record<string, unknown>) {
    setSaving(id)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/coach/session-duty', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: id, ...body }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string }
      if (!response.ok) throw new Error(payload.error || '操作失敗。')
      setMessage(payload.message || '資料已更新。')
      await load(true)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '操作失敗。')
    } finally {
      setSaving('')
    }
  }

  function DutyDetails({ item }: { item: DutyItem }) {
    const meta = stateMeta[item.attendanceState] ?? stateMeta.upcoming
    const checkInLabel = item.checkedInAt
      ? item.punctuality === 'late' ? '已完成遲到簽到' : '已完成準時簽到'
      : item.canCheckIn
        ? item.managedByAdmin ? '確認教練到課' : '本人到課簽到'
        : item.attendanceState === 'missing_start_time'
          ? '尚未設定簽到時間'
          : ['not_checked_in', 'substitute_absent'].includes(item.attendanceState)
            ? '簽到時間已結束'
            : item.checkInOpensAt
              ? `將於 ${formatTime(item.checkInOpensAt)} 開放簽到`
              : '簽到尚未開放'
    return (
      <>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-apple-blue">授課安排</p>
            <h3 className="mt-1 text-xl font-black text-black">{item.courseName}</h3>
          </div>
          <button type="button" onClick={closeSelected} aria-label="關閉課程詳情" className="rounded-full p-2 hover:bg-black/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm font-semibold text-apple-gray-600">
          <p>{formatDate(item.sessionDate)} · {item.startTime || '未設定開始時間'}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" />{item.location || '地點待確認'}</p>
          <p>原定教練：{item.scheduledCoachName}</p>
          <p>實際授課：{item.actualCoachName || '待安排'}</p>
        </div>
        {item.managedByAdmin ? (
          <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-800">
            管理員可操作所有課次；簽到會記錄本堂實際授課教練，請假會保留本堂原定教練，並留下管理員操作紀錄。
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${meta.chip}`}>{meta.label}</span>
          {item.adminStatus === 'pending' ? <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-800">等待管理員處理</span> : null}
          {item.adminStatus === 'approved' ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">管理員已確認</span> : null}
        </div>
        {item.checkedInAt ? <p className="mt-3 text-xs font-bold text-emerald-700">伺服器簽到時間：{formatTime(item.checkedInAt)}</p> : item.checkInOpensAt ? <p className="mt-3 text-xs font-semibold text-apple-gray-500">簽到開放時間：{formatTime(item.checkInOpensAt)}（{APP_TIME_ZONE_LABEL}）</p> : null}

        {item.canViewCheckIn ? (
          <button
            type="button"
            disabled={!item.canCheckIn || saving === item.id}
            onClick={() => act(item.id, { intent: 'check_in' })}
            className={`mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition-colors ${
              item.checkedInAt
                ? 'cursor-default bg-emerald-100 text-emerald-800'
                : item.canCheckIn
                  ? 'bg-blue-700 text-white hover:bg-blue-800'
                  : 'cursor-not-allowed bg-apple-gray-100 text-apple-gray-500'
            }`}
          >
            {saving === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}
            {checkInLabel}
          </button>
        ) : null}

        {item.canRespondSubstitute ? (
          <div className="mt-4 rounded-xl bg-blue-50 p-3">
            <p className="text-sm font-black text-blue-950">邀請你代班本堂課程</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={saving === item.id} onClick={() => act(item.id, { intent: 'respond_substitute', response: 'accepted' })} className="rounded-lg bg-black px-4 py-2.5 text-xs font-bold text-white">接受代班</button>
              <button type="button" disabled={saving === item.id} onClick={() => act(item.id, { intent: 'respond_substitute', response: 'rejected' })} className="rounded-lg border border-black/10 bg-white px-4 py-2.5 text-xs font-bold">拒絕代班</button>
            </div>
          </div>
        ) : null}

        {item.canRequestLeave ? (
          <details className="mt-4 rounded-xl border border-black/10 bg-apple-gray-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-black">
                <CalendarClock className="h-4 w-4 text-orange-600" />
                {item.substituteResponse === 'rejected'
                  ? '重新邀請代班教練'
                  : item.managedByAdmin
                    ? '為原定教練登記請假並邀請代班'
                    : '申請請假並邀請代班'}
              </span>
              <span className="text-[11px] font-bold text-apple-gray-500">不限簽到時段</span>
            </summary>
            <div className="space-y-3 border-t border-black/10 p-4">
              <textarea value={leaveReason[item.id] || ''} onChange={(event) => setLeaveReason((current) => ({ ...current, [item.id]: event.target.value }))} rows={3} className="apple-input resize-y" placeholder="請假原因（必填）" />
              <label>
                <span className="mb-1 block text-xs font-bold text-apple-gray-500">邀請代班教練（必選）</span>
                <select value={recommendedCoach[item.id] || ''} onChange={(event) => setRecommendedCoach((current) => ({ ...current, [item.id]: event.target.value }))} className="apple-input">
                  <option value="">選擇代班教練</option>
                  {coaches.filter((coach) => coach.id !== item.scheduledCoachId).map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
                </select>
              </label>
              <button type="button" disabled={saving === item.id || !leaveReason[item.id]?.trim() || !recommendedCoach[item.id]} onClick={() => act(item.id, { intent: 'request_leave', reason: leaveReason[item.id], invitedSubstituteId: recommendedCoach[item.id] })} className="apple-button-primary min-h-11 w-full disabled:opacity-40">{item.substituteResponse === 'rejected' ? '重新送出代班邀請' : '送出請假與代班邀請'}</button>
            </div>
          </details>
        ) : null}

        {item.leaveStatus !== 'none' ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-xs font-bold leading-5 text-orange-800">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{item.substituteResponse === 'accepted'
              ? `原教練已請假｜代班 ${item.substituteCoachName} 已接受並生效`
              : item.substituteResponse === 'rejected'
                ? `代班 ${item.substituteCoachName} 已拒絕，可重新邀請其他教練`
                : item.substituteCoachName
                  ? `請假邀請已送出｜等待 ${item.substituteCoachName} 回覆`
                  : `請假：${item.leaveStatus === 'approved' ? '已核准' : item.leaveStatus === 'rejected' ? '已拒絕' : '處理中'}｜待安排代班`}</span>
          </p>
        ) : null}
      </>
    )
  }

  function DateDutyDetails({ item, dateItems }: { item: DutyItem; dateItems: DutyItem[] }) {
    return (
      <>
        {dateItems.length > 1 ? (
          <div className="mb-4">
            <p className="mb-2 text-xs font-black text-apple-gray-500">{formatDate(item.sessionDate)} · 本日 {dateItems.length} 堂</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dateItems.map((dateItem) => {
                const active = dateItem.id === item.id
                return (
                  <button
                    key={dateItem.id}
                    type="button"
                    onClick={() => setSelectedId(dateItem.id)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
                      active ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black'
                    }`}
                  >
                    {dateItem.startTime || '--:--'} · {dateItem.courseName} · {dateItem.scheduledCoachName}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        <DutyDetails item={item} />
      </>
    )
  }

  return (
    <>
      <AcceptanceTestCheckin role="coach" className="mb-4 sm:mb-6" />

      {pendingInvitations.length ? (
        <details open className="mb-4 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 shadow-sm sm:mb-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white"><BellRing className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-black text-blue-700">系統訊息</p>
                <h2 className="truncate text-base font-black text-blue-950 sm:text-lg">代班邀請</h2>
              </div>
            </div>
            <span className="rounded-full bg-blue-700 px-3 py-1.5 text-xs font-black text-white">待回覆 {pendingInvitations.length}</span>
          </summary>
          <div className="space-y-3 border-t border-blue-200 p-4 sm:p-5">
            {pendingInvitations.map((item) => (
              <article key={item.id} className="rounded-xl border border-blue-200 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-black">{item.courseName}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-apple-gray-600">{formatDate(item.sessionDate)} · {item.startTime || '未設定開始時間'} · {item.location || '地點待確認'}</p>
                    <p className="mt-1 text-xs font-bold text-blue-800">邀請人：{item.scheduledCoachName}{item.leaveReason ? `｜請假原因：${item.leaveReason}` : ''}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={saving === item.id} onClick={() => act(item.id, { intent: 'respond_substitute', response: 'accepted' })} className="rounded-lg bg-black px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">接受代班</button>
                    <button type="button" disabled={saving === item.id} onClick={() => act(item.id, { intent: 'respond_substitute', response: 'rejected' })} className="rounded-lg border border-black/10 bg-white px-4 py-2.5 text-xs font-bold disabled:opacity-50">拒絕代班</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <section className="mb-6 overflow-visible rounded-2xl border border-black/10 bg-white shadow-sm sm:mb-8">
      <div className="flex flex-col gap-4 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-bold text-apple-blue">教練本人到課</p>
          <h2 className="mt-1 text-xl font-black text-black sm:text-2xl">我的授課日程</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-apple-gray-500">本人到課簽到與學員出席核實是兩份獨立紀錄。</p>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button type="button" onClick={goToday} className="rounded-lg border border-black/10 px-3 py-2 text-sm font-bold">今天</button>
          <button type="button" onClick={() => moveMonth(-1)} aria-label="上個月" className="rounded-lg border border-black/10 p-2.5"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => moveMonth(1)} aria-label="下個月" className="rounded-lg border border-black/10 p-2.5"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      {error ? <p className="m-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      {message ? <p className="m-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {loading && !items.length ? (
        <div className="p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : (
        <div ref={calendarRef} className="relative p-3 sm:p-5">
          <h3 className="mb-3 text-center text-lg font-black text-black sm:text-xl">{viewYear && viewMonth ? monthLabel(viewYear, viewMonth) : ''}</h3>
          <div className="grid grid-cols-7 border-l border-t border-black/10">
            {weekdays.map((weekday) => <div key={weekday} className="border-b border-r border-black/10 bg-apple-gray-50 px-1 py-2 text-center text-[10px] font-black text-apple-gray-500 sm:text-xs">{weekday}</div>)}
            {monthDays.map((day) => {
              const events = eventsByDate.get(day.key) ?? []
              const selected = selectedDate === day.key && selectedItem
              return (
                <div
                  key={day.key}
                  data-calendar-day={day.key}
                  className={`relative flex min-h-16 flex-col items-center border-b border-r border-black/10 p-1 text-center sm:min-h-20 sm:p-1.5 ${day.inMonth ? 'bg-white' : 'bg-apple-gray-50/70'}`}
                >
                  {events.length ? (
                    <button
                      ref={(node) => { if (node) dateRefs.current.set(day.key, node); else dateRefs.current.delete(day.key) }}
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={Boolean(selected)}
                      aria-label={`${formatDate(day.key)}，${events.length} 堂授課日程`}
                      onClick={() => {
                        const next = selectCoachDutyCalendarDate(eventsByDate, day.key, selectedDate)
                        setSelectedDate(next.selectedDate)
                        setSelectedId(next.selectedId)
                      }}
                      className={`flex h-full min-h-14 w-full flex-col items-center rounded-xl px-1 py-1.5 transition hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-apple-blue sm:min-h-[68px] ${
                        selected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span
                        data-calendar-day-number
                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-center text-xs font-bold leading-none tabular-nums ${day.key === todayKey ? 'bg-apple-blue text-white' : day.inMonth ? 'text-black' : 'text-apple-gray-300'}`}
                      >
                        {day.day}
                      </span>
                      <span className="mt-auto flex min-h-3 max-w-full items-center justify-center gap-1" aria-hidden="true">
                        {events.slice(0, 4).map((item) => {
                          const meta = stateMeta[item.attendanceState] ?? stateMeta.upcoming
                          return <span key={item.id} className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                        })}
                        {events.length > 4 ? <span className="text-[9px] font-black text-apple-gray-500">+{events.length - 4}</span> : null}
                      </span>
                    </button>
                  ) : (
                    <span
                      data-calendar-day-number
                      className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-center text-xs font-bold leading-none tabular-nums ${day.key === todayKey ? 'bg-apple-blue text-white' : day.inMonth ? 'text-black' : 'text-apple-gray-300'}`}
                    >
                      {day.day}
                    </span>
                  )}
                  {selected ? (
                    <div
                      ref={desktopDialogRef}
                      role="dialog"
                      aria-modal="false"
                      aria-label={`${formatDate(day.key)}授課安排`}
                      tabIndex={-1}
                      className={`absolute top-[calc(100%-4px)] z-50 hidden w-[390px] max-w-[calc(100vw-3rem)] rounded-2xl border border-black/10 bg-white p-5 shadow-2xl outline-none md:block ${day.column >= 5 ? 'right-0' : 'left-0'}`}
                    >
                      <span className={`absolute -top-2 h-4 w-4 rotate-45 border-l border-t border-black/10 bg-white ${day.column >= 5 ? 'right-6' : 'left-6'}`} />
                      <DateDutyDetails item={selected} dateItems={selectedDateItems} />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          {!items.length ? <p className="py-8 text-center text-sm font-semibold text-apple-gray-500">目前沒有需要簽到或處理的授課課次。</p> : null}
        </div>
      )}

      {selectedItem ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/30 md:hidden">
          <div
            ref={mobileDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedItem.courseName}授課安排`}
            tabIndex={-1}
            className="max-h-[86dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl outline-none"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/15" />
            <DateDutyDetails item={selectedItem} dateItems={selectedDateItems} />
          </div>
        </div>
      ) : null}
      </section>
    </>
  )
}
