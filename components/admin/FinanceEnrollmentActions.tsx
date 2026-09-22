'use client'

import { useEffect, useState } from 'react'
import { StaffForm } from '@/app/notifications/EnrollmentNotificationsClient'
import { notificationFetch, refreshNotifications } from '@/lib/notification-client'
import { supplementReasons, type Followup, type NotificationEnrollment } from '@/lib/enrollment-notification-policy'

type Detail = { enrollments: NotificationEnrollment[]; followups: Followup[] }

export default function FinanceEnrollmentActions({ id, readOnly, onChanged }: {
  id: string; readOnly: boolean; onChanged: () => Promise<void>
}) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    notificationFetch<Detail>(`/api/enrollment-followups?view=staff&enrollment=${encodeURIComponent(id)}`)
      .then(result => { if (active) setDetail(result) })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : '讀取補件紀錄失敗。') })
    return () => { active = false }
  }, [id])
  async function action(body: Record<string, unknown>, method: string) {
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await notificationFetch<{ message: string }>('/api/enrollment-followups', { method, body: JSON.stringify(body) })
      setMessage(result.message)
      setDetail(await notificationFetch<Detail>(`/api/enrollment-followups?view=staff&enrollment=${encodeURIComponent(id)}`))
      refreshNotifications()
      await onChanged()
      return true
    } catch (err) { setError(err instanceof Error ? err.message : '操作失敗。'); return false }
    finally { setBusy(false) }
  }
  const enrollment = detail?.enrollments[0]
  return <div>
    {error && <p role="alert" className="py-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="py-3 text-sm text-emerald-700">{message}</p>}
    {!detail && !error && <p role="status" className="py-3 text-sm">正在讀取補件紀錄…</p>}
    {enrollment && !readOnly && !enrollment.archived && <StaffForm enrollment={enrollment} followups={detail!.followups} busy={busy} onAction={action} />}
    {detail && <section className="mt-5 border-t border-black/10 pt-4"><h4 className="text-sm font-bold">補件與寄送紀錄</h4>
      {!detail.followups.length && <p className="mt-2 text-sm text-apple-gray-600">目前沒有補件紀錄。</p>}
      {detail.followups.map(f => <article key={f.id} className="mt-4 space-y-2 border-t border-black/10 pt-3 text-sm leading-6">
        <p className="font-bold">{supplementReasons[f.reason]} · {f.responded_at ? '已結束' : '待學生補充'}</p>
        <p className="whitespace-pre-wrap break-words" translate="no">{f.student_message}</p>
        {f.student_reply && <p className="whitespace-pre-wrap break-words" translate="no">學生回覆：{f.student_reply}</p>}
        <p className="whitespace-pre-wrap break-words" translate="no">內部備註：{f.internal_note || '無'}</p>
        <p className="text-xs text-apple-gray-600">{new Date(f.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} · {f.email_status === 'sent' ? '郵件服務已接受寄送' : f.email_status === 'skipped' ? '郵件服務尚未設定' : '郵件尚未確認寄送'}</p>
        {f.email_error && <p className="text-xs text-amber-800">{f.email_error}</p>}
        {!readOnly && !enrollment?.archived && !f.responded_at && ['pending', 'failed', 'skipped', 'sending'].includes(f.email_status || '') && <button type="button" disabled={busy} className="min-h-11 text-sm font-bold underline disabled:opacity-50" onClick={() => void action({ action: 'retry_email', requestId: f.id }, 'POST')}>重試寄送</button>}
      </article>)}
    </section>}
  </div>
}
