'use client'

import { useState } from 'react'
import { Link2, Loader2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type StudentCoachBindingPanelProps = {
  currentCoachName?: string
  onBound: (coachName: string) => void
}

export default function StudentCoachBindingPanel({
  currentCoachName,
  onBound,
}: StudentCoachBindingPanelProps) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const bindCoach = async () => {
    if (!supabase) {
      setError('Supabase 尚未設定。')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('請先登入。')

      const response = await fetch('/api/student/bind-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        coach?: { name?: string }
        error?: string
        message?: string
      }
      if (!response.ok || !payload.coach) {
        throw new Error(payload.error || '綁定教練失敗。')
      }

      const coachName = payload.coach.name || '好運教練'
      setEmail('')
      setMessage(payload.message || '教練綁定完成。')
      onBound(coachName)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '綁定教練失敗。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article className="apple-card p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-apple-blue">Coach connection</p>
          <h2 className="mt-1 text-xl font-black text-apple-gray-900">綁定教練</h2>
          <p className="mt-2 text-sm leading-6 text-apple-gray-600">
            {currentCoachName
              ? `目前綁定：${currentCoachName}。如需更換，輸入新教練的註冊信箱。`
              : '輸入教練在好運跑班註冊的信箱，即可建立綁定。'}
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
          <Link2 className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">教練信箱</span>
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-apple-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="教練信箱"
            className="apple-input pl-10"
          />
        </label>
        <button
          type="button"
          onClick={bindCoach}
          disabled={!email.trim() || isSubmitting}
          className="apple-button-primary min-h-12 gap-2 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          {currentCoachName ? '更換教練' : '綁定教練'}
        </button>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </article>
  )
}
