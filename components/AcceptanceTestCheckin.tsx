'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Loader2, ShieldCheck } from 'lucide-react'
import type { AcceptanceParticipantRole, AcceptanceTestPhase } from '@/lib/attendance-acceptance-test'
import { supabase } from '@/lib/supabase'

type TestPayload = {
  test?: {
    dateLabel: string
    timeLabel: string
    timeZoneLabel: string
  }
  phase?: AcceptanceTestPhase
  eligible?: boolean
  checkedInAt?: string
  reason?: string
  message?: string
  error?: string
}

async function accessToken() {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
  return session.access_token
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

export default function AcceptanceTestCheckin({
  role,
  className = '',
}: {
  role: AcceptanceParticipantRole
  className?: string
}) {
  const [payload, setPayload] = useState<TestPayload>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/acceptance-test/check-in?role=${role}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${await accessToken()}` },
      })
      const next = await response.json().catch(() => ({})) as TestPayload
      if (!response.ok) throw new Error(next.error || '讀取測試簽到狀態失敗。')
      setPayload(next)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取測試簽到狀態失敗。')
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load() }, 15_000)
    return () => window.clearInterval(timer)
  }, [load])

  async function checkIn() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/acceptance-test/check-in', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const next = await response.json().catch(() => ({})) as TestPayload
      if (!response.ok) throw new Error(next.error || '測試簽到失敗。')
      await load()
    } catch (checkInError) {
      setError(checkInError instanceof Error ? checkInError.message : '測試簽到失敗。')
    } finally {
      setSaving(false)
    }
  }

  if (loading || payload.phase === 'hidden' || payload.eligible === false || !payload.test) return null
  const checkedIn = Boolean(payload.checkedInAt)
  const open = payload.phase === 'open'
  const status = checkedIn
    ? `已於 ${formatTime(payload.checkedInAt!)} 完成`
    : open
      ? '現在可以簽到'
      : payload.phase === 'upcoming'
        ? '尚未開放'
        : '測試時段已結束'

  return (
    <section className={`overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 shadow-sm ${className}`}>
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${checkedIn ? 'bg-emerald-600' : 'bg-blue-700'} text-white`}>
            {checkedIn ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-blue-700">7 月 25 日網站驗收</p>
            <h2 className="mt-0.5 text-base font-black text-blue-950">{role === 'coach' ? '教練本人測試簽到' : '學員自主測試簽到'}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-blue-800">{payload.test.dateLabel} · {payload.test.timeLabel}（{payload.test.timeZoneLabel}）｜{status}</p>
            <p className="mt-1 flex items-start gap-1.5 text-[11px] font-semibold leading-5 text-blue-700"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />只寫入驗收測試紀錄，不計入正式出勤、點名、課酬或季度統計。</p>
          </div>
        </div>
        <button type="button" disabled={!open || checkedIn || saving} onClick={() => void checkIn()} className="min-h-11 rounded-xl bg-blue-700 px-5 text-sm font-black text-white disabled:bg-blue-200 disabled:text-blue-500">
          {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />處理中</span> : checkedIn ? '已完成測試簽到' : open ? '立即測試簽到' : '等待開放'}
        </button>
      </div>
      {error ? <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 sm:px-5">{error}</p> : null}
    </section>
  )
}
