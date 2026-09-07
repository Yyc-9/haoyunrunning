'use client'

import { useEffect, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  UserRoundCheck,
  X,
} from 'lucide-react'
import { APP_TIME_ZONE_LABEL } from '@/lib/app-time'

export type DutyItem = {
  id: string
  courseName: string
  location: string
  sessionDate: string
  startTime: string
  scheduledCoachId: string
  scheduledCoachName: string
  actualCoachId: string
  actualCoachName: string
  coachRole?: 'head_coach' | 'coach' | 'assistant' | 'substitute' | string
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
  leaveReason: string
  substituteCoachId: string
  substituteCoachName: string
  substituteResponse: 'none' | 'pending' | 'accepted' | 'rejected'
  adminStatus: 'not_required' | 'pending' | 'approved' | 'rejected'
  adminReason?: string
  attendanceState: string
  checkedInAt: string
  punctuality: '' | 'on_time' | 'late'
  manualCorrection?: boolean
  canViewCheckIn: boolean
  canCheckIn: boolean
  checkInOpensAt: string
  canRequestLeave: boolean
  canRespondSubstitute: boolean
  managedByAdmin: boolean
  isCancelled: boolean
  salaryStatusLabel?: string
}

export type CoachOption = { id: string; name: string }

export type DutyAction =
  | { intent: 'check_in'; reason?: string }
  | { intent: 'respond_substitute'; response: 'accepted' | 'rejected' }
  | { intent: 'request_leave'; reason: string; invitedSubstituteId?: string }

export type DutyTask = 'check_in' | 'leave' | 'substitute'

