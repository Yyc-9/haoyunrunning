'use client'

import { useState } from 'react'
import { isEnrollmentInAttendanceSession } from '@/lib/coach-attendance-access'
import type { CourseMakeupRequest } from '@/lib/course-attendance'

type Student = { id: string; name: string; email: string; course_season_course_id: string; billing_start_session_date: string | null; status: string }
type RecordRow = { enrollment_id: string; course_season_course_id: string; session_date: string; status: string }
type Props = { courseId: string; dates: string[]; today: string; students: Student[]; records: RecordRow[]; makeups: CourseMakeupRequest[]; cancellations: { course_season_course_id: string; session_date: string }[]; disabled: boolean; onEdit: (id: string, date: string) => void }

export default function AttendanceTermView({ courseId, dates, today, students, records, makeups, cancellations, disabled, onEdit }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [future, setFuture] = useState(false)
  const shownDates = dates.filter(date => future || date <= today)
  const recordIndex = new Map(records.filter(r => r.course_season_course_id === courseId).map(r => [`${r.enrollment_id}:${r.session_date}`, r]))
  const leaveIndex = new Map(makeups.filter(m => m.original_course_season_course_id === courseId).map(m => [`${m.enrollment_id}:${m.original_session_date}`, m]))
  const cancelledDates = new Set(cancellations.filter(c => c.course_season_course_id === courseId).map(c => c.session_date))
  const visitingByDate = new Map<string, Set<string>>()
  for (const makeup of makeups) {
    if (makeup.target_course_season_course_id !== courseId || !makeup.target_session_date || !['scheduled', 'completed', 'forfeited'].includes(makeup.status)) continue
    const ids = visitingByDate.get(makeup.target_session_date) ?? new Set<string>()
    ids.add(makeup.enrollment_id)
    visitingByDate.set(makeup.target_session_date, ids)
  }
  function state(student: Student, date: string) {
    const visiting = visitingByDate.get(date)
    if (!isEnrollmentInAttendanceSession(student, courseId, date, visiting)) return '未入班'
    if (cancelledDates.has(date)) return '停課'
    if (date > today) return '未上課'
    const row = recordIndex.get(`${student.id}:${date}`)
    const leave = leaveIndex.get(`${student.id}:${date}`)
    if (leave?.status === 'completed') return '補課完成'
    return row?.status === 'present' ? '到課' : row?.status === 'excused' ? '請假' : row?.status === 'deducted' ? '已扣除' : '未點名'
  }
  const labels = ['到課', '請假', '已扣除', '補課完成']
  const totals = (s: Student) => labels.map(label => dates.filter(d => d <= today && state(s, d) === label).length)
  const rows = students.filter(s => s.course_season_course_id === courseId || makeups.some(m => m.enrollment_id === s.id && m.target_course_season_course_id === courseId && ['scheduled', 'completed', 'forfeited'].includes(m.status)))
    .filter(s => (s.name || s.email).includes(search.trim()))
    .filter(s => filter === 'all' || filter === 'leave' && totals(s)[1] > 0 || filter === 'pending' && dates.some(d => d <= today && state(s, d) === '未點名') || filter === 'join' && Boolean(s.billing_start_session_date && s.billing_start_session_date > dates[0]))
  function cell(s: Student, date: string) {
    const label = state(s, date)
    return <button type="button" disabled={disabled || label === '未入班' || label === '停課'} onClick={() => onEdit(s.id, date)} aria-label={`${s.name} ${date} ${label}，編輯`} className={`min-h-11 w-full rounded-lg border px-2 text-xs font-bold disabled:opacity-40 ${label === '到課' ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : label === '請假' ? 'border-amber-100 bg-amber-50 text-amber-800' : label === '補課完成' ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-black/10 bg-white text-apple-gray-600'}`}>{label}</button>
  }
  function metrics(s: Student) { return <div className="flex gap-3 text-center">{totals(s).map((n, i) => <span key={labels[i]} className="text-sm font-bold">{n}<small className="block text-[10px] font-normal text-apple-gray-500">{labels[i]}</small></span>)}</div> }
  function exportCsv() {
    const data = [['學員', '計費起點', ...dates, ...labels], ...rows.map(s => [s.name || s.email, s.billing_start_session_date || '', ...dates.map(d => state(s, d)), ...totals(s)])]
    const csv = '\ufeff' + data.map(row => row.map(v => '"' + String(v).replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"').join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = '出勤紀錄.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white">
    <div className="flex flex-wrap items-center gap-3 border-b border-black/10 p-4">
      <input className="apple-input min-w-0 sm:max-w-56" type="search" aria-label="搜尋學生姓名" placeholder="搜尋學生姓名" value={search} onChange={e => setSearch(e.target.value)} />
      <select className="apple-input sm:max-w-40" aria-label="篩選學生" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部學生</option><option value="leave">有請假</option><option value="pending">待點名</option><option value="join">插班生</option></select>
      <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={future} onChange={e => setFuture(e.target.checked)} />包含未上課課次</label>
      <button type="button" className="apple-button-outline min-h-11 px-4 text-xs" onClick={exportCsv}>匯出紀錄</button>
    </div>
    <p className="p-4 text-xs text-apple-gray-500">{rows.length} 位學生 · 已到課日 {dates.filter(d => d <= today).length} / {dates.length} 堂。累計不含未入班、停課及未上課課次。</p>
    <div className="hidden overflow-x-auto md:block" role="region" aria-label="整期出勤總表" tabIndex={0}><table className="w-full border-collapse text-sm"><thead><tr className="bg-apple-gray-50 text-left"><th className="sticky left-0 z-10 min-w-40 bg-apple-gray-50 p-4">學員</th><th className="min-w-52 p-4">本期累計</th>{shownDates.map(d => <th key={d} className="min-w-24 p-2 text-center">{d.slice(5).replace('-', '/')}<small className="block font-normal">第 {dates.indexOf(d) + 1} 堂</small></th>)}</tr></thead><tbody>{rows.map(s => <tr key={s.id} className="border-t border-black/5"><th scope="row" className="sticky left-0 z-10 bg-white p-4 text-left">{s.name || s.email}<small className="mt-1 block font-normal text-apple-gray-500">{s.billing_start_session_date || '起點未設定'}</small></th><td className="p-4">{metrics(s)}</td>{shownDates.map(d => <td key={d} className="p-2">{cell(s, d)}</td>)}</tr>)}</tbody></table></div>
    <div className="md:hidden">{rows.map(s => <details key={s.id} className="border-t border-black/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4"><span className="min-w-0 break-words font-bold">{s.name || s.email}<small className="block text-xs font-normal text-apple-gray-500">點開查看課次</small></span>{metrics(s)}</summary><div className="grid grid-cols-3 gap-3 bg-apple-gray-50 p-4">{shownDates.map(d => <div key={d}><p className="mb-1 text-center text-xs">{d.slice(5).replace('-', '/')}</p>{cell(s, d)}</div>)}</div></details>)}</div>
    {!rows.length || !shownDates.length ? <p className="p-6 text-center text-sm text-apple-gray-500">{!rows.length ? '沒有符合條件的學生。' : '尚無已上課課次，可勾選包含未上課課次。'}</p> : null}
  </section>
}
