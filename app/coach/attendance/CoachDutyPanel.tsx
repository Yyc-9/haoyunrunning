'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, ChevronDown, Loader2, RefreshCw, UserRoundCheck } from 'lucide-react'
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
  canCheckIn: boolean
  checkInOpensAt: string
  canRequestLeave: boolean
  canRespondSubstitute: boolean
  isCancelled: boolean
}

type CoachOption = { id: string; name: string }

const stateLabel: Record<string, string> = {
  upcoming: '尚未開放',
  check_in_open: '可簽到',
  on_time: '準時簽到',
  late: '遲到簽到',
  not_checked_in: '應到未簽到',
  substitute_absent: '代班未到',
  cancelled: '本堂停課',
  missing_start_time: '請補齊開始時間',
  leave_approved: '已請假，待完成代班',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T12:00:00+08:00`))
}

function formatTime(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

async function token() {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
  return session.access_token
}

export default function CoachDutyPanel() {
  const [items, setItems] = useState<DutyItem[]>([])
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [leaveReason, setLeaveReason] = useState<Record<string, string>>({})
  const [recommendedCoach, setRecommendedCoach] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/coach/session-duty', { cache: 'no-store', headers: { Authorization: `Bearer ${await token()}` } })
      const payload = await response.json().catch(() => ({})) as { items?: DutyItem[]; coaches?: CoachOption[]; error?: string }
      if (!response.ok) throw new Error(payload.error || '讀取到課資料失敗。')
      setItems(payload.items ?? [])
      setCoaches(payload.coaches ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取到課資料失敗。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const now = Date.now()
    const candidates = items
      .map((item) => ({
        item,
        timestamp: new Date(`${item.sessionDate}T${item.startTime || '12:00'}:00+08:00`).getTime(),
      }))
      .filter(({ timestamp }) => Number.isFinite(timestamp))
    const upcoming = candidates
      .filter(({ timestamp }) => timestamp >= now - 15 * 60_000)
      .sort((a, b) => a.timestamp - b.timestamp)
    const nearest = upcoming[0] ?? [...candidates].sort((a, b) => b.timestamp - a.timestamp)[0]
    return nearest ? [nearest.item] : []
  }, [items])
  const nearestItem = visible[0]

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
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '操作失敗。')
    } finally {
      setSaving('')
    }
  }

  return (
    <details className="group mb-6 overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-bold text-apple-blue">教練本人到課</p>
          <h2 className="mt-1 text-lg font-black sm:text-xl">最近一堂課的簽到與請假代班</h2>
          {nearestItem ? (
            <p className="mt-1 truncate text-xs font-semibold leading-5 text-apple-gray-500">
              {formatDate(nearestItem.sessionDate)} · {nearestItem.startTime || '未設定時間'} · {nearestItem.courseName}
            </p>
          ) : (
            <p className="mt-1 text-xs font-semibold leading-5 text-apple-gray-500">目前沒有需要處理的課次。</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {nearestItem ? <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline-flex ${['not_checked_in', 'substitute_absent'].includes(nearestItem.attendanceState) ? 'bg-red-50 text-red-700' : nearestItem.attendanceState === 'on_time' ? 'bg-emerald-50 text-emerald-700' : 'bg-apple-gray-100 text-apple-gray-700'}`}>{stateLabel[nearestItem.attendanceState] || nearestItem.attendanceState}</span> : null}
          <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-black/10">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold leading-5 text-apple-gray-500">本人到課簽到與學員出席核實是兩份獨立紀錄。</p>
          <button type="button" onClick={load} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10" aria-label="重新整理教練到課資料"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        {error ? <p className="m-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        {message ? <p className="m-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        {loading && !items.length ? <div className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : (
          <div>
            {visible.map((item) => (
              <article key={item.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{item.courseName}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${['not_checked_in', 'substitute_absent'].includes(item.attendanceState) ? 'bg-red-50 text-red-700' : item.attendanceState === 'on_time' ? 'bg-emerald-50 text-emerald-700' : 'bg-apple-gray-100 text-apple-gray-700'}`}>{stateLabel[item.attendanceState] || item.attendanceState}</span></div>
                  <p className="mt-1 text-sm font-semibold text-apple-gray-600">{formatDate(item.sessionDate)} · {item.startTime || '未設定時間'} · {item.location}</p>
                  <p className="mt-1 text-xs text-apple-gray-500">原定：{item.scheduledCoachName}｜實際：{item.actualCoachName || '待安排'}</p>
                  {item.checkedInAt ? <p className="mt-1 text-xs font-bold text-emerald-700">伺服器記錄 {formatTime(item.checkedInAt)}</p> : item.checkInOpensAt && item.attendanceState === 'upcoming' ? <p className="mt-1 text-xs text-apple-gray-500">{formatTime(item.checkInOpensAt)} 開放簽到</p> : null}
                </div>
                {item.canCheckIn ? <button type="button" disabled={saving === item.id} onClick={() => act(item.id, { intent: 'check_in' })} className="apple-button-primary min-h-11 shrink-0 gap-2 px-5"><UserRoundCheck className="h-4 w-4" />本人到課簽到</button> : null}
              </div>

              {item.canRespondSubstitute ? <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 p-3"><p className="mr-auto text-sm font-bold text-blue-900">邀請你代班本堂課程</p><button type="button" onClick={() => act(item.id, { intent: 'respond_substitute', response: 'accepted' })} className="rounded-lg bg-black px-4 py-2 text-xs font-bold text-white">接受</button><button type="button" onClick={() => act(item.id, { intent: 'respond_substitute', response: 'rejected' })} className="rounded-lg border border-black/10 bg-white px-4 py-2 text-xs font-bold">拒絕</button></div> : null}

              {item.canRequestLeave ? <details className="mt-4 rounded-lg border border-black/10 bg-apple-gray-50"><summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">提出本堂請假／推薦代班</summary><div className="grid gap-3 border-t border-black/10 p-4 sm:grid-cols-2"><textarea value={leaveReason[item.id] || ''} onChange={(event) => setLeaveReason((current) => ({ ...current, [item.id]: event.target.value }))} rows={3} className="apple-input resize-y sm:col-span-2" placeholder="請假原因（必填）" /><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-apple-gray-500">推薦代班教練（可留空，由管理員安排）</span><select value={recommendedCoach[item.id] || ''} onChange={(event) => setRecommendedCoach((current) => ({ ...current, [item.id]: event.target.value }))} className="apple-input"><option value="">交由管理員安排</option>{coaches.filter((coach) => coach.id !== item.scheduledCoachId).map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}</select></label><button type="button" disabled={saving === item.id || !leaveReason[item.id]?.trim()} onClick={() => act(item.id, { intent: 'request_leave', reason: leaveReason[item.id], recommendedSubstituteId: recommendedCoach[item.id] || '' })} className="apple-button-primary min-h-11 sm:col-span-2 disabled:opacity-40">送出請假申請</button></div></details> : null}

              {item.leaveStatus !== 'none' ? <p className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-700"><CalendarClock className="h-4 w-4" />請假：{item.leaveStatus === 'requested' ? '待管理員核對' : item.leaveStatus === 'approved' ? '已核准' : '已拒絕'}{item.substituteCoachName ? `｜代班 ${item.substituteCoachName}（${item.substituteResponse === 'accepted' ? '已接受' : item.substituteResponse === 'rejected' ? '已拒絕' : '待回覆'}）` : '｜待安排代班'}</p> : null}
              </article>
            ))}
            {!visible.length ? <p className="p-8 text-center text-sm font-semibold text-apple-gray-500">近期沒有需要簽到或處理的課次。</p> : null}
          </div>
        )}
      </div>
    </details>
  )
}
