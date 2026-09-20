'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, X } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'
import { notificationFetch, refreshNotifications } from '@/lib/notification-client'
import { notificationHref, type NotificationFeed } from '@/lib/enrollment-notification-policy'

export default function NotificationBell({ mobile = false }: { mobile?: boolean }) {
  const { language } = useLanguage()
  const { user } = useAuth()
  const userId = user?.id
  const isTest = Boolean(user?.testAccount)
  const [feed, setFeed] = useState<NotificationFeed | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const activeUser = useRef(userId)
  const sequence = useRef(0)
  activeUser.current = userId
  const load = useCallback(async () => {
    if (!userId || isTest || document.hidden || !trigger.current?.getClientRects().length || window.matchMedia('(max-width: 1279px)').matches !== mobile) return
    const version = ++sequence.current
    try {
      const data = await notificationFetch<NotificationFeed>('/api/notifications')
      if (activeUser.current !== userId || sequence.current !== version) return
      setFeed(data); setError('')
    } catch (err) {
      if (activeUser.current !== userId || sequence.current !== version) return
      setFeed(null); setError(err instanceof Error ? err.message : '無法讀取通知。')
    }
  }, [userId, isTest, mobile])
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    setFeed(null); setOpen(false); void load()
    const timer = window.setInterval(() => void load(), 45_000)
    const refresh = () => void load()
    const media = window.matchMedia('(max-width: 1279px)')
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh)
    window.addEventListener('enrollment-notifications-changed', refresh); media.addEventListener('change', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('enrollment-notifications-changed', refresh); media.removeEventListener('change', refresh) }
  }, [load])
  useEffect(() => {
    if (open) { dialog.current?.showModal(); void load() } else dialog.current?.close()
  }, [open, load])
  async function markRead(ids: string[]) {
    if (!ids.length || busy) return
    setBusy(true)
    try { await notificationFetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ ids }) }); await load(); refreshNotifications() }
    catch (err) { setError(err instanceof Error ? err.message : '標記已讀失敗。') }
    finally { setBusy(false) }
  }
  function close() { setOpen(false); trigger.current?.focus() }
  if (!user || user.testAccount) return null
  const count = feed?.unreadCount ?? 0
  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label={error ? '通知暫時無法讀取，點擊重試' : `通知，${count} 則未讀`} aria-haspopup="dialog" className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm hover:bg-apple-gray-100">
      <Bell className="h-5 w-5" />{count > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-[10px] font-black leading-5 text-white">{count > 99 ? '99+' : count}</span> : error ? <span className="absolute right-0 top-0 rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">!</span> : null}
    </button>
    {mounted && createPortal(<dialog ref={dialog} onCancel={close} onClose={close} aria-label="報名通知" style={{ width: 'min(28rem, calc(100% - 2rem))' }} className="m-auto max-h-[85dvh] overflow-y-auto rounded-2xl border border-black/10 bg-white p-0 text-black shadow-2xl backdrop:bg-black/30">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5"><div><h2 className="text-lg font-black">通知</h2><p className="mt-1 text-xs text-apple-gray-500">已讀不代表已完成核對或補件</p></div><button type="button" aria-label="關閉通知" onClick={close} className="inline-flex h-11 w-11 items-center justify-center rounded-full border"><X className="h-5 w-5" /></button></div>
      {error ? <div className="p-5"><p role="alert" className="text-sm text-red-700">{error}</p><button className="mt-3 text-sm font-bold underline" onClick={() => void load()}>重新整理</button></div> : !feed ? <p role="status" className="p-6 text-sm text-apple-gray-500">正在讀取通知…</p> : feed.items.length ? <ul>{feed.items.map(n => <li key={n.id} className={`border-b ${!n.read_at ? 'bg-sky-50/60' : 'bg-white'}`}><Link href={notificationHref(n.enrollment_id, n.audience === 'staff')} onClick={() => { void markRead([n.id]); close() }} className="block p-5 hover:bg-apple-gray-100"><p className="text-sm font-bold">{!n.read_at && <span className="mr-2 text-sky-700" aria-label="未讀">●</span>}{n.title}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-apple-gray-600">{n.message}</p><p className="mt-2 text-[11px] text-apple-gray-500">{new Date(n.created_at).toLocaleString(language, { timeZone: 'Asia/Taipei' })} · UTC+8</p></Link></li>)}</ul> : <p className="p-8 text-center text-sm text-apple-gray-500">目前沒有新通知。</p>}
      <div className="flex flex-wrap items-center gap-3 p-5"><button type="button" disabled={busy || !feed?.items.some(n => !n.read_at)} onClick={() => void markRead(feed?.items.filter(n => !n.read_at).map(n => n.id) ?? [])} className="rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-40">將目前通知標為已讀</button><Link href={feed?.staff ? '/notifications?view=staff' : '/notifications'} onClick={close} className="text-sm font-bold underline">查看報名待辦</Link></div>
    </dialog>, document.body)}
  </>
}
