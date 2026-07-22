'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, RefreshCw, UserRoundCheck } from 'lucide-react'
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

const attendanceLabel: Record<string, string> = {
  upcoming: '尚未開放', check_in_open: '待簽到', on_time: '準時', late: '遲到',
  not_checked_in: '應到未簽到', substitute_absent: '代班未到', cancelled: '本堂停課',
  missing_start_time: '請補齊開始時間', leave_approved: '已請假，待安排代班',
}

function taipeiToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
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
  const [items, setItems] = useState<DutyItem[]>([])
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dateFilter, setDateFilter] = useState(taipeiToday())
  const [courseFilter, setCourseFilter] = useState('all')
  const [coachFilter, setCoachFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [substituteByItem, setSubstituteByItem] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/coach-duty', { cache: 'no-store', headers: { Authorization: `Bearer ${await accessToken()}` } })
      const payload = await response.json().catch(() => ({})) as { items?: DutyItem[]; coaches?: CoachOption[]; audits?: Audit[]; error?: string }
      if (!response.ok) throw new Error(payload.error || '讀取教練到課資料失敗。')
      setItems(payload.items ?? [])
      setCoaches(payload.coaches ?? [])
      setAudits(payload.audits ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取教練到課資料失敗。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const todayItems = items.filter((item) => item.sessionDate === taipeiToday())
  const summaries = [
    ['今日應到', todayItems.filter((item) => !item.isCancelled).length, 'text-black'],
    ['準時', todayItems.filter((item) => item.attendanceState === 'on_time').length, 'text-emerald-700'],
    ['遲到', todayItems.filter((item) => item.attendanceState === 'late').length, 'text-amber-700'],
    ['請假代班完成', todayItems.filter((item) => item.leaveStatus === 'approved' && item.actualCoachId && ['on_time', 'late'].includes(item.attendanceState)).length, 'text-blue-700'],
    ['待安排代班', todayItems.filter((item) => item.leaveStatus === 'approved' && !item.actualCoachId).length, 'text-amber-700'],
    ['應到未簽到', todayItems.filter((item) => item.attendanceState === 'not_checked_in').length, 'text-red-700'],
    ['代班未到', todayItems.filter((item) => item.attendanceState === 'substitute_absent').length, 'text-red-700'],
  ] as const

  const courseOptions = [...new Map(items.map((item) => [item.courseSeasonCourseId, item.courseName])).entries()]
  const filtered = useMemo(() => items.filter((item) => {
    if (dateFilter && item.sessionDate !== dateFilter) return false
    if (courseFilter !== 'all' && item.courseSeasonCourseId !== courseFilter) return false
    if (coachFilter !== 'all' && ![item.scheduledCoachId, item.actualCoachId, item.substituteCoachId].includes(coachFilter)) return false
    if (statusFilter === 'anomaly' && !['not_checked_in', 'substitute_absent', 'missing_start_time'].includes(item.attendanceState) && !(item.leaveStatus === 'approved' && !item.actualCoachId)) return false
    if (statusFilter !== 'all' && statusFilter !== 'anomaly' && item.attendanceState !== statusFilter) return false
    return true
  }), [coachFilter, courseFilter, dateFilter, items, statusFilter])

  async function action(id: string, body: Record<string, unknown>) {
    setSaving(id)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/coach-duty', { method: 'PATCH', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ assignmentId: id, ...body }) })
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string }
      if (!response.ok) throw new Error(payload.error || '更新失敗。')
      setMessage(payload.message || '資料已更新。')
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '更新失敗。')
    } finally {
      setSaving('')
    }
  }

  function reasonPrompt(title: string, required = true) {
    const value = window.prompt(title, '')?.trim() || ''
    return required && !value ? null : value
  }

  return (
    <details open className="border-b border-black/10 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5"><div><div className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5" /><h2 className="text-lg font-black">教練本人到課、請假與代班</h2></div><p className="mt-1 text-sm text-apple-gray-600">課次事實獨立保留；學員自主簽到與教練對學員的出席核實不會在這裡互相覆蓋。</p></div><ChevronDown className="h-5 w-5 shrink-0" /></summary>
      <div className="border-t border-black/10 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">{summaries.map(([label, value, tone]) => <div key={label} className="rounded-lg border border-black/10 bg-apple-gray-50 p-3"><p className={`text-xl font-black ${tone}`}>{value}</p><p className="mt-1 text-[11px] font-bold text-apple-gray-500">{label}</p></div>)}</div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-[150px_1fr_1fr_180px_auto]">
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="apple-input" aria-label="日期篩選" />
          <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="apple-input"><option value="all">全部課程</option>{courseOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          <select value={coachFilter} onChange={(event) => setCoachFilter(event.target.value)} className="apple-input"><option value="all">全部教練</option>{coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="apple-input"><option value="all">全部狀態</option><option value="anomaly">只看異常</option><option value="on_time">準時</option><option value="late">遲到</option><option value="not_checked_in">應到未簽到</option><option value="substitute_absent">代班未到</option><option value="missing_start_time">未設定時間</option></select>
          <button type="button" onClick={load} className="apple-button-outline min-h-11 gap-2 px-4"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />重新整理</button>
        </div>
        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        <div className="mt-4 space-y-2">
          {loading && !items.length ? <p className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></p> : filtered.map((item) => {
            const latestAudit = audits.find((audit) => audit.assignment_id === item.id)
            const anomaly = ['not_checked_in', 'substitute_absent', 'missing_start_time'].includes(item.attendanceState) || (item.leaveStatus === 'approved' && !item.actualCoachId)
            return <details key={item.id} className={`rounded-lg border ${anomaly ? 'border-red-200 bg-red-50/40' : 'border-black/10 bg-white'}`}><summary className="grid cursor-pointer list-none gap-2 p-3 text-sm md:grid-cols-[140px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_140px_130px] md:items-center"><span className="font-black">{formatDate(item.sessionDate)} {item.startTime || '未設定'}</span><span className="truncate font-bold">{item.courseName}</span><span className="truncate">原定：{item.scheduledCoachName}</span><span className="truncate">實際：{item.actualCoachName || '待安排'}</span><span className={`font-black ${anomaly ? 'text-red-700' : 'text-apple-gray-700'}`}>{attendanceLabel[item.attendanceState] || item.attendanceState}</span><span className="text-xs font-bold text-violet-700">{item.salaryStatusLabel}</span></summary><div className="border-t border-black/10 p-4">
              <div className="grid gap-2 text-xs font-semibold text-apple-gray-600 sm:grid-cols-2 lg:grid-cols-4"><p>角色：{item.coachRole === 'substitute' ? '代班教練' : item.coachRole === 'head_coach' ? '主教練' : item.coachRole === 'assistant' ? '助教' : '教練'}</p><p>排班：{item.leaveStatus === 'requested' ? '請假待核對' : item.leaveStatus === 'approved' ? '請假已核准' : item.leaveStatus === 'rejected' ? '請假已拒絕' : '原定排班'}</p><p>代班：{item.substituteCoachName ? `${item.substituteCoachName}（${item.substituteResponse === 'accepted' ? '已接受' : item.substituteResponse === 'rejected' ? '已拒絕' : '待回覆'}）` : '未安排'}</p><p>簽到：{item.checkedInAt ? `${formatDate(item.checkedInAt, true)}${item.manualCorrection ? '（人工修正）' : ''}` : '尚無記錄'}</p></div>
              {item.leaveReason ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-800">請假原因：{item.leaveReason}{item.recommendedSubstituteName ? `｜原教練推薦：${item.recommendedSubstituteName}` : ''}</p> : null}
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {item.leaveStatus === 'requested' ? <><button type="button" disabled={saving === item.id} onClick={() => action(item.id, { action: 'review_leave', decision: 'approved', reason: reasonPrompt('核准備註（可留空）', false) || '' })} className="rounded-lg bg-black px-3 py-2.5 text-xs font-bold text-white">核准請假</button><button type="button" disabled={saving === item.id} onClick={() => { const reason = reasonPrompt('拒絕原因（必填）'); if (reason) action(item.id, { action: 'review_leave', decision: 'rejected', reason }) }} className="rounded-lg border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-700">拒絕請假</button></> : null}
                {item.leaveStatus === 'approved' || item.leaveStatus === 'requested' ? <><select value={substituteByItem[item.id] ?? item.substituteCoachId} onChange={(event) => setSubstituteByItem((current) => ({ ...current, [item.id]: event.target.value }))} className="apple-input py-2 text-xs"><option value="">選擇代班教練</option>{coaches.filter((coach) => coach.id !== item.scheduledCoachId).map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}</select><button type="button" disabled={!substituteByItem[item.id] && !item.substituteCoachId} onClick={() => { const reason = reasonPrompt('指定／更換代班原因（開課後必填）', false); action(item.id, { action: 'assign_substitute', substituteCoachId: substituteByItem[item.id] || item.substituteCoachId, reason: reason || '' }) }} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs font-bold">指定／更換代班</button></> : null}
                {item.substituteResponse === 'accepted' ? <button type="button" onClick={() => action(item.id, { action: 'confirm_substitute', reason: '' })} className="rounded-lg bg-blue-700 px-3 py-2.5 text-xs font-bold text-white">最終確認代班</button> : null}
                {item.substituteCoachId && item.substituteResponse !== 'accepted' ? <button type="button" onClick={() => { const reason = reasonPrompt('緊急確認代班原因（必填）'); if (reason) action(item.id, { action: 'confirm_substitute', emergency: true, reason }) }} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800">緊急確認代班</button> : null}
                <button type="button" onClick={() => { const reason = reasonPrompt('人工修正原因（必填）'); if (!reason) return; const state = window.prompt('輸入 on_time、late 或 not_checked_in', item.attendanceState === 'late' ? 'late' : item.attendanceState === 'on_time' ? 'on_time' : 'not_checked_in')?.trim(); if (state) action(item.id, { action: 'manual_correction', attendanceState: state, reason }) }} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs font-bold">人工修正出勤</button>
              </div>
              {latestAudit ? <p className="mt-3 text-[11px] font-semibold text-apple-gray-500">最近稽核：{latestAudit.action} · {formatDate(latestAudit.created_at, true)}{latestAudit.reason ? ` · ${latestAudit.reason}` : ''}</p> : null}
            </div></details>
          })}
          {!loading && !filtered.length ? <p className="rounded-lg border border-dashed border-black/15 p-8 text-center text-sm font-semibold text-apple-gray-500">目前沒有符合篩選條件的課次。</p> : null}
        </div>
        <p className="mt-4 rounded-lg bg-violet-50 p-3 text-xs font-bold leading-5 text-violet-800">課酬目前只預留事實來源與狀態欄位，所有課次統一顯示「待設定課酬」；尚未啟用金額、扣薪、結算或付款。</p>
      </div>
    </details>
  )
}
