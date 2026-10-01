'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/app/language-context'
import { localizeTrainingFeedback } from '@/lib/training-feedback-language'
import { Check, LockKeyhole, Mail, MessageSquareText, RefreshCw, Search, UsersRound } from 'lucide-react'
import CoachSubNav from '@/components/CoachSubNav'
import CoachRegistrationDetails from '@/components/coach/CoachRegistrationDetails'
import StudentDisplayToggle, { useStudentDisplay } from '@/components/coach/StudentDisplayToggle'
import { fetchCoachRoster } from '@/lib/coach-roster-client'
import type { CoachRosterPayload, OwnRosterStudent } from '@/lib/coach-roster'
import type { PaymentOrderStatus } from '@/lib/payment'

const statusLabels = { approved: '已入帳', pending_review: '待核對', pending_transfer: '待匯款', rejected: '已退回' }
const statusLabelsEn = { approved: 'Payment confirmed', pending_review: 'Pending review', pending_transfer: 'Awaiting transfer', rejected: 'Returned' }

function OwnStudentCard({ student, compact, english }: { student: OwnRosterStudent; compact: boolean; english: boolean }) {
  const statusClass = student.status === 'approved' ? 'bg-green-50 text-green-700'
    : student.status === 'rejected' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800'
  return (
    <article className={`min-w-0 rounded-xl border border-black/10 bg-white ${compact ? 'px-3 py-2.5 sm:grid sm:grid-cols-[minmax(180px,1fr)_2fr] sm:gap-x-4' : 'p-5 sm:p-6'}`}>
      <div className={`flex items-start justify-between gap-3 ${compact ? '' : 'mb-4'}`}>
        <div className="min-w-0">
          <h3 className={`${compact ? 'text-base' : 'text-xl'} break-words font-black text-apple-gray-900`}>{student.name}</h3>
          {student.email && <p className="mt-1 flex items-center gap-2 break-all text-xs text-apple-gray-500"><Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{student.email}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>{(english ? statusLabelsEn : statusLabels)[student.status]}</span>
      </div>
      {(student.goal || student.pb) && <div className={`grid gap-2 text-sm ${compact ? 'mt-2 sm:grid-cols-2' : 'mb-3 rounded-lg bg-apple-gray-50 p-3'}`}>
        {student.goal && <p><span className="mr-2 text-xs text-apple-gray-500">{english ? 'Goal' : '目標'}</span>{student.goal}</p>}
        {student.pb && <p><span className="mr-2 text-xs text-apple-gray-500">PB</span>{student.pb}</p>}
      </div>}
      <div className={compact ? 'mt-1 sm:col-span-2' : 'mt-3'}><CoachRegistrationDetails fields={student.fields} compact={compact} /></div>
      {student.hasFormalAccess ? <details className={`${compact ? 'mt-1 text-xs sm:col-span-2' : 'mt-4 rounded-lg bg-apple-gray-50 p-3 text-sm'}`}>
        <summary className="cursor-pointer py-1 font-bold"><MessageSquareText aria-hidden="true" className="mr-2 inline h-4 w-4" />{english ? 'Recent feedback' : '最近回饋'}</summary>
        {student.recentFeedback.length ? <div className="mt-2 space-y-2">{student.recentFeedback.map(feedback => <div key={feedback.id} className="rounded-lg bg-white p-3 text-sm">
          <div className="mb-1 flex items-center justify-between gap-3"><span>{new Date(feedback.created_at).toLocaleDateString(english ? 'en' : 'zh-TW')}</span><span>RPE {feedback.rpe ?? '—'}</span></div>
          <p data-training-feedback translate={english ? 'no' : undefined} className="whitespace-pre-line leading-6">{feedback.feeling ? localizeTrainingFeedback(feedback.feeling, english ? 'en' : 'zh-TW') : (english ? 'No written feedback.' : '尚無文字回饋。')}</p>
        </div>)}</div> : <p className="mt-2 leading-6 text-apple-gray-500">{english ? 'No training feedback yet.' : '尚未提交訓練回饋。'}</p>}
      </details> : student.status !== 'approved' && <p className="mt-2 text-xs leading-5 text-apple-gray-500 sm:col-span-2">{english ? 'Visible on the roster; formal class access opens after payment confirmation.' : '報名已列入名單；確認入帳後才開放正式上課權限。'}</p>}
    </article>
  )
}

export default function CoachStudentsClient({ previewRoster, initialSeasonId = '', initialCourseId = '' }: {
  previewRoster?: CoachRosterPayload; initialSeasonId?: string; initialCourseId?: string
} = {}) {
  const { language } = useLanguage()
  const english = language === 'en'
  const [display, setDisplay] = useStudentDisplay()
  const compact = display === 'compact'
  const [roster, setRoster] = useState<CoachRosterPayload | null>(previewRoster ?? null)
  const [requestedSeasonId, setRequestedSeasonId] = useState(initialSeasonId)
  const [scope, setScope] = useState<'own' | 'other'>('own')
  const [courseId, setCourseId] = useState(initialCourseId)
  const [status, setStatus] = useState<'all' | PaymentOrderStatus>('all')
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(!previewRoster)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (previewRoster) return
    const controller = new AbortController()
    setIsLoading(true)
    setError('')
    fetchCoachRoster(requestedSeasonId, controller.signal).then(payload => {
      if (!controller.signal.aborted) setRoster(payload)
    }).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '讀取班級名單失敗。')
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [requestedSeasonId, retry, previewRoster])

  const courses = (roster?.courses ?? []).filter(course => course.isOwn === (scope === 'own'))
  const selected = courses.find(course => course.id === courseId) ?? courses[0]
  const season = roster?.seasons.find(item => item.id === roster.selectedSeasonId)
  const historical = season?.status === 'archived' || season?.status === 'completed'
  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (selected?.students ?? []).filter(student => {
      if (student.visibility === 'own' && (status === 'all' ? student.status === 'rejected' : student.status !== status)) return false
      const values = student.visibility === 'own' ? [student.name, student.email, student.goal, student.pb] : [student.name]
      return !term || values.some(value => value.toLowerCase().includes(term))
    })
  }, [selected, query, status])

  function changeScope(next: 'own' | 'other') { setScope(next); setCourseId(''); setStatus('all'); setQuery('') }

  return (
    <div className="min-h-screen bg-apple-gray-50 pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8"><div className="container mx-auto max-w-7xl">
        <CoachSubNav />
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="mb-2 text-xs font-bold text-apple-blue">{english ? 'CLASS ROSTERS' : '班級報名名單'}</p>
            <h1 className="text-3xl font-black sm:text-4xl">{english ? 'Student roster' : '學員列表'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-apple-gray-600">{english ? 'All class registrations appear here, including those awaiting transfer or payment review.' : '按季度、班級查看所有報名學員，包含待匯款與尚未核帳的報名。'}</p>
          </div>
          <label className="flex shrink-0 items-center gap-3 text-sm font-bold">{english ? 'Quarter' : '季度'}
            <select aria-label={english ? 'Quarter' : '季度'} disabled={isLoading || !roster?.seasons.length} value={requestedSeasonId || roster?.selectedSeasonId || ''}
              onChange={event => { setRequestedSeasonId(event.target.value); setCourseId(''); setStatus('all'); setQuery('') }}
              className="min-h-11 max-w-full rounded-lg border border-black/15 bg-white px-3 pr-8 text-sm font-semibold focus:border-apple-blue focus:outline-none focus:ring-2 focus:ring-apple-blue/20">
              {!roster?.seasons.length && <option value="">{english ? 'Loading…' : '讀取中…'}</option>}
              {roster?.seasons.map(item => <option key={item.id} value={item.id}>{item.name}{item.status === 'archived' ? (english ? ' · Archived' : ' · 已封存') : ''}</option>)}
            </select>
          </label>
        </header>
        <div role="group" aria-label={english ? 'Class scope' : '班級範圍'} className="mb-5 inline-flex gap-1 rounded-lg border border-black/10 bg-white p-1">
          {(['own', 'other'] as const).map(value => <button key={value} type="button" aria-pressed={scope === value} disabled={isLoading} onClick={() => changeScope(value)}
            className={`min-h-10 rounded-md px-4 text-sm font-bold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue ${scope === value ? 'bg-black text-white' : 'text-apple-gray-600 hover:bg-apple-gray-100'}`}>
            {value === 'own' ? (english ? 'My classes' : '我的班級') : (english ? 'Other classes' : '其他班級')}
          </button>)}
        </div>
        {historical && <p className="mb-4 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">{english ? 'This quarter has ended. Rosters are read-only.' : '這個季度已結束，名單僅供查閱。'}</p>}
        {error ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p>{english ? 'Unable to load the roster. Please try again.' : error}</p>
          <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-4 font-bold"><RefreshCw className="h-4 w-4" />{english ? 'Retry' : '重新讀取'}</button>
        </div> : isLoading ? <div role="status" className="rounded-xl border border-black/10 bg-white p-10 text-center text-apple-gray-600"><RefreshCw aria-hidden="true" className="mx-auto mb-3 h-5 w-5 motion-safe:animate-spin" />{english ? 'Loading class rosters…' : '正在讀取班級名單…'}</div> : <>
          {courses.length > 0 && <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{courses.map(course => <button key={course.id} type="button" onClick={() => { setCourseId(course.id); setStatus('all'); setQuery('') }} aria-pressed={selected?.id === course.id}
            className={`min-w-0 rounded-xl border p-4 text-left motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue ${selected?.id === course.id ? 'border-apple-blue bg-blue-50' : 'border-black/10 bg-white hover:border-black/30'}`}>
            <span className="flex items-start justify-between gap-2"><span className="text-sm font-bold leading-6">{course.name}</span>{selected?.id === course.id && <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-apple-blue" />}</span>
            <span className="mt-2 block text-sm text-apple-gray-600"><strong className="mr-1 text-2xl font-black text-black">{course.registeredCount}</strong>{english ? 'registered' : '位已報名'}</span>
            {course.paymentCounts && <span className="mt-2 block text-xs leading-5 text-apple-gray-500">{english ? 'Confirmed' : '已入帳'} {course.paymentCounts.approved} · {english ? 'Review' : '待核對'} {course.paymentCounts.pending_review} · {english ? 'Transfer' : '待匯款'} {course.paymentCounts.pending_transfer}</span>}
          </button>)}</div>}
          {selected ? <>
            <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div><h2 className="text-xl font-black sm:text-2xl">{selected.name}</h2><p className="mt-1 text-sm text-apple-gray-500">{english ? `${selected.registeredCount} registered students` : `已報名 ${selected.registeredCount} 位`}
                {(selected.paymentCounts?.rejected ?? 0) > 0 && (english ? ` · ${selected.paymentCounts!.rejected} returned records` : ` · 另有 ${selected.paymentCounts!.rejected} 筆退回紀錄`)}</p></div>
              <StudentDisplayToggle value={display} onChange={setDisplay} />
            </div>
            {!selected.isOwn && <p className="mb-4 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-apple-gray-600"><LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0" />{english ? 'Other classes show names and registration counts only. Personal details and individual payment status are private.' : '其他班級僅顯示姓名與報名人數，個人資料和個別繳費狀態不開放查看。'}</p>}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" /><input aria-label={english ? 'Search students' : '搜尋學員'} value={query} onChange={event => setQuery(event.target.value)}
                placeholder={selected.isOwn ? (english ? 'Search name, email or goal' : '搜尋姓名、Email 或目標') : (english ? 'Search name' : '搜尋姓名')}
                className="min-h-11 w-full rounded-lg border border-black/15 bg-white py-2 pl-10 pr-3 text-sm focus:border-apple-blue focus:outline-none focus:ring-2 focus:ring-apple-blue/20" /></div>
              {selected.isOwn && <select aria-label={english ? 'Payment status' : '繳費狀態'} value={status} onChange={event => setStatus(event.target.value as typeof status)} className="min-h-11 rounded-lg border border-black/15 bg-white px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue">
                <option value="all">{english ? 'All registrations' : '全部報名'}</option>
                {(['approved', 'pending_review', 'pending_transfer', 'rejected'] as const).map(value => <option key={value} value={value}>{(english ? statusLabelsEn : statusLabels)[value]} · {selected.paymentCounts?.[value] ?? 0}</option>)}
              </select>}
            </div>
            <p className="mb-3 text-xs text-apple-gray-500" aria-live="polite">{english ? `${filteredStudents.length} results` : `顯示 ${filteredStudents.length} 位`}</p>
            {filteredStudents.length ? <div className={compact ? 'grid gap-1.5' : selected.isOwn ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>{filteredStudents.map(student => student.visibility === 'own'
              ? <OwnStudentCard key={student.id} student={student} compact={compact} english={english} />
              : <article key={student.id} className={`rounded-lg border border-black/10 bg-white font-bold ${compact ? 'px-3 py-2.5 text-sm' : 'p-5 text-base'}`}>{student.name}</article>)}</div>
              : <div className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center"><UsersRound aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-apple-gray-400" /><p className="font-bold">{english ? 'No matching students' : '目前沒有符合條件的學員'}</p><p className="mt-2 text-sm text-apple-gray-500">{query || status !== 'all' ? (english ? 'Try clearing your search or changing the status filter.' : '可以清除搜尋或切換繳費狀態再查看。') : (english ? 'New registrations will appear here, even before payment confirmation.' : '學員完成報名後，就會出現在這裡，不需要先完成核帳。')}</p></div>}
          </> : <div className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center"><p className="font-bold">{scope === 'own' ? (english ? 'No assigned classes this quarter' : '這個季度尚未安排你的任課班級') : (english ? 'No other classes this quarter' : '這個季度沒有其他班級')}</p>{scope === 'own' && <button type="button" onClick={() => changeScope('other')} className="mt-4 min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white">{english ? 'View other classes' : '查看其他班級名單'}</button>}</div>}
        </>}
      </div></section>
    </div>
  )
}
