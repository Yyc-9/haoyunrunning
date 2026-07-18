'use client'

import { useState } from 'react'
import { ChevronDown, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'

type CoachVerificationPanelProps = {
  coachName: string
  onVerified: () => void | Promise<void>
}

export default function CoachVerificationPanel({ coachName, onVerified }: CoachVerificationPanelProps) {
  const { updateUser, refreshUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const verifyCoachIdentity = async () => {
    if (!supabase) {
      setError('認證服務暫時無法使用，請稍後再試。')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('請重新登入後再進行認證。')

      const response = await fetch('/api/coach/redeem-invite', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        profile?: {
          role?: 'student' | 'coach' | 'admin'
          name?: string
          email?: string
          phone?: string
          pb?: string
          avatar_url?: string
        }
      }

      if (!response.ok) throw new Error(payload.error || '教練身份認證失敗。')

      updateUser({
        role: payload.profile?.role || 'coach',
        name: payload.profile?.name,
        email: payload.profile?.email,
        phone: payload.profile?.phone,
        pb: payload.profile?.pb,
        avatar: payload.profile?.avatar_url,
      })
      await refreshUser()
      setCode('')
      await onVerified()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '教練身份認證失敗。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="border-t border-black/10 py-4 sm:py-8">
      <div className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="coach-verification-content"
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-emerald-50/60 sm:p-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white sm:h-11 sm:w-11">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black text-emerald-700 sm:text-xs">COACH VERIFICATION</span>
              <span className="mt-0.5 block text-base font-black text-black sm:mt-1 sm:text-xl">教練身份認證</span>
              <span className="mt-1 block truncate text-xs text-apple-gray-500 sm:text-sm">已預先登記為 {coachName}</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-black text-apple-gray-600 sm:gap-2 sm:text-sm">
            {isOpen ? '收合' : '展開'}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        <div id="coach-verification-content" hidden={!isOpen} className="border-t border-emerald-100 bg-emerald-50/40 p-3 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="min-w-0">
              <span className="mb-2 flex items-center gap-2 text-sm font-black text-black">
                <KeyRound className="h-4 w-4" />
                教練認證碼
              </span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="輸入管理員提供的專屬認證碼"
                autoComplete="off"
                className="apple-input min-h-12 bg-white"
              />
            </label>
            <button
              type="button"
              onClick={verifyCoachIdentity}
              disabled={!code.trim() || isSubmitting}
              className="apple-button-primary min-h-12 gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              完成身份認證
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-apple-gray-500">認證碼只能由目前登入信箱使用，完成後此入口會自動消失。</p>
          {error ? <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        </div>
      </div>
    </section>
  )
}
