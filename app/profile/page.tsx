'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Award,
  CalendarCheck2,
  CircleUserRound,
  Crown,
  HeartHandshake,
  Instagram,
  Loader2,
  LockKeyhole,
  Medal,
  MessageCircleHeart,
  Route,
  Save,
  ShieldCheck,
  ShoppingBag,
  TicketCheck,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'

type AccountProfile = {
  id: string
  role: 'student' | 'coach' | 'admin'
  name: string
  email: string
  phone: string
  goal: string
  pb: string
  nickname: string
  bio: string
  city: string
  running_since: string
  favorite_distance: string
  target_event: string
  instagram: string
}

type Achievement = {
  slug: string
  name: string
  description: string
  unlockHint: string
  icon: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  earned: boolean
  reason: string
  awardedAt: string | null
}

type AccountPayload = {
  profile?: AccountProfile
  achievements?: Achievement[]
  error?: string
}

const accountLinks = [
  { href: '/courses', icon: TicketCheck, title: '查看訓練課程', description: '依地點、程度與目標找到適合的班級。' },
  { href: '/group-signup', icon: UsersRound, title: '參加開放團練', description: '留下本週六團練意向與聯絡資料。' },
  { href: '/shop', icon: ShoppingBag, title: '前往好運商店', description: '查看跑班服飾、配件與訓練補給。' },
]

const achievementIcons = {
  'user-round': UserRound,
  'ticket-check': TicketCheck,
  'message-circle-heart': MessageCircleHeart,
  'calendar-check': CalendarCheck2,
  route: Route,
  medal: Medal,
  trophy: Trophy,
  'heart-handshake': HeartHandshake,
  crown: Crown,
  award: Award,
} as const

const rarityTone = {
  common: 'border-black/10 bg-white text-apple-gray-900',
  rare: 'border-blue-200 bg-blue-50 text-blue-950',
  epic: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  legendary: 'border-amber-300 bg-amber-50 text-amber-950',
} as const

const emptyProfile: AccountProfile = {
  id: '',
  role: 'student',
  name: '',
  email: '',
  phone: '',
  goal: '',
  pb: '',
  nickname: '',
  bio: '',
  city: '',
  running_since: '',
  favorite_distance: '',
  target_event: '',
  instagram: '',
}

