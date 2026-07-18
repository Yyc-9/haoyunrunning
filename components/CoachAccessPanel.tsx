'use client'

import { useState } from 'react'
import { Link2, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'

type CoachAccessPanelProps = {
  onStudentBound?: () => void | Promise<void>
}

async function postWithSession(path: string, body: Record<string, string>) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定。')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('請先登入。')
  }

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
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

  if (!response.ok) {
    throw new Error(payload.error || '操作失敗，請稍後再試。')
  }

  return payload
}

export default function CoachAccessPanel({ onStudentBound }: CoachAccessPanelProps) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [studentEmail, setStudentEmail] = useState('')
  const [isBinding, setIsBinding] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const bindStudent = async () => {
    setIsBinding(true)
    setMessage('')
    setError('')

    try {
      await postWithSession('/api/coach/bind-student', { email: studentEmail })
      setStudentEmail('')
      setMessage(t.coach.bindSuccess)
      await onStudentBound?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.coach.bindFailed
      if (message.includes('找不到')) {
        setError(t.coach.emailNotFound)
      } else if (message.includes('duplicate') || message.includes('already')) {
        setError(t.coach.alreadyBound)
      } else if (message.includes('權限') || message.includes('權限')) {
        setError(t.coach.noPermission)
      } else {
        setError(message)
      }
    } finally {
      setIsBinding(false)
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-apple-gray-500 sm:text-sm">{t.coach.accessLabel}</p>
          <h2 className="text-lg font-black text-apple-gray-900 sm:text-xl">{t.coach.bindTitle}</h2>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white sm:h-11 sm:w-11">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-md bg-apple-gray-100 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-apple-gray-700" />
            <p className="font-bold text-apple-gray-900">{t.coach.bindByEmail}</p>
          </div>
          <input
            value={studentEmail}
            onChange={(event) => setStudentEmail(event.target.value)}
            placeholder={t.coach.studentEmailPlaceholder}
            className="apple-input bg-white"
          />
          <button
            type="button"
            onClick={bindStudent}
            disabled={!user || !studentEmail.trim() || isBinding}
            className="apple-button-primary mt-3 w-full gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBinding && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.coach.bindStudent}
          </button>
        </div>
      </div>

      {user && (
        <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm leading-6 text-green-800">
          {t.coach.coachEnabled}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
