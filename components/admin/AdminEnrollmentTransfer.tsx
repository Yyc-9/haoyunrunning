'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/app/language-context'
import { toEnglishWebsiteText } from '@/lib/english-website'

type Context = {
  enrollment: { name: string; preferred_course: string; amount_text: string; status: string }
  courses: Array<{ id: string; name: string; sessionDates: string[] }>
  sourceDates: string[]
}
type Preview = { fingerprint: string; studentName: string; previousCourse: string; amountText: string; paymentStatus: string; attendanceCount: number; checkinCount: number; makeupCount: number; next: { courseName: string; startDate: string } }
async function transferFetch(path: string, body?: Record<string, unknown>) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!data.session) throw new Error('請重新登入。')
  const response = await fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: {
    Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || '轉班操作失敗。')
  return payload
}
export default function AdminEnrollmentTransfer({ enrollmentId, onSaved }: { enrollmentId: string; onSaved: () => Promise<void> }) {
  const { language } = useLanguage()
  const en = language === 'en'
  const [context, setContext] = useState<Context | null>(null)
  const [targetId, setTargetId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [mode, setMode] = useState('preserve_history')
  const [dateMap, setDateMap] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const course = context?.courses.find(item => item.id === targetId)
  const report = (cause: unknown) => { const message = cause instanceof Error ? cause.message : String(cause); setError(en ? toEnglishWebsiteText(message) : message) }
  async function load() {
    setBusy(true); setError('')
    try { setContext(await transferFetch(`/api/admin/enrollment-transfer?enrollmentId=${encodeURIComponent(enrollmentId)}`)) }
    catch (cause) { report(cause) } finally { setBusy(false) }
  }
  async function submit(action: 'preview' | 'apply') {
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = await transferFetch('/api/admin/enrollment-transfer', { action, enrollmentId, targetId, startDate, mode, dateMap: mode === 'move_records' ? dateMap : {}, reason, fingerprint: preview?.fingerprint })
      if (action === 'preview') setPreview(result)
      else { setDone(true); setPreview(null) }
    } catch (cause) { report(cause); if (action === 'apply') setPreview(null) }
    finally { setBusy(false) }
  }
  if (done) return <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p role="status">{en ? 'Transfer completed. Payment records were retained.' : '轉班已完成，付款紀錄已保留。'}</p><button type="button" className="apple-button-primary mt-3" onClick={() => void onSaved()}>{en ? 'Refresh roster' : '重新載入名冊'}</button></section>
  return <section className="mt-5 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
    <h4 className="font-black">{en ? 'Transfer to another class' : '轉班與點名移轉'}</h4>
    <p className="mt-2 text-sm leading-6">{en ? 'Keep the payment amount and receipt history. Choose whether to retain attendance in the original class or map existing sessions to the new class. Spreadsheet sync cannot undo this transfer.' : '保留原付款金額與核款歷史。可保留原班出席歷史，或逐堂指定移到新班的課次。舊表格同步不會覆蓋已確認的轉班。'}</p>
    {!context ? <button type="button" disabled={busy} className="apple-button-outline mt-3" onClick={() => void load()}>{en ? 'Set up transfer' : '設定轉班'}</button> : <>
      <fieldset disabled={busy || Boolean(preview)} className="mt-3 grid gap-3 disabled:opacity-60">
        <label className="grid gap-2 text-sm font-bold">{en ? 'New class' : '新班級'}<select className="apple-input bg-white" value={targetId} onChange={event => { setTargetId(event.target.value); setStartDate(''); setDateMap({}) }}><option value="">{en ? 'Select a class' : '請選擇班級'}</option>{context.courses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? 'First eligible session' : '新班起始課次'}<select className="apple-input bg-white" value={startDate} onChange={event => setStartDate(event.target.value)}><option value="">{en ? 'Select a date' : '請選擇日期'}</option>{course?.sessionDates.map(date => <option key={date} value={date}>{date}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? 'Existing attendance' : '既有點名與簽到'}<select className="apple-input bg-white" value={mode} onChange={event => setMode(event.target.value)}><option value="preserve_history">{en ? 'Keep history in the original class' : '保留原班歷史，只移轉報名與名冊'}</option><option value="move_records">{en ? 'Move records with explicit session mapping' : '點名、簽到及原班請假一併移轉'}</option></select></label>
        {mode === 'move_records' ? context.sourceDates.map(date => <label key={date} className="grid gap-2 text-sm">{date} → <select className="apple-input bg-white" aria-label={`${date} ${en ? 'new session' : '對應新課次'}`} value={dateMap[date] || ''} onChange={event => setDateMap(current => ({ ...current, [date]: event.target.value }))}><option value="">{en ? 'Select destination session' : '請選擇對應新課次'}</option>{course?.sessionDates.map(target => <option key={target} value={target}>{target}</option>)}</select></label>) : null}
      </fieldset>
      {preview ? <div className="mt-4 space-y-3 rounded-lg border bg-white p-3">
        <p className="text-sm font-bold">{preview.studentName}：{preview.previousCourse} → {preview.next.courseName}</p>
        <p className="text-sm">{en ? 'First session' : '起始課次'}：{preview.next.startDate} · {en ? 'Original amount retained' : '保留原金額'}：{preview.amountText}</p>
        <p className="text-sm">{en ? 'Existing attendance / self check-ins / makeup records' : '現有點名／自主簽到／請假補課紀錄'}：{preview.attendanceCount} / {preview.checkinCount} / {preview.makeupCount}</p>
        <label className="grid gap-2 text-sm font-bold">{en ? 'Transfer reason' : '轉班原因'}<textarea maxLength={800} disabled={busy} className="apple-input" value={reason} onChange={event => setReason(event.target.value)} /></label>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !reason.trim()} className="apple-button-primary disabled:opacity-50" onClick={() => void submit('apply')}>{en ? 'Confirm transfer' : '確認轉班'}</button><button type="button" disabled={busy} className="apple-button-outline" onClick={() => setPreview(null)}>{en ? 'Edit selection' : '返回修改'}</button></div>
      </div> : <button type="button" disabled={busy || !targetId || !startDate || (mode === 'move_records' && context.sourceDates.some(date => !dateMap[date]))} className="apple-button-primary mt-3 disabled:opacity-50" onClick={() => void submit('preview')}>{en ? 'Preview transfer' : '預覽轉班'}</button>}
    </>}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
  </section>
}
