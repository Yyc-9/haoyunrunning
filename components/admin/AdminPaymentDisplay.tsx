'use client'

import { useEffect, useRef, useState } from 'react'
import { useAdminUnsavedChanges } from '@/lib/admin-unsaved-changes'
import { supabase } from '@/lib/supabase'
import type { PaymentDisplay } from '@/lib/payment-display'
import PaymentInfoCard from '@/components/PaymentInfoCard'

type State = { info: PaymentDisplay; config: PaymentDisplay; version: string | null }

export default function AdminPaymentDisplay() {
  const [saved, setSaved] = useState<State | null>(null)
  const [draft, setDraft] = useState<PaymentDisplay | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function request(save = false) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!supabase) throw new Error('登入服務尚未設定。')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('請先登入。')
      const response = await fetch('/api/admin/payment-info', {
        method: save ? 'PATCH' : 'GET', cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        ...(save ? { body: JSON.stringify({ info: draft, version: saved?.version, confirmed }) } : {}),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '收款資料讀取失敗。')
      setSaved(result)
      setDraft(result.config)
      setConfirmed(false)
      setMessage(result.message || '')
    } catch (failure) { setError(failure instanceof Error ? failure.message : '收款資料操作失敗。') }
    finally { lock.current = false; setBusy(false) }
  }
  // Initial read only; edits are never overwritten by background refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void request() }, [])
  function change(key: keyof PaymentDisplay, value: string) {
    setDraft((current) => current ? { ...current, [key]: value, useLegacyQr: false, ...(key !== 'qrCodeUrl' ? { qrCodeUrl: '' } : {}) } : current)
    setConfirmed(false)
    setMessage('')
  }
  const dirty = Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved.config))
  useAdminUnsavedChanges(dirty)
  return <section aria-label="對外匯款資料設定" className="apple-card p-5">
    <h2 className="text-xl font-black">對外匯款資料</h2>
    <p className="mt-2 text-sm leading-6 text-apple-gray-600">發布後，課程報名與商城結帳將使用這組資料。下方帳戶池只供內部對帳。更換銀行或帳號會清除原二維碼，請貼上新圖片網址或留空。</p>
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p> : null}
    {draft ? <><fieldset disabled={busy} className="mt-4 grid gap-4 md:grid-cols-2">
      {([['bankName', '銀行名稱'], ['bankCode', '銀行代碼（三位數）'], ['accountNumber', '匯款帳號'], ['qrCodeUrl', '二維碼圖片 HTTPS 網址（可留空）']] as const).map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<input className="apple-input mt-2" value={draft[key]} onChange={(event) => change(key, event.target.value)} /></label>)}
    </fieldset>
    <div className="mt-4"><p className="mb-2 text-sm font-bold">發布預覽{dirty ? '・尚未儲存' : ''}</p><PaymentInfoCard info={draft.useLegacyQr && saved ? saved.info : draft} /></div>
    <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />我已核對銀行、帳號及二維碼，確認可供學員及買家匯款。</label>
    <button type="button" disabled={busy || !confirmed} onClick={() => void request(true)} className="apple-button-primary mt-4 px-5 py-3 disabled:opacity-50">{busy ? '處理中…' : '儲存並發布匯款資料'}</button></> : null}
    <button type="button" disabled={busy} className="apple-button-outline mt-4 px-4 py-3" onClick={() => { if (!dirty || window.confirm('重新讀取會捨棄未儲存的收款資料，確定繼續？')) void request() }}>重新讀取</button>
  </section>
}
