'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { CheckCircle2, ImagePlus, Loader2, Save, UserRound } from 'lucide-react'
import CoachSubNav from '@/components/CoachSubNav'
import type { CoachPublicProfile } from '@/lib/coach-profiles'
import { announceSiteContentUpdated } from '@/lib/site-content-sync'
import { supabase } from '@/lib/supabase'

async function accessToken() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function profileRequest(method: 'GET' | 'PATCH', body?: CoachPublicProfile) {
  const token = await accessToken()
  if (!token) throw new Error('請先登入教練或超級管理員帳號。')
  const response = await fetch('/api/coach/profile', {
    method,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = (await response.json().catch(() => ({}))) as { profile?: CoachPublicProfile; message?: string; error?: string }
  if (!response.ok || !payload.profile) throw new Error(payload.error || '教練公開資料讀取失敗。')
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

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function TextField({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold text-apple-gray-500">{label}</span>
      {textarea
        ? <textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} className="apple-input resize-y" />
        : <input value={value} onChange={(event) => onChange(event.target.value)} className="apple-input" />}
    </label>
  )
}

function ImageEditor({ label, url, focusX, focusY, uploading, onUpload, onFocus }: { label: string; url: string; focusX: number; focusY: number; uploading: boolean; onUpload: (file?: File) => void; onFocus: (axis: 'x' | 'y', value: number) => void }) {
  return (
    <section className="border-b border-black/10 py-5 first:pt-0 last:border-b-0">
      <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-apple-gray-100">
          {url ? <Image src={url} alt={`${label}預覽`} fill quality={95} sizes="180px" className="object-cover" style={{ objectPosition: `${focusX}% ${focusY}%` }} /> : <UserRound className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-apple-gray-300" />}
        </div>
        <div>
          <h3 className="font-black text-apple-gray-900">{label}</h3>
          <p className="mt-1 text-sm leading-6 text-apple-gray-500">上傳原始高解析度照片，再調整人物在框內的位置。</p>
          <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-bold hover:bg-apple-gray-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}更換照片
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => onUpload(event.target.files?.[0])} className="sr-only" />
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-apple-gray-500">水平位置 {focusX}%<input type="range" min={0} max={100} value={focusX} onChange={(event) => onFocus('x', Number(event.target.value))} className="mt-2 w-full" /></label>
            <label className="text-xs font-bold text-apple-gray-500">垂直位置 {focusY}%<input type="range" min={0} max={100} value={focusY} onChange={(event) => onFocus('y', Number(event.target.value))} className="mt-2 w-full" /></label>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function CoachPublicProfileClient() {
  const [profile, setProfile] = useState<CoachPublicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploading, setUploading] = useState<'avatar' | 'full' | ''>('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    profileRequest('GET').then(({ profile: value }) => setProfile(value ?? null)).catch((reason) => setError(reason instanceof Error ? reason.message : '讀取失敗。')).finally(() => setIsLoading(false))
  }, [])

  async function upload(file: File | undefined, kind: 'avatar' | 'full') {
    if (!file || !profile) return
    setUploading(kind)
    setError('')
    try {
      const url = await uploadCoachImage(file)
      setProfile((current) => current ? { ...current, [kind === 'avatar' ? 'avatarUrl' : 'fullBodyImageUrl']: url } : current)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '照片上傳失敗。')
    } finally {
      setUploading('')
    }
  }

  async function save() {
    if (!profile) return
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await profileRequest('PATCH', profile)
      setProfile(result.profile ?? profile)
      setMessage(result.message || '公開資料已同步。')
      announceSiteContentUpdated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '儲存失敗。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <CoachSubNav />
          <header className="mb-6 border-b border-black/10 pb-6 sm:mb-8">
            <p className="text-xs font-bold text-apple-blue sm:text-sm">教練公開資料</p>
            <h1 className="mt-2 text-3xl font-black text-black sm:text-4xl">管理你的課程介紹</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-apple-gray-600 sm:text-base">儲存後，所有已綁定你的訓練課程會使用這份姓名、照片與經歷。</p>
          </header>

          {error ? <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
          {message ? <p className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</p> : null}
          {isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : null}

          {profile ? (
            <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
              <div className="grid gap-4 border-b border-black/10 p-5 sm:p-6 md:grid-cols-2">
                <TextField label="對外顯示名稱" value={profile.displayName} onChange={(displayName) => setProfile({ ...profile, displayName })} />
                <TextField label="暱稱" value={profile.nickname} onChange={(nickname) => setProfile({ ...profile, nickname })} />
                <div className="md:col-span-2"><TextField label="教練定位" value={profile.role} onChange={(role) => setProfile({ ...profile, role })} /></div>
                <div className="md:col-span-2"><TextField label="公開介紹" value={profile.bio} onChange={(bio) => setProfile({ ...profile, bio })} textarea /></div>
              </div>

              <div className="p-5 sm:p-6">
                <ImageEditor label="課程頭像" url={profile.avatarUrl} focusX={profile.avatarFocusX} focusY={profile.avatarFocusY} uploading={uploading === 'avatar'} onUpload={(file) => upload(file, 'avatar')} onFocus={(axis, value) => setProfile({ ...profile, [axis === 'x' ? 'avatarFocusX' : 'avatarFocusY']: value })} />
                <ImageEditor label="教練形象照" url={profile.fullBodyImageUrl} focusX={profile.fullBodyFocusX} focusY={profile.fullBodyFocusY} uploading={uploading === 'full'} onUpload={(file) => upload(file, 'full')} onFocus={(axis, value) => setProfile({ ...profile, [axis === 'x' ? 'fullBodyFocusX' : 'fullBodyFocusY']: value })} />
              </div>

              <div className="grid gap-4 border-t border-black/10 p-5 sm:p-6 md:grid-cols-2">
                <div className="md:col-span-2"><TextField label="帶訓風格" value={profile.style} onChange={(style) => setProfile({ ...profile, style })} textarea /></div>
                <TextField label="擅長方向（每行一項）" value={profile.specialties.join('\n')} onChange={(value) => setProfile({ ...profile, specialties: lines(value) })} textarea />
                <TextField label="代表經歷（每行一項）" value={profile.achievements.join('\n')} onChange={(value) => setProfile({ ...profile, achievements: lines(value) })} textarea />
                <div className="md:col-span-2"><TextField label="教練證照（每行一項）" value={profile.certifications.join('\n')} onChange={(value) => setProfile({ ...profile, certifications: lines(value) })} textarea /></div>
              </div>

              <div className="flex flex-col gap-3 border-t border-black/10 bg-apple-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={profile.published} onChange={(event) => setProfile({ ...profile, published: event.target.checked })} className="h-4 w-4" />在課程頁公開顯示</label>
                <button type="button" onClick={save} disabled={isSaving || Boolean(uploading)} className="apple-button-primary min-h-11 gap-2 px-6 disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}儲存並同步課程介紹</button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
