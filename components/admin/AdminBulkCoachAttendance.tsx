'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/app/language-context'
import { adminActionEnglishCopy } from '@/lib/english-admin-action-copy'

type PreviewRow = { assignmentId: string; date: string; coachName: string; courseName: string; from: string; to: string; skip: string | null }
type Preview = { fingerprint: string; rows: PreviewRow[] }

export default function AdminBulkCoachAttendance({ assignmentIds, onSaved }: {
  assignmentIds: string[]; onSaved: () => Promise<void>
}) {
  const { language } = useLanguage()
  const en = language === 'en'
  const translate = (value: string) => en ? adminActionEnglishCopy[value] || value : value
  const [state, setState] = useState('on_time')
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const labels: Record<string, string> = en
    ? { on_time: 'On time', late: 'Late', not_checked_in: 'Not checked in' }
    : { on_time: '準時', late: '遲到', not_checked_in: '未打卡' }
  async function request(action: 'preview' | 'apply') {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      if (!data.session) throw new Error(en ? 'Please sign in again.' : '請重新登入。')
      const ids = action === 'preview' ? assignmentIds : selectedIds
      const response = await fetch('/api/admin/coach-duty/bulk', {
        method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, assignmentIds: ids, state, reason, fingerprint: preview?.fingerprint }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || (en ? 'The update failed.' : '更新失敗。'))
      if (action === 'preview') { setSelectedIds([...ids]); setPreview(result) }
      else {
        setPreview(null); setReason('')
        setMessage(en ? `Updated ${result.changed} records; skipped ${result.skipped}.` : `已修正 ${result.changed} 筆，略過 ${result.skipped} 筆。`)
        await onSaved()
      }
    } catch (cause) {
      setError(translate(cause instanceof Error ? cause.message : String(cause)))
      if (action === 'apply') setPreview(null)
    } finally { setBusy(false) }
  }
  const changed = preview?.rows.filter(row => !row.skip).length ?? 0
  return <section className="my-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
    <h3 className="font-black">{en ? 'Bulk attendance correction' : '批量修正教練考勤'}</h3>
    <p className="mt-2 text-sm leading-6">{en ? `Preview the ${assignmentIds.length} records in the current filters. Future or cancelled sessions, archived seasons, and unassigned coaches are excluded. Each correction keeps an audit record.` : `依目前篩選預覽 ${assignmentIds.length} 筆記錄。尚未開課、停課、封存季度及未確認實際教練的出勤會略過，每筆修正均保留操作紀錄。`}</p>
    {!preview ? <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="grid gap-2 text-sm font-bold">{en ? 'Set status' : '改為狀態'}<select className="apple-input bg-white" value={state} disabled={busy} onChange={event => setState(event.target.value)}>{Object.entries(labels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      <button type="button" className="apple-button-primary disabled:opacity-50" disabled={busy || !assignmentIds.length || assignmentIds.length > 500} onClick={() => void request('preview')}>{en ? 'Preview changes' : '預覽影響範圍'}</button>
      {assignmentIds.length > 500 ? <p role="alert">{en ? 'Narrow the filters to 500 records or fewer.' : '請縮小篩選至 500 筆以內。'}</p> : null}
    </div> : <div className="mt-3">
      <p className="font-bold">{en ? `${changed} records will change; ${preview.rows.length - changed} will be skipped.` : `將修正 ${changed} 筆，略過 ${preview.rows.length - changed} 筆。`}</p>
      <div className="mt-3 max-h-72 overflow-auto rounded-lg border bg-white"><table className="w-full text-left text-sm"><thead><tr>{(en ? ['Date', 'Coach / class', 'Change'] : ['日期', '教練／班級', '變更']).map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{preview.rows.map(row => <tr key={row.assignmentId} className="border-t"><td className="p-2 whitespace-nowrap">{row.date}</td><td className="p-2">{row.coachName}<br />{row.courseName}</td><td className="p-2">{row.skip ? translate(row.skip) : `${labels[row.from]} → ${labels[row.to]}`}</td></tr>)}</tbody></table></div>
      <label className="mt-3 grid gap-2 text-sm font-bold">{en ? 'Reason for correction' : '修正原因'}<textarea className="apple-input bg-white" value={reason} maxLength={800} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      <div className="mt-3 flex flex-wrap gap-3"><button type="button" className="apple-button-primary disabled:opacity-50" disabled={busy || !changed || !reason.trim()} onClick={() => void request('apply')}>{en ? `Confirm ${changed} corrections` : `確認修正 ${changed} 筆`}</button><button type="button" className="apple-button-secondary" disabled={busy} onClick={() => setPreview(null)}>{en ? 'Cancel preview' : '取消預覽'}</button></div>
    </div>}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p> : null}
  </section>
}
