'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/app/language-context'

type Preview = { fingerprint: string; studentName: string; courseName: string; amountText: string }
export default function AdminEnrollmentRefund({ enrollmentId, onSaved }: { enrollmentId: string; onSaved: () => Promise<void> }) {
  const { language } = useLanguage()
  const en = language === 'en'
  const [preview, setPreview] = useState<Preview | null>(null)
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  async function submit(action: 'preview' | 'apply') {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      if (!data.session) throw new Error(en ? 'Please sign in again.' : '請重新登入。')
      const response = await fetch('/api/admin/enrollment-refund', {
        method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, enrollmentId, reason, fingerprint: preview?.fingerprint }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || (en ? 'Withdrawal failed.' : '退班操作失敗。'))
      if (action === 'preview') { setPreview(result); setConfirmed(false) }
      else { setDone(true); setPreview(null); await onSaved() }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      if (action === 'apply') { setPreview(null); setConfirmed(false) }
    } finally { setBusy(false) }
  }
  return <div className="mt-4 rounded-xl border border-red-200 bg-white p-4">
    <h5 className="font-bold text-red-800">{en ? 'Refund withdrawal' : '退費退班（釋出名額）'}</h5>
    <p className="mt-2 text-sm leading-6">{en ? 'Record a refund already handled outside the website and remove this enrollment from the active class roster. One seat will be released. Payment and attendance history are retained; this does not send money.' : '登記已辦理的退費，將這筆報名移出有效班級名冊並釋出一個名額。保留原收款與出席紀錄；此操作不會執行銀行退款，也不影響其他班級報名。'}</p>
    {done ? <><p role="status" className="mt-3 font-bold text-emerald-700">{en ? 'Withdrawal recorded. One seat released.' : '已登記退費退班，已釋出一個名額。'}</p><button disabled={busy} type="button" className="apple-button-outline mt-3" onClick={() => void onSaved().catch(() => setError(en ? 'Refresh failed. Please reload the page.' : '重新讀取失敗，請重新整理頁面。'))}>{en ? 'Refresh roster' : '重新載入名冊'}</button></> : preview ? <div className="mt-3 space-y-3">
      <p className="break-words font-bold">{preview.studentName} · {preview.courseName}</p>
      <p className="text-sm">{en ? 'Original payment (retained)' : '原收款金額（保留紀錄）'}：{preview.amountText}</p>
      <label className="grid gap-2 text-sm font-bold">{en ? 'Refund / withdrawal reason' : '退費退班原因'}<textarea className="apple-input" maxLength={800} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />{en ? 'I confirm the refund has been handled and this student is leaving this class.' : '我已確認退費已另行辦理，並將此學員退出這個班級。'}</label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !confirmed || !reason.trim()} className="apple-button-primary disabled:opacity-50" onClick={() => void submit('apply')}>{en ? 'Confirm withdrawal and release seat' : '確認退班並釋出名額'}</button><button type="button" disabled={busy} className="apple-button-outline" onClick={() => { setPreview(null); setConfirmed(false) }}>{en ? 'Cancel' : '取消'}</button></div>
    </div> : <button type="button" className="apple-button-outline mt-3 text-red-700" disabled={busy} onClick={() => void submit('preview')}>{busy ? (en ? 'Loading…' : '讀取中…') : (en ? 'Register refund withdrawal' : '登記退費退班')}</button>}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
  </div>
}