function FieldLabel({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return <span className="mb-2 block text-sm font-black text-apple-gray-800">{children}{optional ? <span className="ml-2 text-xs font-medium text-apple-gray-400">選填</span> : <span className="ml-1 text-red-500">*</span>}</span>
}

export default function ProfilePage() {
  const { isLoggedIn, isLoading, user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<AccountProfile>(emptyProfile)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isAccountLoading, setIsAccountLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadAccount = useCallback(async () => {
    if (!supabase || !isLoggedIn) return
    setIsAccountLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('請重新登入後再查看帳戶。')
      const response = await fetch('/api/account/me', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as AccountPayload
      if (!response.ok || !payload.profile) throw new Error(payload.error || '讀取帳戶資料失敗。')
      setProfile({ ...emptyProfile, ...payload.profile })
      setAchievements(payload.achievements ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取帳戶資料失敗。')
    } finally {
      setIsAccountLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoading && isLoggedIn) loadAccount()
  }, [isLoading, isLoggedIn, loadAccount])

  const earnedCount = useMemo(() => achievements.filter((badge) => badge.earned).length, [achievements])
  const completion = achievements.length ? Math.round((earnedCount / achievements.length) * 100) : 0
  const displayName = profile.nickname || profile.name || user?.name || '好運會員'

  function updateField<K extends keyof AccountProfile>(key: K, value: AccountProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  async function saveProfile() {
    if (!profile.name.trim()) {
      setError('請填寫真實姓名。')
      return
    }
    if (!supabase) return

    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
      const response = await fetch('/api/account/me', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          pb: profile.pb,
          nickname: profile.nickname,
          bio: profile.bio,
          city: profile.city,
          runningSince: profile.running_since,
          favoriteDistance: profile.favorite_distance,
          targetEvent: profile.target_event,
          instagram: profile.instagram,
          goal: profile.goal,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as AccountPayload
      if (!response.ok || !payload.profile) throw new Error(payload.error || '儲存帳戶資料失敗。')
      setProfile({ ...emptyProfile, ...payload.profile })
      setAchievements(payload.achievements ?? [])
      await refreshUser()
      setSuccess('跑者資料已儲存。符合條件的新勳章也會同步更新。')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '儲存帳戶資料失敗。')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-apple-gray-50 pt-24"><div className="text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-apple-gray-200 border-t-black" /><p className="mt-4 text-sm font-semibold text-apple-gray-600">正在讀取帳戶...</p></div></main>
  }

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-apple-gray-50 pt-24">
        <section className="container mx-auto max-w-4xl px-4 py-16 sm:py-24">
          <div className="grid overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm md:grid-cols-[1.15fr_0.85fr]">
            <div className="p-7 sm:p-10"><p className="text-sm font-bold text-apple-blue">我的帳戶</p><h1 className="mt-3 text-3xl font-black leading-tight text-apple-gray-950 sm:text-5xl">登入後建立你的跑者檔案</h1><p className="mt-5 text-base leading-8 text-apple-gray-600">填寫跑步目標、個人最佳與偏好距離，並在訓練過程中收集好運勳章。</p><Link href="/?auth=login" className="apple-button-primary mt-8 inline-flex gap-2 px-6 py-3">登入帳戶<ArrowRight className="h-4 w-4" /></Link></div>
            <div className="flex items-center justify-center bg-black p-10 text-white"><div className="max-w-xs text-center"><CircleUserRound className="mx-auto h-14 w-14 text-white/85" /><h2 className="mt-5 text-xl font-black">一個帳戶，記錄每次進步</h2><p className="mt-3 text-sm leading-7 text-white/70">個人資料、課程狀態與榮譽勳章都會留在同一個帳戶中。</p></div></div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-24">
      <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="border-b border-black/10 pb-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black text-2xl font-black text-white">{displayName.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-apple-blue">我的跑者帳戶</p>
              <h1 className="mt-1 truncate text-3xl font-black text-apple-gray-950">{displayName}</h1>
              <p className="mt-2 truncate text-apple-gray-600">{profile.email || user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-apple-gray-700">
                {profile.city ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">{profile.city}</span> : null}
                {profile.favorite_distance ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">偏好 {profile.favorite_distance}</span> : null}
                {profile.running_since ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">{profile.running_since} 開始跑步</span> : null}
              </div>
            </div>
            {user.role === 'admin' ? <Link href="/admin" className="apple-button-primary gap-2 px-5 py-3"><ShieldCheck className="h-4 w-4" />進入管理後台</Link> : null}
          </div>
        </motion.section>

        {error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
        {success ? <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{success}</p> : null}

        <section className="py-9">
          <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-apple-blue">RUNNER PROFILE</p><h2 className="mt-1 text-2xl font-black text-apple-gray-950">跑者資料</h2></div>{isAccountLoading ? <Loader2 className="h-5 w-5 animate-spin text-apple-gray-400" /> : null}</div>
          <div className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block"><FieldLabel>真實姓名</FieldLabel><input autoComplete="name" value={profile.name} onChange={(event) => updateField('name', event.target.value)} className="apple-input min-h-12" /></label>
              <label className="block"><FieldLabel optional>暱稱</FieldLabel><input value={profile.nickname} onChange={(event) => updateField('nickname', event.target.value)} className="apple-input min-h-12" placeholder="跑友會怎麼稱呼你？" /></label>
              <label className="block"><FieldLabel optional>手機電話</FieldLabel><input type="tel" inputMode="tel" autoComplete="tel" value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} className="apple-input min-h-12" /></label>
              <label className="block"><FieldLabel optional>所在城市</FieldLabel><input autoComplete="address-level2" value={profile.city} onChange={(event) => updateField('city', event.target.value)} className="apple-input min-h-12" placeholder="例如 新竹、台北" /></label>
              <label className="block"><FieldLabel optional>開始跑步年份</FieldLabel><input inputMode="numeric" maxLength={4} value={profile.running_since} onChange={(event) => updateField('running_since', event.target.value.replace(/\D/g, '').slice(0, 4))} className="apple-input min-h-12" placeholder="2024" /></label>
              <label className="block"><FieldLabel optional>偏好距離</FieldLabel><select value={profile.favorite_distance} onChange={(event) => updateField('favorite_distance', event.target.value)} className="apple-input min-h-12"><option value="">請選擇</option>{['5K', '10K', '半馬', '全馬', '越野跑', '尚未確定'].map((distance) => <option key={distance} value={distance}>{distance}</option>)}</select></label>
              <label className="block"><FieldLabel optional>個人最佳 PB</FieldLabel><input value={profile.pb} onChange={(event) => updateField('pb', event.target.value)} className="apple-input min-h-12" placeholder="例如 半馬 1:45:00" /></label>
              <label className="block"><FieldLabel optional>目標賽事</FieldLabel><input value={profile.target_event} onChange={(event) => updateField('target_event', event.target.value)} className="apple-input min-h-12" placeholder="賽事名稱與日期" /></label>
              <label className="block md:col-span-2"><FieldLabel optional>近期跑步目標</FieldLabel><input value={profile.goal} onChange={(event) => updateField('goal', event.target.value)} className="apple-input min-h-12" placeholder="想完成的距離、時間或訓練目標" /></label>
              <label className="block"><FieldLabel optional>Instagram</FieldLabel><div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-apple-gray-400">@</span><input autoCapitalize="none" value={profile.instagram} onChange={(event) => updateField('instagram', event.target.value.replace(/^@/, ''))} className="apple-input min-h-12 pl-9" /></div></label>
              <label className="block md:col-span-2"><FieldLabel optional>跑者自我介紹</FieldLabel><textarea maxLength={600} value={profile.bio} onChange={(event) => updateField('bio', event.target.value)} className="apple-input min-h-28 resize-y" placeholder="分享你喜歡跑步的原因、目前的訓練狀態或想遇見的跑友" /><span className="mt-2 block text-right text-xs text-apple-gray-400">{profile.bio.length} / 600</span></label>
            </div>
            <button type="button" disabled={isSaving || isAccountLoading} onClick={saveProfile} className="apple-button-primary mt-6 min-h-12 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"><Save className="h-4 w-4" />{isSaving ? '正在儲存' : '儲存跑者資料'}</button>
          </div>
        </section>

        <section className="border-t border-black/10 py-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-sm font-bold text-apple-blue">ACHIEVEMENTS</p><h2 className="mt-1 text-2xl font-black text-apple-gray-950">榮譽勳章</h2><p className="mt-2 text-sm leading-6 text-apple-gray-600">每一枚勳章都記錄一段跑步歷程。</p></div>
            <div className="min-w-52"><div className="flex justify-between text-sm font-black"><span>收藏進度</span><span>{earnedCount} / {achievements.length}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-apple-gray-200"><div className="h-full rounded-full bg-black transition-[width]" style={{ width: `${completion}%` }} /></div></div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((badge) => {
              const Icon = achievementIcons[badge.icon as keyof typeof achievementIcons] ?? Award
              return (
                <article key={badge.slug} className={`min-h-56 rounded-lg border p-5 ${badge.earned ? rarityTone[badge.rarity] : 'border-black/10 bg-apple-gray-100 text-apple-gray-500'}`}>
                  <div className="flex items-start justify-between gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-full ${badge.earned ? 'bg-white/80 ring-1 ring-black/10' : 'bg-white'}`}>{badge.earned ? <Icon className="h-6 w-6" /> : <LockKeyhole className="h-5 w-5" />}</div><span className="rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-black ring-1 ring-black/5">{badge.category}</span></div>
                  <h3 className="mt-5 text-lg font-black">{badge.name}</h3>
                  <p className="mt-2 text-sm leading-6 opacity-80">{badge.description}</p>
                  <p className="mt-4 border-t border-current/10 pt-3 text-xs font-bold leading-5 opacity-70">{badge.earned ? badge.reason || '已獲得' : badge.unlockHint}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="border-t border-black/10 py-9">
          <h2 className="text-2xl font-black text-apple-gray-950">常用入口</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">{accountLinks.map((item) => <Link key={item.href} href={item.href} className="rounded-lg border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><item.icon className="h-6 w-6 text-apple-blue" /><h3 className="mt-5 text-lg font-black text-apple-gray-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-apple-gray-600">{item.description}</p></Link>)}</div>
        </section>

        <section className="flex flex-col justify-between gap-5 border-t border-black/10 py-8 sm:flex-row sm:items-center"><div><h2 className="font-black text-apple-gray-950">需要協助？</h2><p className="mt-1 text-sm text-apple-gray-600">課程、團練與商品問題請透過官方 Instagram 聯絡。</p></div><a href="https://www.instagram.com/nurture.running.team/" target="_blank" rel="noreferrer" className="apple-button-secondary gap-2 px-5 py-3"><Instagram className="h-4 w-4" />聯絡好運</a></section>
      </div>
    </main>
  )
}
