'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Bell, Loader2, RotateCcw } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'
import { toEnglishWebsiteText } from '@/lib/english-website'
import AuthModal from '@/components/AuthModal'
import ProtectedCoursePaymentInfo from '@/components/ProtectedCoursePaymentInfo'
import { notificationFetch, NotificationRequestError, refreshNotifications } from '@/lib/notification-client'
import { notificationHref, supplementReasons, supplementTemplates, type Followup, type NotificationEnrollment, type SupplementReason } from '@/lib/enrollment-notification-policy'

type Payload = { staff: boolean; enrollments: NotificationEnrollment[]; followups: Followup[]; hasMore: boolean }
const statuses: Record<string, string> = { pending_transfer: '待回報匯款', pending_review: '待人工核對', rejected: '待學生補充', approved: '已確認入帳' }
const emailLabels: Record<string, string> = { pending: '郵件等待寄送', sending: '郵件寄送中；如超過一分鐘仍未更新，可重試', sent: '郵件服務已接受寄送', failed: '郵件寄送失敗或尚未確認', skipped: '郵件服務尚未設定', expired: '已超過安全重試時限，請人工確認郵件紀錄' }
function Status({ value }: { value: string }) { return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${value === 'approved' ? 'bg-emerald-50 text-emerald-700' : value === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{statuses[value] || value}</span> }

export default function EnrollmentNotificationsClient() {
  const { language } = useLanguage()
  const { user, isLoading: authLoading } = useAuth()
  const userId = user?.id
  const params = useSearchParams()
  const id = params.get('enrollment') || ''
  const staff = params.get('view') === 'staff'
  const [payload, setPayload] = useState<Payload | null>(null)
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState(false)
  const [filter, setFilter] = useState('all')
  const generation = useRef(0)
  const contextKey = `${userId}:${staff}:${id}:${page}:${filter}`
  const activeContext = useRef(contextKey)
  activeContext.current = contextKey
  const invalidate = useCallback(() => { generation.current++ }, [])
  const load = useCallback(async () => {
    if (!userId || document.hidden) return
    const version = ++generation.current
    try {
      const result = await notificationFetch<Payload>(`/api/enrollment-followups?view=${staff ? 'staff' : 'student'}&enrollment=${encodeURIComponent(id)}&page=${id ? 0 : page}&status=${filter}`)
      if (version !== generation.current || contextKey !== activeContext.current) return
      setPayload(result); setError('')
    } catch (err) {
      if (version !== generation.current || contextKey !== activeContext.current) return
      if (err instanceof NotificationRequestError && [401,403].includes(err.status)) setPayload(null)
      setError(err instanceof Error ? err.message : '讀取失敗，已保留目前填寫的內容。')
    }
  }, [userId, staff, id, page, filter, contextKey])
  useEffect(() => {
    invalidate(); setPayload(null); setSuccess(''); void load()
    const refresh = () => void load()
    const timer = window.setInterval(refresh, 45_000)
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh)
    return () => { invalidate(); clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [load, invalidate])
  async function action(body: Record<string, unknown>, method: string) {
    setBusy(true); setError(''); setSuccess('')
    try {
      const result = await notificationFetch<{ message: string }>('/api/enrollment-followups', { method, body: JSON.stringify(body) })
      if (contextKey !== activeContext.current) return false
      setSuccess(result.message); await load(); refreshNotifications(); return true
    } catch (err) { if (contextKey === activeContext.current) setError(err instanceof Error ? err.message : '操作失敗。'); return false }
    finally { setBusy(false) }
  }
  const enrollment = id ? payload?.enrollments[0] : null
  return <main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-black">{staff ? '報名通知與核對待辦' : '我的報名通知'}</h1><p className="mt-2 text-sm text-apple-gray-500">{staff ? '新報名、待核對與待學生補充分開處理。' : '補充資料沿用原報名，不需要重新報名。'}</p></div><Link className="inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-bold" href={staff ? '/finance' : '/profile'}>{staff ? '返回銀行對帳' : '返回個人頁面'}</Link></header>
    {success && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button className="mt-2 mr-4 font-bold underline" onClick={() => void load()}>重新整理</button>{staff && <Link className="font-bold underline" href="/finance">前往財務頁解鎖</Link>}</div>}
    {authLoading ? <p role="status">正在確認登入狀態…</p> : !user ? <section className="apple-card p-8"><Bell className="mb-4 h-7 w-7" /><h2 className="text-lg font-bold">登入後查看你的報名通知</h2><p className="my-4 text-sm text-apple-gray-500">登入後會保留目前這筆報名連結。</p><button className="apple-button-primary" onClick={() => setLogin(true)}>登入帳號</button></section> : !payload ? !error && <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />正在讀取報名…</p> : id ? <>
      <Link href={staff ? '/notifications?view=staff' : '/notifications'} className="mb-5 inline-block text-sm font-bold underline">返回報名列表</Link>
      {!enrollment ? <p className="rounded-xl border p-6">找不到這筆報名，或目前帳號沒有查閱權限。</p> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><p className="text-xs text-apple-gray-500">{enrollment.season_name} · {enrollment.preferred_course}</p><h2 className="mt-1 text-xl font-black">{staff ? <>{language === 'en' ? 'Registration for ' : ''}<span translate="no">{enrollment.name}</span>{language === 'en' ? '' : '的報名'}</> : '報名進度'}</h2></div><Status value={enrollment.status} /></div><div className="p-5 sm:p-6"><dl className="grid grid-cols-2 gap-5 text-sm"><div><dt className="text-apple-gray-500">應繳金額</dt><dd className="mt-1 font-bold">{enrollment.amount_text || '待確認'}</dd></div><div><dt className="text-apple-gray-500">帳號後五碼</dt><dd className="mt-1 font-bold">{enrollment.transfer_last_five || '尚未回報'}</dd></div><div><dt className="text-apple-gray-500">匯款日期</dt><dd className="mt-1 font-bold">{enrollment.transfer_date || '尚未回報'}</dd></div><div><dt className="text-apple-gray-500">報名日期</dt><dd className="mt-1 font-bold">{new Date(enrollment.created_at).toLocaleDateString(language, { timeZone: 'Asia/Taipei' })}</dd></div></dl>
          {enrollment.student_review_message && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-bold">{enrollment.status === 'rejected' ? '請補充以下資料' : '前次補充說明'}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7" translate="no">{enrollment.student_review_message}</p></div>}
          {staff && enrollment.notes && <div className="mt-5 text-sm"><h3 className="font-bold">學生備註</h3><p className="mt-2 whitespace-pre-wrap break-words leading-6 text-apple-gray-600" translate="no">{enrollment.notes}</p></div>}
          {enrollment.archived ? <p className="mt-6 rounded-xl bg-apple-gray-100 p-4 text-sm">此季度已封存，僅供查閱。需要協助請聯絡跑班。</p> : staff ? <StaffForm key={enrollment.id} enrollment={enrollment} followups={payload.followups} busy={busy} onAction={action} /> : <StudentForm key={enrollment.id} enrollment={enrollment} followups={payload.followups} busy={busy} onAction={action} />}
        </div></section>
        <section className="rounded-2xl border border-black/10 bg-white p-5"><h2 className="font-black">{staff ? '補件與寄送紀錄' : '補充紀錄'}</h2>{!payload.followups.length ? <p className="mt-4 text-sm text-apple-gray-500">目前沒有補件紀錄。</p> : payload.followups.map(f => <article key={f.id} className="mt-5 border-t pt-4 text-sm"><p className="font-bold">{supplementReasons[f.reason]} · {f.responded_at ? '已結束' : '待學生補充'}</p><p className="mt-2 whitespace-pre-wrap break-words leading-6" translate="no">{f.student_message}</p>{f.student_reply && <div className="mt-3 rounded-lg bg-apple-gray-100 p-3"><strong>學生回覆</strong><p className="mt-1 whitespace-pre-wrap break-words" translate="no">{f.student_reply}</p></div>}{staff && <><p className="mt-3 whitespace-pre-wrap break-words text-xs text-apple-gray-500">內部備註：{f.internal_note || '無'}</p><p className="mt-3 text-xs font-bold">{emailLabels[f.email_status || 'pending']}</p>{f.email_error && <p className="mt-1 text-xs text-amber-800">{f.email_error}</p>}{!enrollment.archived && !f.responded_at && ['pending','failed','skipped','sending'].includes(f.email_status || '') && <button disabled={busy} onClick={() => void action({ action: 'retry_email', requestId: f.id }, 'POST')} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs font-bold disabled:opacity-50"><RotateCcw className="h-3 w-3" />重試寄送</button>}</>}<p className="mt-3 text-[11px] text-apple-gray-500">{new Date(f.created_at).toLocaleString(language, { timeZone: 'Asia/Taipei' })} · UTC+8</p></article>)}</section>
      </div>}
    </> : <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"><div className="flex flex-wrap gap-2 border-b p-4">{[['all','全部'],['pending_review','待核對'],['pending_transfer','待回報'],['rejected','待補充'],['approved','已入帳']].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setPage(0); setFilter(value) }} className={`min-h-11 rounded-full border px-4 text-sm font-bold ${filter === value ? 'bg-black text-white' : ''}`}>{label}</button>)}</div><p className="px-5 pt-4 text-xs text-apple-gray-500">{language === 'en' ? `Page ${page + 1} · ${payload.enrollments.length} registrations · Filtered by selected status` : `第 ${page + 1} 頁 · 本頁 ${payload.enrollments.length} 筆 · 已依所選狀態篩選`}</p>{payload.enrollments.filter(e => filter === 'all' || filter === e.status).map(e => <Link key={e.id} href={notificationHref(e.id, staff)} className="flex flex-wrap items-center justify-between gap-3 border-b p-5 hover:bg-apple-gray-100"><div><p className="font-bold">{staff ? `${e.name} · ` : ''}{e.preferred_course}</p><p className="mt-1 text-xs text-apple-gray-500">{e.season_name} · {e.amount_text} {e.archived ? '· 已封存' : ''}</p></div><Status value={e.status} /></Link>)}{!payload.enrollments.some(e => filter === 'all' || filter === e.status) && <p className="p-8 text-center text-sm text-apple-gray-500">本頁沒有符合條件的報名。</p>}<div className="flex gap-3 p-4"><button disabled={!page} onClick={() => setPage(p => p - 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">上一頁</button><button disabled={!payload.hasMore} onClick={() => setPage(p => p + 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">下一頁</button></div></section>}
    <AuthModal isOpen={login && !user} onClose={() => setLogin(false)} />
  </main>
}

type FormProps = { enrollment: NotificationEnrollment; followups: Followup[]; busy: boolean; onAction: (body: Record<string, unknown>, method: string) => Promise<boolean> }
function StaffForm({ enrollment: e, followups, busy, onAction }: FormProps) {
  const { language } = useLanguage()
  const [reason, setReason] = useState<SupplementReason>(e.status === 'pending_transfer' ? 'unreported' : 'missing_info')
  const [message, setMessage] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const requestId = useRef('')
  const requestBody = useRef('')
  const pending = followups.some(f => !f.responded_at)
  if (e.status === 'approved') return <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">這筆報名已確認入帳。</p>
  if (pending) return <p className="mt-6 rounded-xl bg-apple-gray-100 p-4 text-sm">已通知學生補充。學生補交後，會重新進入待核對。</p>
  return <form className="mt-6 space-y-4 border-t pt-5" onSubmit={event => { event.preventDefault(); const signature = JSON.stringify([reason,message,internalNote,e.status,e.payment_submitted_at]); if (signature !== requestBody.current) { requestId.current = crypto.randomUUID(); requestBody.current = signature } void onAction({ requestId: requestId.current, enrollmentId: e.id, reason, message, internalNote, expectedStatus: e.status, expectedSubmittedAt: e.payment_submitted_at }, 'POST') }}>
    <h3 className="font-black">{e.status === 'pending_transfer' ? '提醒回報／繳款' : '請學生補充資料'}</h3>
    <label className="block text-sm font-bold">處理原因<select value={reason} onChange={event => setReason(event.target.value as SupplementReason)} className="apple-input mt-2">{Object.entries(supplementReasons).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    <label className="block text-sm font-bold">給學生的說明<span className="block text-xs font-normal text-apple-gray-500">會顯示在站內通知及郵件，請勿填寫內部資料。</span><textarea required maxLength={1000} value={message} onChange={event => setMessage(event.target.value)} className="apple-input mt-2 min-h-28" /></label>
    <button type="button" onClick={() => setMessage(language === 'en' ? toEnglishWebsiteText(supplementTemplates[reason]) : supplementTemplates[reason])} className="text-xs font-bold underline">帶入常用說明</button>
    <label className="block text-sm font-bold">內部備註（選填）<span className="block text-xs font-normal text-apple-gray-500">僅管理員與獲授權財務可見。</span><textarea maxLength={1000} value={internalNote} onChange={event => setInternalNote(event.target.value)} className="apple-input mt-2 min-h-20" /></label>
    <button disabled={busy || !message.trim()} className="apple-button-primary disabled:opacity-50">{busy ? '正在保存與寄送…' : '發送通知與郵件'}</button>
    <p className="text-xs leading-5 text-apple-gray-500">補件通知會沿用原報名。確認入帳仍請使用原有銀行對帳流程。</p>
  </form>
}

function StudentForm({ enrollment: e, followups, busy, onAction }: FormProps) {
  const [lastFive, setLastFive] = useState(e.transfer_last_five || '')
  const [transferDate, setTransferDate] = useState(e.transfer_date || '')
  const [reply, setReply] = useState('')
  const [showPaymentInfo, setShowPaymentInfo] = useState(false)
  if (e.status === 'approved') return <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">款項已確認入帳，報名完成。</p>
  if (e.status === 'pending_review') return <p className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">資料已送出，等待財務核對。暫時不需要重複提交。</p>
  if (!['rejected','pending_transfer'].includes(e.status)) return null
  return <form className="mt-6 space-y-4 border-t pt-5" onSubmit={event => { event.preventDefault(); void onAction({ enrollmentId: e.id, requestId: followups.find(f => !f.responded_at)?.id ?? null, lastFive, transferDate, reply }, 'PATCH') }}>
    <h3 className="font-black">{e.status === 'rejected' ? '補充資料' : '回報匯款'}</h3>
    <p className="text-sm leading-6 text-apple-gray-500">若已匯款，請填寫下方資料；若尚未匯款，請先查看收款資訊，完成付款後再回報。請勿填寫完整帳號或身分證號。</p>
    <button type="button" onClick={() => setShowPaymentInfo(value => !value)} aria-expanded={showPaymentInfo} className="min-h-11 text-sm font-bold underline">{showPaymentInfo ? '收起收款資訊' : '查看收款資訊'}</button>
    {showPaymentInfo && <ProtectedCoursePaymentInfo enrollmentId={e.id} />}
    <label className="block text-sm font-bold">匯款帳號後五碼<input required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={lastFive} onChange={event => setLastFive(event.target.value)} className="apple-input mt-2" /></label>
    <label className="block text-sm font-bold">匯款日期<input type="date" required value={transferDate} onChange={event => setTransferDate(event.target.value)} className="apple-input mt-2" /></label>
    <label className="block text-sm font-bold">補充說明{e.status !== 'rejected' ? '（選填）' : ''}<textarea required={e.status === 'rejected'} maxLength={1000} value={reply} onChange={event => setReply(event.target.value)} className="apple-input mt-2 min-h-28" placeholder="請依財務說明補充資料，例如實際匯款金額、匯款人或其他需要核對的資訊。" /></label>
    <button disabled={busy} className="apple-button-primary disabled:opacity-50">{busy ? '正在送出…' : '送出資料，請財務核對'}</button>
  </form>
}
