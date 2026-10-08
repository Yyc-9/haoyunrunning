'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/app/language-context'
import { supabase } from '@/lib/supabase'
import { toEnglishWebsiteText } from '@/lib/english-website'
import type { AdminAccountOverview } from '@/lib/admin-account-types'

async function accountFetch(email?: string, body?: Record<string, unknown>) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!data.session) throw new Error('請重新登入。')
  const response = await fetch(`/api/admin/accounts${email ? `?email=${encodeURIComponent(email)}` : ''}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || '帳號管理暫時無法使用，請確認資料庫更新後重試。')
  return payload
}

export default function AdminAccountManager({ onOpenCoaches, onOpenSeasons }: { onOpenCoaches: () => void; onOpenSeasons: () => void }) {
  const { language } = useLanguage()
  const en = language === 'en'
  const [data, setData] = useState<AdminAccountOverview | null>(null)
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [choice, setChoice] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const requestId = useRef(0)
  const saving = useRef(false)
  const mounted = useRef(false)
  const t = (zh: string, english: string) => en ? english : zh
  const report = (cause: unknown) => setError(en ? toEnglishWebsiteText(cause instanceof Error ? cause.message : String(cause)) : cause instanceof Error ? cause.message : String(cause))
  useEffect(() => {
    let cancelled = false
    mounted.current = true
    const id = ++requestId.current
    setBusy(true)
    accountFetch().then(result => { if (!cancelled && id === requestId.current) setData(result) })
      .catch(cause => { if (!cancelled && id === requestId.current) setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { if (!cancelled && id === requestId.current) setBusy(false) })
    return () => { cancelled = true; mounted.current = false }
  }, [])
  async function inspect(value: string) {
    if (saving.current) return
    const normalized = value.trim().toLowerCase()
    const id = ++requestId.current
    setEmail(normalized); setChoice(null); setReason(''); setMessage(''); setError(''); setBusy(true)
    setData(current => current ? { ...current, diagnostic: null } : null)
    try { const result = await accountFetch(normalized); if (mounted.current && id === requestId.current) setData(result) }
    catch (cause) { if (mounted.current && id === requestId.current) report(cause) }
    finally { if (mounted.current && id === requestId.current) setBusy(false) }
  }
  async function save() {
    if (saving.current || busy || choice === null || !reason.trim() || !data?.diagnostic) return
    saving.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const result = await accountFetch(undefined, { email: data.diagnostic.email, active: choice, reason: reason.trim() })
      if (!mounted.current) return
      setChoice(null); setReason('')
      setMessage(result.active
        ? result.role === 'admin' ? t('已授予超級管理員權限。', 'Super administrator access granted.') : t('已登記授權；完成註冊及信箱驗證後啟用。', 'Access registered; activates after registration and email verification.')
        : t('已撤銷管理員權限；後續請求將依最新角色驗證。', 'Admin access revoked; subsequent requests use the updated role.'))
      setData(null)
      const refreshed = await accountFetch(result.email)
      if (mounted.current) setData(refreshed)
    } catch (cause) { if (mounted.current) report(cause) }
    finally { saving.current = false; if (mounted.current) setBusy(false) }
  }
  const diagnostic = data?.diagnostic
  const account = diagnostic?.accounts.length === 1 ? diagnostic.accounts[0] : null
  const self = account?.id === data?.actorId
  const conflict = (diagnostic?.accounts.length ?? 0) > 1
  const roleText = (role: string | null) => role === 'admin' ? t('超級管理員', 'Super administrator') : role === 'coach' ? t('教練', 'Coach') : role === 'student' ? t('學員', 'Student') : t('缺少個人資料', 'Profile missing')
  return <section className="apple-card space-y-5 p-4 sm:p-6">
    <div><h2 className="text-xl font-black">{t('帳號與管理權限', 'Accounts and admin access')}</h2><p className="mt-2 text-sm leading-6">{t('每位超級管理員都能管理營運資料及授權。查詢帳號可檢查驗證、教練身份、班級與近期登入狀態。', 'All super administrators can manage operations and access. Inspect verification, coach identity, classes and recent sessions by email.')}</p></div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void inspect(email) }}>
      <label className="grid min-w-0 flex-1 gap-2 text-sm font-bold">{t('登入信箱', 'Sign-in email')}<input required type="email" maxLength={254} className="apple-input" disabled={busy} value={email} onChange={event => { setEmail(event.target.value); setChoice(null); setData(current => current ? { ...current, diagnostic: null } : null) }} /></label>
      <button className="apple-button-primary" disabled={busy} type="submit">{t('查詢帳號', 'Inspect account')}</button>
      <button className="apple-button-outline" disabled={busy} type="button" onClick={() => void inspect('')}>{t('重新整理', 'Refresh')}</button>
    </form>
    {busy ? <p role="status">{t('處理中…', 'Loading…')}</p> : null}
    {message ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p> : null}
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{en ? toEnglishWebsiteText(error) : error}</p> : null}
    {diagnostic ? <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
      <h3 className="break-all font-bold">{diagnostic.email}</h3>
      <p>{conflict ? t('此信箱對應多個帳號，需先處理身份衝突。', 'Multiple accounts use this email. Resolve the identity conflict first.') : !account ? t('尚未註冊。授權後仍須自行註冊並驗證信箱。', 'Not registered. Registration and email verification are still required after granting access.') : `${account.name || '—'} · ${roleText(account.role)} · ${account.emailConfirmed ? t('信箱已驗證', 'Email verified') : t('信箱未驗證', 'Email unverified')}`}</p>
      <p className="text-sm">{diagnostic.adminAllowlist === false || account?.adminActive === false ? t('管理員權限已明確撤銷，舊白名單不會重新啟用。', 'Admin access explicitly revoked; previous allowlists cannot reactivate it.') : diagnostic.adminAllowlist || account?.adminActive || diagnostic.environmentAllowed || account?.role === 'admin' ? t('已有管理員授權來源；須通過信箱驗證。', 'An admin authorization source exists; email verification is required.') : t('目前沒有管理員授權。', 'No admin authorization currently exists.')}</p>
      <div><h4 className="font-bold">{t('教練工作台診斷', 'Coach workspace diagnosis')}</h4>
        {!diagnostic.coachAccounts.length ? <p className="mt-2 text-sm">{t('尚未登記教練身份。請至教練管理登記。', 'No registered coach identity. Register it in Coach management.')}</p> : diagnostic.coachAccounts.map(coach => <div key={coach.coachKey} className="mt-2 text-sm">
          <p>{coach.name} · {coach.status === 'enabled' ? t('已啟用', 'Enabled') : coach.status === 'disabled' ? t('已停用', 'Disabled') : t('待啟用', 'Pending')}</p>
          {coach.status === 'disabled' ? <p>{t('教練權限已停用；可至教練管理重新啟用。', 'Coach access disabled; re-enable it in Coach management.')}</p> : null}
          {account && (coach.profileId !== account.id || coach.ownerId !== account.id) ? <p className="text-amber-800">{t('教練身份尚未完整連結到此帳號，需核對登記信箱與啟用狀態。', 'Coach identity is not fully linked to this account. Check its registered email and activation status.')}</p> : null}
          {account && coach.status === 'enabled' && account.role === 'student' ? <p className="text-amber-800">{t('教練登記與帳號角色不一致，請至教練管理檢查。', 'Coach registration and account role disagree. Check Coach management.')}</p> : null}
        </div>)}
        <p className="mt-2 text-sm">{t('目前授課班級', 'Current classes')}：{diagnostic.courses.filter(course => ['active','enrolling'].includes(course.seasonStatus)).map(course => `${course.season} ${course.name}`).join(' / ') || t('尚未分配，請至季度管理設定任課教練。', 'None assigned. Set course coaches in Season management.')}</p>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="apple-button-outline" onClick={onOpenCoaches}>{t('教練管理', 'Coach management')}</button><button type="button" className="apple-button-outline" onClick={onOpenSeasons}>{t('季度管理', 'Season management')}</button></div>
      </div>
      <details className="text-sm"><summary className="cursor-pointer font-bold">{t('近期登入狀態', 'Recent session activity')}</summary>{diagnostic.sessions.length ? diagnostic.sessions.map((session,index) => <p className="mt-2 break-words" key={index}>{new Date(session.lastSeenAt).toLocaleString(language)} · {session.revokedAt ? t('已撤銷', 'Revoked') : t('未撤銷', 'Not revoked')} · {session.device || '—'}</p>) : <p>{t('尚無裝置活動紀錄。', 'No device activity recorded.')}</p>}<p className="mt-2">{t('登入紀錄不能證明該裝置已成功開啟工作台。', 'Session activity does not prove the device successfully opened the workspace.')}</p></details>
      <div className="border-t pt-4"><h4 className="font-bold">{t('變更管理員權限', 'Change admin access')}</h4>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="apple-button-outline" disabled={busy || conflict || choice === true} onClick={() => setChoice(true)}>{t('授予超級管理員', 'Grant super administrator')}</button><button type="button" className="apple-button-outline" disabled={busy || conflict || self || choice === false} onClick={() => setChoice(false)}>{t('撤銷管理員權限', 'Revoke admin access')}</button></div>
        {self ? <p className="mt-2 text-sm">{t('自己的權限須由另一位超級管理員撤銷。', 'Another super administrator must revoke your access.')}</p> : null}
        {choice !== null ? <div className="mt-3 space-y-3 rounded-lg border bg-white p-3"><p className="text-sm">{choice ? t('此帳號將能管理所有網站營運資料及管理員授權。', 'This account will manage all website operations and admin access.') : t('此帳號將失去管理後台權限；原有教練或學員資料保留。', 'This account will lose admin access. Existing coach and student records are retained.')}</p><label className="grid gap-2 text-sm font-bold">{t('變更原因', 'Reason')}<textarea className="apple-input" maxLength={800} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="flex flex-wrap gap-2"><button type="button" className="apple-button-primary" disabled={busy || !reason.trim()} onClick={() => void save()}>{choice ? t('確認授予權限', 'Confirm grant') : t('確認撤銷權限', 'Confirm revocation')}</button><button type="button" className="apple-button-outline" disabled={busy} onClick={() => setChoice(null)}>{t('取消', 'Cancel')}</button></div></div> : null}
      </div>
    </div> : null}
    <div><h3 className="font-bold">{t('管理員與授權名單', 'Admins and authorizations')}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{data?.admins.map((row,index) => <button type="button" key={`${row.email}:${index}`} disabled={busy} onClick={() => void inspect(row.email)} className="rounded-lg border p-3 text-left"><strong className="block break-all">{row.name || row.email}</strong><span className="block break-all text-sm">{row.email}</span><span className="mt-1 block text-sm">{row.allowlistActive === false || row.accountActive === false ? t('已撤銷', 'Revoked') : !row.registered ? t('待註冊', 'Pending registration') : !row.emailConfirmed ? t('待驗證', 'Pending verification') : row.role === 'admin' ? t('已啟用', 'Enabled') : t('待下次登入啟用', 'Activates at next sign-in')}</span></button>)}</div></div>
    <details><summary className="cursor-pointer font-bold">{t('最近權限操作紀錄', 'Recent access changes')}</summary>{data?.audit.map(entry => <div key={entry.id} className="mt-3 border-t pt-3 text-sm"><p className="break-all">{entry.email} · {entry.active ? t('授權', 'Granted') : t('撤權', 'Revoked')}</p><p>{entry.reason}</p><p className="text-apple-gray-500">{entry.actor_name || '—'} · {new Date(entry.created_at).toLocaleString(language)}</p></div>)}</details>
  </section>
}
