'use client'

import { useState } from 'react'
import { KeyRound, Link2, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'

type CoachAccessPanelProps = {
  compact?: boolean
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

export default function CoachAccessPanel({ compact = false, onStudentBound }: CoachAccessPanelProps) {
  const { user, updateUser, refreshUser } = useAuth()
  const { t } = useLanguage()
  const [inviteCode, setInviteCode] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [isBinding, setIsBinding] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isCoach = user?.role === 'coach' || user?.role === 'admin'

  const redeemInvite = async () => {
    setIsRedeeming(true)
    setMessage('')
    setError('')

    try {
      const payload = await postWithSession('/api/coach/redeem-invite', { code: inviteCode })
      updateUser({
        role: payload.profile?.role || 'coach',
        name: payload.profile?.name,
        email: payload.profile?.email,
        phone: payload.profile?.phone,
        pb: payload.profile?.pb,
        avatar: payload.profile?.avatar_url,
      })
      await refreshUser()
      setInviteCode('')
      setMessage(t.coach.inviteSuccess)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.coach.inviteFailed)
    } finally {
      setIsRedeeming(false)
    }
  }

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
    <div className="apple-card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-apple-gray-500">{t.coach.accessLabel}</p>
          <h2 className="text-xl font-bold text-apple-gray-900">
            {isCoach ? t.coach.bindTitle : t.coach.inviteInfoTitle}
          </h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className={isCoach || compact ? 'space-y-4' : 'grid gap-4 md:grid-cols-2'}>
        {!isCoach && (
          <div className="rounded-3xl bg-apple-gray-100 p-4">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-apple-gray-700" />
              <p className="font-bold text-apple-gray-900">{t.coach.inviteInput}</p>
            </div>
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder={t.coach.invitePlaceholder}
              className="apple-input bg-white"
            />
            <button
              type="button"
              onClick={redeemInvite}
              disabled={!user || !inviteCode.trim() || isRedeeming}
              className="apple-button-primary mt-3 w-full gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRedeeming && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.coach.enableAccess}
            </button>
          </div>
        )}

        {isCoach ? (
        <div className="rounded-3xl bg-apple-gray-100 p-4">
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
        ) : null}
      </div>

      {!user && (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          {t.coach.loginFirst}
        </p>
      )}

      {user && isCoach && (
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
