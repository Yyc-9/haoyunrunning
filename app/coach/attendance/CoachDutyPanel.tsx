'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { APP_TIME_ZONE_LABEL } from '@/lib/app-time'
import AcceptanceTestCheckin from '@/components/AcceptanceTestCheckin'
import CoachDutyDetails, {
  formatDutyDate,
  formatDutyTime,
  stateMeta,
  type CoachOption,
  type DutyAction,
  type DutyItem,
  type DutyTask,
} from '@/components/coach/CoachDutyDetails'
import {
  groupCoachDutyCalendarItems,
  selectCoachDutyCalendarDate,
} from '@/lib/coach-duty-calendar'
import { supabase } from '@/lib/supabase'

const weekdays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

function taipeiDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return part('year') + '-' + part('month') + '-' + part('day')
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', timeZone: 'Asia/Taipei' })
    .format(new Date(Date.UTC(year, month - 1, 15)))
}

function shortServerTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

async function accessToken() {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
  return session.access_token
}

type DutyPayload = {
  items?: DutyItem[]
  coaches?: CoachOption[]
  serverTime?: string
  error?: string
}

export default function CoachDutyPanel() {
  const [items, setItems] = useState<DutyItem[]>([])
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [serverTime, setServerTime] = useState('')
  const [viewYear, setViewYear] = useState(0)
  const [viewMonth, setViewMonth] = useState(0)
  const [viewMode, setViewMode] = useState<'agenda' | 'calendar'>('agenda')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [detailTask, setDetailTask] = useState<DutyTask>('check_in')
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [leaveReason, setLeaveReason] = useState<Record<string, string>>({})
  const [invitedSubstitute, setInvitedSubstitute] = useState<Record<string, string>>({})
  const [manualReason, setManualReason] = useState<Record<string, string>>({})
  const [refreshing, setRefreshing] = useState(false)
  const desktopDialogRef = useRef<HTMLDivElement>(null)
  const mobileDialogRef = useRef<HTMLDivElement>(null)
  const dateRefs = useRef(new Map<string, HTMLButtonElement>())
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const requestInFlightRef = useRef(false)

  const load = useCallback(async (quiet = false) => {
    if (requestInFlightRef.current) return false
    requestInFlightRef.current = true
    if (!quiet) setLoading(true)
    if (!quiet) setError('')
    try {
      const response = await fetch('/api/coach/session-duty', {
        cache: 'no-store',
        headers: { Authorization: 'Bearer ' + await accessToken() },
      })
      const payload = await response.json().catch(() => ({})) as DutyPayload
      if (!response.ok) throw new Error(payload.error || '讀取到課資料失敗。')
      setError('')

      const nextItems = payload.items ?? []
      const nextServerTime = payload.serverTime || ''
      setItems(nextItems)
      setCoaches(payload.coaches ?? [])
      setServerTime(nextServerTime)
      if (nextServerTime) {
        const today = taipeiDateKey(nextServerTime)
        setViewYear((current) => current || Number(today.slice(0, 4)))
        setViewMonth((current) => current || Number(today.slice(5, 7)))
      }
      setSelectedId((current) => current && nextItems.some((item) => item.id === current) ? current : '')
      setSelectedDate((current) => current && nextItems.some((item) => item.sessionDate === current) ? current : '')
      return true
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取到課資料失敗。')
      return false
    } finally {
      requestInFlightRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 45_000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(timer)
    }
  }, [load])

  const selectedItem = items.find((item) => item.id === selectedId) ?? null
  const eventsByDate = useMemo(() => groupCoachDutyCalendarItems(items), [items])
  const selectedDateItems = selectedDate ? eventsByDate.get(selectedDate) ?? [] : []
  const todayKey = taipeiDateKey(serverTime || new Date())
  const todayItems = useMemo(() => items
    .filter((item) => item.sessionDate === todayKey)
    .sort((left, right) => left.startTime.localeCompare(right.startTime)), [items, todayKey])
  const nextItems = useMemo(() => items
    .filter((item) => item.sessionDate > todayKey && !item.isCancelled)
    .sort((left, right) => (left.sessionDate + left.startTime).localeCompare(right.sessionDate + right.startTime)), [items, todayKey])
  const agendaItems = todayItems.length ? todayItems : nextItems.slice(0, 3)
  const pendingInvitations = useMemo(() => items
    .filter((item) => item.canRespondSubstitute)
    .sort((left, right) => (left.sessionDate + left.startTime).localeCompare(right.sessionDate + right.startTime)), [items])
  const pendingNeedsAdminReview = pendingInvitations.some((item) => item.adminStatus !== 'not_required')

  const monthDays = useMemo(() => {
    if (!viewYear || !viewMonth) return []
    const first = new Date(Date.UTC(viewYear, viewMonth - 1, 1))
    const mondayOffset = (first.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate()
    const slots = Math.ceil((mondayOffset + daysInMonth) / 7) * 7
    return Array.from({ length: slots }, (_, index) => {
      const date = new Date(Date.UTC(viewYear, viewMonth - 1, index - mondayOffset + 1))
      return {
        key: date.toISOString().slice(0, 10),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === viewMonth - 1,
      }
    })
  }, [viewMonth, viewYear])

  const closeSelected = useCallback(() => {
    const fallbackDate = selectedDate
    const target = returnFocusRef.current ?? dateRefs.current.get(fallbackDate)
    setSelectedDate('')
    setSelectedId('')
    window.requestAnimationFrame(() => {
      target?.focus()
      returnFocusRef.current = null
    })
  }, [selectedDate])

  const openDetails = useCallback((item: DutyItem, task: DutyTask = 'check_in', trigger?: HTMLElement) => {
    returnFocusRef.current = trigger ?? null
    setSelectedDate(item.sessionDate)
    setSelectedId(item.id)
    setDetailTask(task)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    const dialog = isMobile ? mobileDialogRef.current : desktopDialogRef.current
    const previousOverflow = document.body.style.overflow
    if (isMobile) document.body.style.overflow = 'hidden'
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusFirst = () => {
      const first = dialog?.querySelector<HTMLElement>(focusableSelector)
      ;(first ?? dialog)?.focus()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSelected()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
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
    window.requestAnimationFrame(focusFirst)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [closeSelected, selectedId])

  function moveMonth(offset: number) {
    const date = new Date(Date.UTC(viewYear, viewMonth - 1 + offset, 1))
    setViewYear(date.getUTCFullYear())
    setViewMonth(date.getUTCMonth() + 1)
    if (selectedItem) closeSelected()
  }

  function goToday() {
    setViewYear(Number(todayKey.slice(0, 4)))
    setViewMonth(Number(todayKey.slice(5, 7)))
    if (selectedItem) closeSelected()
  }

  async function act(id: string, body: DutyAction) {
    if (savingKey) return
    const task: DutyTask = body.intent === 'request_leave'
      ? 'leave'
      : body.intent === 'respond_substitute'
        ? 'substitute'
        : 'check_in'
    setDetailTask(task)
    setSavingKey(id)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/coach/session-duty', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + await accessToken(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: id, ...body }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string }
      if (!response.ok) throw new Error(payload.error || '操作失敗，請重新整理後再試。')
      const refreshed = await load(true)
      setMessage(refreshed
        ? payload.message || '操作已完成，畫面已從伺服器更新。'
        : '操作已送出，但目前無法取得最新狀態，請重新整理確認。')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '操作失敗，請重新整理後再試。')
    } finally {
      setSavingKey('')
    }
  }

  const scheduleHeading = todayItems.length ? '今日課程' : '下一堂課'
  const scheduleSubheading = todayItems.length
    ? String(todayItems.length) + ' 堂課｜時間以伺服器資料為準'
    : nextItems.length
      ? '最近一堂：' + formatDutyDate(nextItems[0].sessionDate) + '｜時間以伺服器資料為準'
      : '目前沒有需要簽到或處理的授課課次。'

  return (
    <section data-testid="coach-workbench" className="overflow-visible rounded-2xl border border-[#0d3b3a]/15 bg-white shadow-sm">
      <div className="border-b border-[#0d3b3a]/10 bg-[#f3f8f7] p-3 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="hidden text-xs font-black tracking-wide text-[#176b67] sm:block">本人到課工作台</p>
            <h2 className="mt-0 text-2xl font-black text-[#0d3b3a] sm:mt-1 sm:text-3xl"><span className="sm:hidden">{todayItems.length ? '今日課程' : '近期課程'}</span><span className="hidden sm:inline">今天先把到課記好</span></h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-apple-gray-600 sm:mt-2 sm:leading-6"><span className="sm:hidden">{todayItems.length ? '可直接完成簽到' : '下一堂課時間以伺服器資料為準'}</span><span className="hidden sm:inline">{scheduleSubheading}。本人簽到與學員出席核實是兩份獨立紀錄。</span></p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-apple-gray-600">
            {serverTime ? <span>上次更新 {shortServerTime(serverTime)}（{APP_TIME_ZONE_LABEL}）</span> : <span>等待伺服器時間</span>}
            <button type="button" disabled={loading || refreshing} onClick={async () => { setRefreshing(true); await load(true); setRefreshing(false) }} aria-label="重新整理到課資料" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#0d3b3a] hover:bg-white/80 disabled:opacity-50">
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[#0d3b3a]/10 bg-white p-1 sm:mt-5 md:hidden" role="tablist" aria-label="工作台檢視">
          <button type="button" role="tab" aria-selected={viewMode === 'agenda'} onClick={() => setViewMode('agenda')} className={viewMode === 'agenda' ? 'min-h-11 rounded-lg bg-[#0d3b3a] px-3 py-2 text-sm font-black text-white' : 'min-h-11 rounded-lg px-3 py-2 text-sm font-black text-[#0d3b3a]'}>今日／近期</button>
          <button type="button" role="tab" aria-selected={viewMode === 'calendar'} onClick={() => setViewMode('calendar')} className={viewMode === 'calendar' ? 'min-h-11 rounded-lg bg-[#0d3b3a] px-3 py-2 text-sm font-black text-white' : 'min-h-11 rounded-lg px-3 py-2 text-sm font-black text-[#0d3b3a]'}><CalendarDays className="mr-1 inline h-4 w-4" aria-hidden="true" />日曆</button>
        </div>
      </div>

      {error ? <p role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-6 text-red-800 sm:m-6">{error}</p> : null}
      {message ? <p role="status" className="m-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-800 sm:m-6">{message}</p> : null}

      <div className="p-4 sm:p-6">
        <div className={(viewMode === 'calendar' ? 'hidden md:grid' : 'grid') + ' gap-5 lg:grid-cols-[minmax(0,1fr)_320px]'}>
          <section data-testid="coach-agenda" aria-labelledby="coach-agenda-title" className="min-w-0">
            <div className="hidden items-end justify-between gap-3 sm:flex">
              <div>
                <p className="text-xs font-black tracking-wide text-apple-gray-500">{todayItems.length ? 'TODAY' : 'UP NEXT'}</p>
                <h3 id="coach-agenda-title" className="mt-1 text-xl font-black text-black sm:text-2xl">{scheduleHeading}</h3>
              </div>
              {todayItems.length ? <span className="rounded-full bg-[#e6f1ef] px-3 py-1.5 text-xs font-black text-[#0d3b3a]">{todayItems.length} 堂</span> : null}
            </div>

            {loading && !items.length ? (
              <div className="mt-3 space-y-3 sm:mt-4" aria-label="正在讀取今日課程">
                <div className="h-36 animate-pulse rounded-2xl bg-apple-gray-100" />
                <div className="h-36 animate-pulse rounded-2xl bg-apple-gray-100" />
              </div>
            ) : agendaItems.length ? (
              <div className="mt-3 space-y-3 sm:mt-4">
                {agendaItems.map((item) => {
                  const meta = stateMeta[item.attendanceState] ?? stateMeta.upcoming
                  const selected = item.id === selectedId
                  const checkInBusy = savingKey === item.id && detailTask === 'check_in'
                  const cardTask: DutyTask = item.canRespondSubstitute ? 'substitute' : item.canRequestLeave ? 'leave' : 'check_in'
                  return (
                    <article key={item.id} data-testid={'coach-duty-card-' + item.id} className={selected ? 'rounded-2xl border border-[#176b67] p-4 ring-2 ring-[#176b67]/10 transition sm:p-5' : 'rounded-2xl border border-black/10 p-4 transition hover:border-black/20 sm:p-5'}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xl font-black tabular-nums text-[#0d3b3a]">{formatDutyTime(item.startTime) || '未設定'}</span>
                            <span className={'rounded-full border px-2.5 py-1 text-xs font-black ' + meta.chip}>{meta.label}</span>
                          </div>
                          <h4 className="mt-2 text-lg font-black text-black">{item.courseName}</h4>
                          <div className="mt-2 grid gap-1 text-sm font-semibold leading-6 text-apple-gray-600 sm:grid-cols-2">
                            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-[#176b67]" aria-hidden="true" />{item.location || '地點待確認'}</p>
                            <p>本人角色：{item.coachRole === 'head_coach' ? '主教練' : item.coachRole === 'assistant' ? '助教' : item.coachRole === 'substitute' ? '代班教練' : '教練'}</p>
                          </div>
                          {item.checkedInAt ? <p className="mt-2 text-sm font-bold text-emerald-700">{item.manualCorrection ? '管理員登記時間' : '伺服器時間'}：{formatDutyTime(item.checkedInAt)}</p> : item.attendanceState === 'not_checked_in' ? <p className="mt-2 text-sm font-bold text-amber-800">未簽到，待管理員確認；不等同未到課。</p> : null}
                        </div>
                        <button type="button" onClick={(event) => openDetails(item, cardTask, event.currentTarget)} aria-expanded={selected} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-black text-black hover:bg-apple-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-blue">查看詳情</button>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        {item.canCheckIn && !item.checkedInAt && !item.managedByAdmin ? (
                          <button type="button" disabled={Boolean(savingKey)} onClick={() => void act(item.id, { intent: 'check_in' })} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0d3b3a] px-5 py-3 text-base font-black text-white hover:bg-[#14534f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">{checkInBusy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : null}本人到課簽到</button>
                        ) : item.canCheckIn && item.managedByAdmin ? (
                          <button type="button" onClick={(event) => openDetails(item, 'check_in', event.currentTarget)} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#176b67] bg-[#e6f1ef] px-5 py-3 text-base font-black text-[#0d3b3a] hover:bg-[#d6ebe7] sm:w-auto">開啟詳情填寫補登原因</button>
                        ) : (
                          <p className="text-sm font-bold text-apple-gray-600">{item.checkedInAt ? (item.manualCorrection ? '已由管理員登記到課' : '已完成本人到課簽到') : item.canRequestLeave ? '可在詳情中申請請假' : '目前沒有可執行的簽到任務'}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-apple-gray-600">
                          {item.canRespondSubstitute ? <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-900">代班待回覆</span> : null}
                          {item.canRequestLeave ? <button type="button" onClick={(event) => openDetails(item, 'leave', event.currentTarget)} className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-[#176b67] underline underline-offset-2">請假／代班</button> : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-black/15 bg-apple-gray-50 p-6 text-center">
                <p className="text-base font-black text-black">目前沒有下一堂授課安排</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-apple-gray-600">若管理員新增課次，重新整理後會在這裡顯示。</p>
              </div>
            )}
          </section>

          <section aria-labelledby="coach-substitute-title" className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white"><BellRing className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="text-xs font-black tracking-wide text-sky-700">NEEDS YOUR REPLY</p>
                <h3 id="coach-substitute-title" className="mt-1 text-lg font-black text-sky-950">待回覆代班</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-sky-900">{pendingNeedsAdminReview ? '部分邀請接受後仍需管理員最終確認，請先確認時間。' : '接受後會成為實際授課教練，請先確認時間。'}</p>
              </div>
              <span className="ml-auto rounded-full bg-sky-700 px-2.5 py-1.5 text-xs font-black text-white">{pendingInvitations.length}</span>
            </div>
            {pendingInvitations.length ? (
              <div className="mt-4 space-y-3">
                {pendingInvitations.map((item) => (
                  <article key={item.id} className="rounded-xl border border-sky-200 bg-white p-3">
                    <button type="button" onClick={(event) => openDetails(item, 'substitute', event.currentTarget)} className="block min-h-11 w-full text-left">
                      <p className="text-base font-black text-black">{item.courseName}</p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-apple-gray-600">{formatDutyDate(item.sessionDate)} · {formatDutyTime(item.startTime) || '未設定時間'} · {item.location || '地點待確認'}</p>
                      <p className="mt-1 text-sm font-bold text-sky-900">邀請人：{item.scheduledCoachName}</p>
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" disabled={Boolean(savingKey)} onClick={() => void act(item.id, { intent: 'respond_substitute', response: 'accepted' })} className="min-h-11 rounded-xl bg-black px-3 py-2.5 text-sm font-black text-white disabled:opacity-50">接受</button>
                      <button type="button" disabled={Boolean(savingKey)} onClick={() => void act(item.id, { intent: 'respond_substitute', response: 'rejected' })} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-black text-black disabled:opacity-50">拒絕</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="mt-4 rounded-xl border border-dashed border-sky-200 bg-white/70 p-4 text-sm font-semibold leading-6 text-sky-900">目前沒有待回覆的代班邀請。</p>}
          </section>
        </div>

        <AcceptanceTestCheckin role="coach" className="mt-5" />

        <section data-testid="coach-calendar" aria-labelledby="coach-calendar-title" className={viewMode === 'agenda' ? 'mt-5 hidden rounded-2xl border border-black/10 bg-white md:block' : 'mt-5 block rounded-2xl border border-black/10 bg-white'}>
          <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-xs font-black tracking-wide text-apple-gray-500">CALENDAR</p>
              <h3 id="coach-calendar-title" className="mt-1 text-xl font-black text-black">日曆</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-apple-gray-600">日曆是補充入口；今天與近期課程已先列在上方。</p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button type="button" onClick={goToday} className="min-h-11 rounded-xl border border-black/10 px-3 py-2 text-sm font-black">今天</button>
              <button type="button" onClick={() => moveMonth(-1)} aria-label="上個月" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/10"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
              <span className="min-w-[120px] text-center text-base font-black text-black">{viewYear && viewMonth ? monthLabel(viewYear, viewMonth) : '日曆載入中'}</span>
              <button type="button" onClick={() => moveMonth(1)} aria-label="下個月" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/10"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
            </div>
          </div>
          {loading && !items.length ? <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" aria-hidden="true" /><p className="mt-2 text-sm font-semibold text-apple-gray-500">正在讀取日曆</p></div> : (
            <div className="overflow-x-auto p-3 sm:p-5">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-7 border-l border-t border-black/10">
                  {weekdays.map((weekday) => <div key={weekday} className="border-b border-r border-black/10 bg-apple-gray-50 px-1 py-2 text-center text-xs font-black text-apple-gray-500">{weekday}</div>)}
                  {monthDays.map((day) => {
                    const events = eventsByDate.get(day.key) ?? []
                    const selected = selectedDate === day.key && Boolean(selectedItem)
                    return (
                      <div key={day.key} className={day.inMonth ? 'relative flex min-h-20 flex-col items-center border-b border-r border-black/10 bg-white p-1.5 text-center' : 'relative flex min-h-20 flex-col items-center border-b border-r border-black/10 bg-apple-gray-50/70 p-1.5 text-center'}>
                        {events.length ? (
                          <button
                            ref={(node) => { if (node) dateRefs.current.set(day.key, node); else dateRefs.current.delete(day.key) }}
                            type="button"
                            aria-haspopup="dialog"
                            aria-expanded={selected}
                            aria-label={formatDutyDate(day.key) + '，' + events.length + ' 堂授課日程'}
                            onClick={(event) => {
                              if (selected) {
                                closeSelected()
                                return
                              }
                              const next = selectCoachDutyCalendarDate(eventsByDate, day.key, selectedDate)
                              returnFocusRef.current = event.currentTarget
                              setSelectedDate(next.selectedDate)
                              setSelectedId(next.selectedId)
                              setDetailTask('check_in')
                            }}
                            className="flex h-full min-h-[68px] w-full flex-col items-center rounded-xl px-1 py-1.5 transition hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-apple-blue"
                          >
                            <span className={day.key === todayKey ? 'mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#176b67] text-xs font-bold leading-none text-white tabular-nums' : day.inMonth ? 'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold leading-none text-black tabular-nums' : 'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold leading-none text-apple-gray-300 tabular-nums'}>{day.day}</span>
                            <span className="mt-auto flex min-h-3 max-w-full items-center justify-center gap-1" aria-hidden="true">
                              {events.slice(0, 4).map((item) => <span key={item.id} className={'h-2 w-2 shrink-0 rounded-full ' + (stateMeta[item.attendanceState] ?? stateMeta.upcoming).dot} />)}
                              {events.length > 4 ? <span className="text-[9px] font-black text-apple-gray-500">+{events.length - 4}</span> : null}
                            </span>
                          </button>
                        ) : <span className={day.key === todayKey ? 'mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#176b67] text-xs font-bold leading-none text-white tabular-nums' : day.inMonth ? 'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold leading-none text-black tabular-nums' : 'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold leading-none text-apple-gray-300 tabular-nums'}>{day.day}</span>}
                      </div>
                    )
                  })}
                </div>
                {!items.length ? <p className="py-8 text-center text-sm font-semibold text-apple-gray-500">目前沒有需要簽到或處理的授課課次。</p> : null}
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedItem ? (
        <>
          <div className="fixed inset-0 z-[80] hidden bg-black/30 md:block" aria-hidden="true" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSelected() }} />
          <div className="fixed inset-0 z-[90] flex items-end bg-black/30 md:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSelected() }}>
            <div ref={mobileDialogRef} role="dialog" aria-modal="true" aria-label={selectedItem.courseName + '授課安排'} tabIndex={-1} className="max-h-[min(88dvh,760px)] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/15" aria-hidden="true" />
              <CoachDutyDetails
                item={selectedItem}
                dateItems={selectedDateItems}
                coaches={coaches}
                activeTask={detailTask}
                onTaskChange={setDetailTask}
                leaveReason={leaveReason[selectedItem.id] || ''}
                invitedSubstituteId={invitedSubstitute[selectedItem.id] || ''}
                manualReason={manualReason[selectedItem.id] || ''}
                onLeaveReasonChange={(value) => setLeaveReason((current) => ({ ...current, [selectedItem.id]: value }))}
                onInvitedSubstituteChange={(value) => setInvitedSubstitute((current) => ({ ...current, [selectedItem.id]: value }))}
                onManualReasonChange={(value) => setManualReason((current) => ({ ...current, [selectedItem.id]: value }))}
                onAction={(action) => void act(selectedItem.id, action)}
                savingKey={savingKey}
                onClose={closeSelected}
                onSelectItem={(id) => { setSelectedId(id); setDetailTask('check_in') }}
              />
            </div>
          </div>
          <div className="fixed inset-0 z-[95] hidden md:block" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSelected() }}>
            <div ref={desktopDialogRef} role="dialog" aria-modal="false" aria-label={selectedItem.courseName + '授課安排'} tabIndex={-1} className="fixed left-1/2 top-24 z-[100] max-h-[calc(100dvh-8rem)] w-[min(500px,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-black/10 bg-white p-5 shadow-2xl outline-none sm:p-6">
              <CoachDutyDetails
                item={selectedItem}
                dateItems={selectedDateItems}
                coaches={coaches}
                activeTask={detailTask}
                onTaskChange={setDetailTask}
                leaveReason={leaveReason[selectedItem.id] || ''}
                invitedSubstituteId={invitedSubstitute[selectedItem.id] || ''}
                manualReason={manualReason[selectedItem.id] || ''}
                onLeaveReasonChange={(value) => setLeaveReason((current) => ({ ...current, [selectedItem.id]: value }))}
                onInvitedSubstituteChange={(value) => setInvitedSubstitute((current) => ({ ...current, [selectedItem.id]: value }))}
                onManualReasonChange={(value) => setManualReason((current) => ({ ...current, [selectedItem.id]: value }))}
                onAction={(action) => void act(selectedItem.id, action)}
                savingKey={savingKey}
                onClose={closeSelected}
                onSelectItem={(id) => { setSelectedId(id); setDetailTask('check_in') }}
              />
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
