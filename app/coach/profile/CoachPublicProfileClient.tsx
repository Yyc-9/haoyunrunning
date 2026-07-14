'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { CheckCircle2, ImagePlus, Loader2, UserRound } from 'lucide-react'
import CoachSubNav from '@/components/CoachSubNav'
import type { CoachPublicProfile } from '@/lib/coach-profiles'
import { announceSiteContentUpdated } from '@/lib/site-content-sync'
import { supabase } from '@/lib/supabase'

async function accessToken() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function profileRequest(method: 'GET' | 'PATCH', avatarUrl?: string) {
  const token = await accessToken()
  if (!token) throw new Error('請先登入教練或超級管理員帳號。')
  const response = await fetch('/api/coach/profile', {
    method,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(avatarUrl ? { 'Content-Type': 'application/json' } : {}) },
    body: avatarUrl ? JSON.stringify({ avatarUrl }) : undefined,
  })
  const payload = (await response.json().catch(() => ({}))) as { profile?: CoachPublicProfile; message?: string; error?: string }
  if (!response.ok || !payload.profile) throw new Error(payload.error || '教練頭像讀取失敗。')
  return payload
}

async function uploadCoachImage(file: File) {
  const token = await accessToken()
  if (!token) throw new Error('請重新登入教練帳號。')
  const formData = new FormData()
  formData.set('file', file)
  formData.set('folder', 'coaches')
  const response = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!response.ok || !payload.url) throw new Error(payload.error || '照片上傳失敗。')
  return payload.url
}

function AvatarEditor({ profile, uploading, onUpload }: { profile: CoachPublicProfile; uploading: boolean; onUpload: (file?: File) => void }) {
  return (
    <section className="grid gap-6 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
        <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full border border-black/10 bg-apple-gray-100 sm:h-40 sm:w-40">
          {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="教練頭像預覽" fill quality={95} sizes="160px" className="object-cover" style={{ objectPosition: `${profile.avatarFocusX}% ${profile.avatarFocusY}%` }} /> : <UserRound className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-apple-gray-300" />}
        </div>
        <div>
          <h2 className="text-xl font-black text-apple-gray-900">{profile.displayName}</h2>
          <p className="mt-2 text-sm leading-6 text-apple-gray-500">支援 JPG、PNG 或 WebP，建議使用清晰的正方形個人照片。選擇圖片後會自動儲存。</p>
          <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-apple-gray-800">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{uploading ? '正在上傳' : '更換頭像'}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => onUpload(event.target.files?.[0])} className="sr-only" />
          </label>
        </div>
    </section>
  )
}

export default function CoachPublicProfileClient() {
  const [profile, setProfile] = useState<CoachPublicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    profileRequest('GET').then(({ profile: value }) => setProfile(value ?? null)).catch((reason) => setError(reason instanceof Error ? reason.message : '讀取失敗。')).finally(() => setIsLoading(false))
  }, [])

  async function upload(file?: File) {
    if (!file) return
    setUploading(true)
    setError('')
    setMessage('')
    try {
      const avatarUrl = await uploadCoachImage(file)
      const result = await profileRequest('PATCH', avatarUrl)
      setProfile(result.profile ?? null)
      setMessage(result.message || '頭像已更新。')
      announceSiteContentUpdated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '照片上傳失敗。')
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />
          <div className="max-w-3xl">
            <header className="mb-6 border-b border-black/10 pb-6 sm:mb-8">
              <p className="text-xs font-bold text-apple-blue sm:text-sm">教練帳號</p>
              <h1 className="mt-2 text-3xl font-black text-black sm:text-4xl">頭像設定</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-apple-gray-600 sm:text-base">在這裡更換教練工作台使用的頭像。個人跑者資料請至「我的帳戶」管理，課程介紹由超級管理員統一維護。</p>
            </header>

            {error ? <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
            {message ? <p className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</p> : null}
            {isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : null}

            {profile ? <div className="rounded-lg border border-black/10 bg-white p-5 sm:p-7"><AvatarEditor profile={profile} uploading={uploading} onUpload={(file) => void upload(file)} /></div> : null}
          </div>
        </div>
      </section>
    </main>
  )
}
