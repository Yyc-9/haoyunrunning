'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, CalendarCheck2, Check, Loader2, X } from 'lucide-react'
import { formatAttendanceDate, type CoachLeaveOption } from '@/lib/course-attendance'

export type CoachLeaveChoice = { leaveMode: 'in_person' | 'self_training'; targetCourseSeasonCourseId?: string; targetSessionDate?: string }

export default function CoachLeaveDialog({ studentName, sessionDate, loadOptions, onSave, onClose }: {
  studentName: string
  sessionDate: string
  loadOptions: () => Promise<CoachLeaveOption[]>
  onSave: (choice: CoachLeaveChoice) => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'in_person' | 'self_training' | null>(null)
  const [options, setOptions] = useState<CoachLeaveOption[]>([])
  const [courseId, setCourseId] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    loadOptions().then(result => { if (active) setOptions(result) }).catch(() => { if (active) setLoadError('補課課次讀取失敗，請重試。') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadOptions, retry])
  const course = options.find(item => item.courseId === courseId)
  const selectedSession = course?.sessions.find(item => item.date === date)
  const ready = mode === 'self_training' || (mode === 'in_person' && Boolean(selectedSession && selectedSession.remaining > 0))
  async function save() {
    if (!ready || !mode || saving) return
    setSaving(true)
    setError('')
    try {
      await onSave({ leaveMode: mode, ...(mode === 'in_person' ? { targetCourseSeasonCourseId: courseId, targetSessionDate: date } : {}) })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '儲存失敗，請重試。')
    } finally { setSaving(false) }
  }
  return <dialog ref={dialog} aria-labelledby="coach-leave-title" onCancel={event => { if (saving) event.preventDefault(); else onClose() }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/40">
    <div className="border-b border-black/10 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4"><h2 id="coach-leave-title" className="text-xl font-black">請假處理方式</h2><button type="button" onClick={onClose} disabled={saving} aria-label="關閉請假視窗" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-40"><X className="h-5 w-5" /></button></div>
      <p className="mt-1 text-sm text-gray-600">{studentName} · {formatAttendanceDate(sessionDate)}</p>
    </div>
    <div className="space-y-4 p-5 sm:p-6">
      <p className="text-sm text-gray-600">請選擇本次請假的處理方式。</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          { value: 'in_person', label: '選擇線下補課', description: '選擇班級與課次，加入補課名單。', Icon: CalendarCheck2 },
          { value: 'self_training', label: '教練已給課表，自主訓練', description: '本次請假不再保留線下補課資格。', Icon: BookOpen },
        ] as const).map(({ value, label, description, Icon }) => <button key={value} type="button" disabled={saving} aria-pressed={mode === value} onClick={() => { setMode(value); setError('') }} className={`rounded-xl border-2 p-4 text-left transition-colors motion-reduce:transition-none ${mode === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-400'}`}><span className="flex items-center justify-between"><Icon className="h-6 w-6 text-blue-700" />{mode === value && <Check className="h-5 w-5 text-blue-700" />}</span><span className="mt-3 block text-sm font-bold">{label}</span><span className="mt-2 block text-xs leading-5 text-gray-600">{description}</span></button>)}
      </div>
      {mode === 'in_person' && <div className="space-y-3 rounded-xl border border-gray-200 p-4">
        <p className="text-xs leading-5 text-gray-600">可選本季度、原請假課次之後的其他班級。已停課或已開始的課次不列入；滿班課次無法預約。</p>
        {loading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />正在讀取補課課次</p> : loadError ? <div role="alert" className="text-sm text-red-700">{loadError}<button type="button" className="ml-2 min-h-11 underline" onClick={() => setRetry(value => value + 1)}>重新讀取</button></div> : <>
          <label className="block text-sm font-semibold">補課班級<select disabled={saving} className="apple-input mt-2" value={courseId} onChange={event => { setCourseId(event.target.value); setDate('') }}><option value="">請選擇班級</option>{options.map(item => <option key={item.courseId} value={item.courseId} disabled={!item.sessions.some(session => session.remaining > 0)}>{item.courseName}{!item.sessions.some(session => session.remaining > 0) ? '（無可預約課次）' : ''}</option>)}</select></label>
          <label className="block text-sm font-semibold">補課課次<select disabled={saving || !course} className="apple-input mt-2" value={date} onChange={event => setDate(event.target.value)}><option value="">請選擇課次</option>{course?.sessions.map(session => <option key={session.date} value={session.date} disabled={session.remaining <= 0}>{formatAttendanceDate(session.date)} · {course.classTime} · {session.remaining > 0 ? `剩餘 ${session.remaining} 位` : '已滿'}</option>)}</select></label>
          {!options.some(item => item.sessions.some(session => session.remaining > 0)) && <p role="status" className="text-sm text-amber-800">目前沒有可預約的線下補課課次。可先關閉視窗，與學員確認後再處理。</p>}
        </>}
      </div>}
      {mode === 'self_training' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">確認表示教練已提供這次的自主訓練課表。儲存後，本次請假不能再改為線下補課，也不能取消請假恢復到課；其他正常課次不受影響。</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
    <div className="flex flex-wrap justify-end gap-3 border-t border-black/10 p-5 sm:p-6"><button type="button" disabled={saving} onClick={onClose} className="apple-button-outline min-h-11 px-5">取消</button><button type="button" disabled={!ready || saving} onClick={() => void save()} className="apple-button-primary min-h-11 gap-2 px-5 disabled:opacity-40">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? '正在儲存' : mode === 'self_training' ? '確認自主訓練' : mode === 'in_person' ? '確認請假與補課' : '請先選擇處理方式'}</button></div>
  </dialog>
}