export const stateMeta: Record<string, { label: string; chip: string; dot: string }> = {
  upcoming: { label: '尚未開放', chip: 'border-sky-200 bg-sky-50 text-sky-800', dot: 'bg-sky-400' },
  check_in_open: { label: '現在可簽到', chip: 'border-[#176b67] bg-[#176b67] text-white', dot: 'bg-[#176b67]' },
  on_time: { label: '準時簽到', chip: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  late: { label: '遲到簽到', chip: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  not_checked_in: { label: '未簽到，待確認', chip: 'border-amber-200 bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  substitute_absent: { label: '代班未簽到，待確認', chip: 'border-amber-200 bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  cancelled: { label: '本堂停課', chip: 'border-gray-200 bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  missing_start_time: { label: '請補齊開始時間', chip: 'border-red-200 bg-red-50 text-red-800', dot: 'bg-red-500' },
  leave_approved: { label: '已請假，待完成代班', chip: 'border-orange-200 bg-orange-50 text-orange-800', dot: 'bg-orange-500' },
}

const roleLabels: Record<string, string> = {
  head_coach: '主教練',
  coach: '教練',
  assistant: '助教',
  substitute: '代班教練',
}

export function formatDutyDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${value}T12:00:00+08:00`))
}

export function formatDutyTime(value: string) {
  if (!value) return ''
  if (/^\d{1,2}:\d{2}/.test(value)) return value.slice(0, 5)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function checkInLabel(item: DutyItem) {
  if (item.checkedInAt) return item.punctuality === 'late' ? '已完成遲到簽到' : '已完成準時簽到'
  if (item.canCheckIn) return item.managedByAdmin ? '確認教練到課' : '本人到課簽到'
  if (item.attendanceState === 'missing_start_time') return '尚未設定簽到時間'
  if (['not_checked_in', 'substitute_absent'].includes(item.attendanceState)) return '簽到時間已結束'
  if (item.checkInOpensAt) return `將於 ${formatDutyTime(item.checkInOpensAt)} 開放簽到`
  return '簽到尚未開放'
}

function leaveSummary(item: DutyItem) {
  if (item.substituteResponse === 'accepted' && item.adminStatus === 'pending') return `原教練已請假｜代班 ${item.substituteCoachName} 已接受，等待管理員確認`
  if (item.substituteResponse === 'accepted') return `原教練已請假｜代班 ${item.substituteCoachName} 已接受並生效`
  if (item.substituteResponse === 'rejected') return `代班 ${item.substituteCoachName || '教練'} 已拒絕，可重新邀請其他教練`
  if (item.substituteCoachName) return `請假邀請已送出｜等待 ${item.substituteCoachName} 回覆`
  return `請假：${item.leaveStatus === 'approved' ? '已核准' : item.leaveStatus === 'rejected' ? '已拒絕' : '處理中'}｜待管理員安排代班`
}

type CoachDutyDetailsProps = {
  item: DutyItem
  dateItems?: DutyItem[]
  coaches: CoachOption[]
  activeTask: DutyTask
  onTaskChange: (task: DutyTask) => void
  leaveReason: string
  invitedSubstituteId: string
  onLeaveReasonChange: (value: string) => void
  onInvitedSubstituteChange: (value: string) => void
  manualReason: string
  onManualReasonChange: (value: string) => void
  onAction: (action: DutyAction) => void
  savingKey: string
  onClose: () => void
  onSelectItem?: (id: string) => void
}

export default function CoachDutyDetails({
  item,
  dateItems = [],
  coaches,
  activeTask,
  onTaskChange,
  leaveReason,
  invitedSubstituteId,
  onLeaveReasonChange,
  onInvitedSubstituteChange,
  manualReason,
  onManualReasonChange,
  onAction,
  savingKey,
  onClose,
  onSelectItem,
}: CoachDutyDetailsProps) {
  const meta = stateMeta[item.attendanceState] ?? stateMeta.upcoming
  const actionKey = `${item.id}:${activeTask}`
  const isSaving = savingKey === item.id || savingKey === actionKey
  const [leaveOpen, setLeaveOpen] = useState(activeTask === 'leave')
  const availableCoaches = coaches.filter((coach) => coach.id !== item.scheduledCoachId)

  useEffect(() => {
    setLeaveOpen(activeTask === 'leave')
  }, [activeTask, item.id])

  function chooseTask(task: DutyTask) {
    onTaskChange(task)
    setLeaveOpen(task === 'leave')
  }

  return (
    <div className="text-black">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-apple-blue">授課安排</p>
          <h3 className="mt-1 text-xl font-black text-black">{item.courseName}</h3>
          <p className="mt-1 text-sm font-bold text-apple-gray-600">{formatDutyDate(item.sessionDate)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="關閉課程詳情" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-blue">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {dateItems.length > 1 && onSelectItem ? (
        <div className="mt-4 border-b border-black/10 pb-4">
          <p className="mb-2 text-xs font-black text-apple-gray-500">同日 {dateItems.length} 堂課</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="同日課程">
            {dateItems.map((dateItem) => {
              const active = dateItem.id === item.id
              return (
                <button
                  key={dateItem.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectItem(dateItem.id)}
                  className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-xs font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-blue ${active ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black'}`}
                >
                  {formatDutyTime(dateItem.startTime) || '--:--'} · {dateItem.courseName}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2 text-base font-semibold leading-6 text-apple-gray-700">
        <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 shrink-0 text-apple-blue" aria-hidden="true" />{formatDutyTime(item.startTime) || '未設定開始時間'}（{APP_TIME_ZONE_LABEL}）</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-apple-blue" aria-hidden="true" />{item.location || '地點待確認'}</p>
        <p>本人角色：{roleLabels[item.coachRole || 'coach'] || '教練'}</p>
        <p>原定教練：{item.scheduledCoachName}</p>
        <p>實際授課：{item.actualCoachName || '待安排'}</p>
      </div>

      {item.managedByAdmin ? (
        <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold leading-6 text-sky-900">
          管理員操作會留下「管理員登記／補登」紀錄；本人簽到與學員出席核實仍是兩份獨立紀錄。
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-3 py-1.5 text-sm font-black ${meta.chip}`}>{meta.label}</span>
        {item.adminStatus === 'pending' ? <span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-black text-orange-800">等待管理員處理</span> : null}
        {item.adminStatus === 'approved' ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-800">管理員已確認</span> : null}
      </div>

      {item.checkedInAt ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{item.manualCorrection ? '管理員登記時間' : '伺服器簽到時間'}：{formatDutyTime(item.checkedInAt)}</p>
      ) : item.checkInOpensAt ? (
        <p className="mt-3 text-sm font-semibold text-apple-gray-600">簽到開放時間：{formatDutyTime(item.checkInOpensAt)}（{APP_TIME_ZONE_LABEL}）</p>
      ) : null}

      {item.canViewCheckIn ? (
        <div className="mt-5">
          {item.managedByAdmin && item.canCheckIn && !item.checkedInAt ? (
            <label className="mb-3 block">
              <span className="mb-2 block text-base font-black text-black">管理員補登原因</span>
              <textarea value={manualReason} onChange={(event) => onManualReasonChange(event.target.value)} rows={3} maxLength={800} className="apple-input min-h-24 resize-y text-base" placeholder="請說明本堂補登原因（必填）" />
            </label>
          ) : null}
          <button
            type="button"
            disabled={!item.canCheckIn || isSaving || Boolean(item.checkedInAt) || (item.managedByAdmin && !manualReason.trim())}
            onClick={() => onAction({ intent: 'check_in', ...(item.managedByAdmin && manualReason.trim() ? { reason: manualReason.trim() } : {}) })}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-blue ${item.checkedInAt
              ? 'cursor-default bg-emerald-100 text-emerald-800'
              : item.canCheckIn
                ? 'bg-[#176b67] text-white hover:bg-[#14534f] active:scale-[0.99]'
                : 'cursor-not-allowed bg-apple-gray-100 text-apple-gray-600'
            }`}
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <UserRoundCheck className="h-5 w-5" aria-hidden="true" />}
            {checkInLabel(item)}
          </button>
          {!item.checkedInAt && item.attendanceState === 'not_checked_in' ? <p className="mt-2 text-sm font-semibold leading-5 text-amber-800">尚未簽到不等於未到課；目前標記為待確認。</p> : null}
        </div>
      ) : null}

      {item.canRespondSubstitute ? (
        <section className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4" aria-labelledby={`substitute-task-${item.id}`}>
          <button type="button" onClick={() => chooseTask('substitute')} className="flex min-h-11 w-full items-center justify-between gap-3 text-left" aria-expanded={activeTask === 'substitute'}>
            <span><span className="block text-sm font-black text-sky-950">代班邀請待回覆</span><span className="mt-1 block text-sm font-semibold leading-5 text-sky-900">邀請人：{item.scheduledCoachName}</span></span>
            <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${activeTask === 'substitute' ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {activeTask === 'substitute' ? (
            <div id={`substitute-task-${item.id}`} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" disabled={isSaving} onClick={() => onAction({ intent: 'respond_substitute', response: 'accepted' })} className="min-h-11 rounded-xl bg-black px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">接受代班</button>
              <button type="button" disabled={isSaving} onClick={() => onAction({ intent: 'respond_substitute', response: 'rejected' })} className="min-h-11 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">拒絕代班</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {item.canRequestLeave ? (
        <section className="mt-4 rounded-xl border border-black/10 bg-apple-gray-50" aria-labelledby={`leave-task-title-${item.id}`}>
          <button type="button" onClick={() => chooseTask(leaveOpen ? 'check_in' : 'leave')} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={leaveOpen}>
            <span className="flex items-center gap-2 text-base font-black"><CalendarClock className="h-5 w-5 text-orange-600" aria-hidden="true" /><span id={`leave-task-title-${item.id}`}>{item.substituteResponse === 'rejected' ? '重新邀請代班教練' : '請假與代班安排'}</span></span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-apple-gray-600"><span className="hidden sm:inline">可選擇由管理員安排</span><ChevronDown className={`h-5 w-5 transition-transform ${leaveOpen ? 'rotate-180' : ''}`} aria-hidden="true" /></span>
          </button>
          {leaveOpen ? (
            <div className="space-y-4 border-t border-black/10 p-4">
              <label className="block">
                <span className="mb-2 block text-base font-black text-black">請假原因</span>
                <textarea value={leaveReason} onChange={(event) => onLeaveReasonChange(event.target.value)} rows={4} maxLength={800} className="apple-input min-h-28 resize-y text-base" placeholder="請填寫請假原因（必填）" />
                <span className="mt-1 block text-xs font-semibold text-apple-gray-600">原因會保留在本堂課審計紀錄中。</span>
              </label>
              <label className="block">
                <span className="mb-2 block text-base font-black text-black">邀請代班（選填）</span>
                <select value={invitedSubstituteId} onChange={(event) => onInvitedSubstituteChange(event.target.value)} className="apple-input min-h-12 text-base">
                  <option value="">不指定，由管理員安排</option>
                  {availableCoaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
                </select>
              </label>
              <button
                type="button"
                disabled={isSaving || !leaveReason.trim()}
                onClick={() => onAction({ intent: 'request_leave', reason: leaveReason.trim(), ...(invitedSubstituteId ? { invitedSubstituteId } : {}) })}
                className="min-h-12 w-full rounded-xl bg-black px-5 py-3 text-base font-black text-white transition hover:bg-apple-gray-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving && activeTask === 'leave' ? <Loader2 className="mr-2 inline h-5 w-5 animate-spin" aria-hidden="true" /> : null}
                {item.substituteResponse === 'rejected' ? '重新送出安排' : '送出請假申請'}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {item.leaveStatus !== 'none' ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-sm font-bold leading-6 text-orange-900">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{leaveSummary(item)}</span>
        </p>
      ) : null}
    </div>
  )
}
