'use client'

import { useState } from 'react'
import { KeyRound, Link2, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'

type CoachAccessPanelProps = {
  compact?: boolean
  onStudentBound?: () => void
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
      setMessage('教練權限已啟用。現在可以綁定學員。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '邀请码啟用失敗。')
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
      setMessage('學員已綁定。列表會讀取這位學員的真實資料。')
      onStudentBound?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '學員綁定失敗。')
    } finally {
      setIsBinding(false)
    }
  }

  return (
    <div className="apple-card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-apple-gray-500">Coach access</p>
          <h2 className="text-xl font-bold text-apple-gray-900">
            {isCoach ? '學員綁定' : '教練權限與學員綁定'}
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
              <p className="font-bold text-apple-gray-900">輸入教練邀请码</p>
            </div>
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="COACHLUCK2026"
              className="apple-input bg-white"
            />
            <button
              type="button"
              onClick={redeemInvite}
              disabled={!user || !inviteCode.trim() || isRedeeming}
              className="apple-button-primary mt-3 w-full gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRedeeming && <Loader2 className="h-4 w-4 animate-spin" />}
              啟用教練權限
            </button>
          </div>
        )}

        <div className="rounded-3xl bg-apple-gray-100 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-apple-gray-700" />
            <p className="font-bold text-apple-gray-900">用信箱綁定學員</p>
          </div>
          <input
            value={studentEmail}
            onChange={(event) => setStudentEmail(event.target.value)}
            placeholder="student@example.com"
            className="apple-input bg-white"
          />
          <button
            type="button"
            onClick={bindStudent}
            disabled={!user || !studentEmail.trim() || isBinding}
            className="apple-button-primary mt-3 w-full gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBinding && <Loader2 className="h-4 w-4 animate-spin" />}
            綁定學員
          </button>
        </div>
      </div>

      {!user && (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          請先登入帳號，再使用邀请码或綁定學員。
        </p>
      )}

      {user && isCoach && (
        <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm leading-6 text-green-800">
          你的教練權限已啟用。之後只需要用學員信箱建立綁定，不必再次輸入邀请码。
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
