'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Award, CalendarCheck2, CircleUserRound, Crown, Edit3, ExternalLink, HeartHandshake,
  Instagram, Loader2, LockKeyhole, MapPin, Medal, MessageCircleHeart, Route, ShoppingBag,
  Sparkles, Target, TicketCheck, Trophy, UserRound, UsersRound,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import {
  emptyProfile, getRaceEvent, getTargetEventLabel, type AccountProfile, type Achievement,
} from '@/lib/runner-profile'
import { supabase } from '@/lib/supabase'

type AccountPayload = { profile?: AccountProfile; achievements?: Achievement[]; error?: string }

const accountLinks = [
  { href: '/courses', icon: TicketCheck, title: '訓練課程' },
  { href: '/group-signup', icon: UsersRound, title: '開放團練' },
  { href: '/shop', icon: ShoppingBag, title: '好運商店' },
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
  common: 'border-black/10 bg-white text-black',
  rare: 'border-blue-200 bg-blue-50 text-blue-950',
  epic: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  legendary: 'border-amber-300 bg-amber-50 text-amber-950',
} as const

function getRunningLabel(value: string) {
  if (!value) return '待補充'
  return /^\d{4}$/.test(value) ? `${value} 年開始` : value
}

export default function ProfilePage() {
  const { isLoggedIn, isLoading, user } = useAuth()
  const [profile, setProfile] = useState<AccountProfile>(emptyProfile)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isAccountLoading, setIsAccountLoading] = useState(true)
  const [error, setError] = useState('')

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
  const race = getRaceEvent(profile.target_event)
  const profileFields = [profile.nickname, profile.city, profile.running_since, profile.favorite_distance, profile.pb, profile.goal, profile.bio]
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100)

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-apple-gray-50 pt-24"><div className="text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-apple-gray-200 border-t-black" /><p className="mt-4 text-sm font-semibold text-apple-gray-600">正在讀取帳戶...</p></div></main>
  }

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-apple-gray-50 pt-24">
        <section className="container mx-auto max-w-4xl px-4 py-12 sm:py-20">
          <div className="grid overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm md:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6 sm:p-10"><p className="text-sm font-bold text-apple-blue">我的帳戶</p><h1 className="mt-3 text-3xl font-black leading-tight text-black sm:text-5xl">登入後建立你的跑者檔案</h1><p className="mt-4 text-sm leading-7 text-apple-gray-600 sm:text-base">記錄跑步目標、個人最佳與榮譽勳章。</p><Link href="/?auth=login" className="apple-button-primary mt-7 inline-flex gap-2 px-6 py-3">登入帳戶<ArrowRight className="h-4 w-4" /></Link></div>
            <div className="flex items-center justify-center bg-black p-8 text-white"><div className="max-w-xs text-center"><CircleUserRound className="mx-auto h-12 w-12 text-white/85" /><h2 className="mt-4 text-xl font-black">一個帳戶，記錄每次進步</h2></div></div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
        {error ? <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-lg bg-black text-white shadow-xl">
          <div className="absolute inset-y-0 left-0 w-2 bg-emerald-400" />
          <div className="grid gap-6 p-5 pl-7 sm:p-8 sm:pl-10 lg:grid-cols-[1fr_320px] lg:items-stretch">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-300"><Sparkles className="h-4 w-4" />GOOD LUCK RUNNER ID</div>
              <div className="mt-5 flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl font-black sm:h-20 sm:w-20">{displayName.charAt(0)}</div>
                <div className="min-w-0"><h1 className="truncate text-3xl font-black sm:text-5xl">{displayName}</h1><p className="mt-1 truncate text-sm text-white/55">{profile.email || user.email}</p></div>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">{profile.bio || '寫下你的跑步故事，讓這張跑者名片更像你。'}</p>
              <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-2xl sm:gap-3">
                {[
                  ['跑齡', getRunningLabel(profile.running_since)],
                  ['偏好', profile.favorite_distance || '待補充'],
                  ['PB', profile.pb.replace('｜', ' ') || '待補充'],
                ].map(([label, value]) => <div key={label} className="min-w-0 rounded-md bg-white/10 p-3"><p className="text-[10px] font-bold text-white/45 sm:text-xs">{label}</p><p className="mt-1 truncate text-xs font-black sm:text-sm">{value}</p></div>)}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-md bg-white p-4 text-black sm:p-5">
              <div><div className="flex items-center justify-between"><p className="text-xs font-black text-apple-gray-500">PROFILE STATUS</p><span className="text-sm font-black">{profileCompletion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-apple-gray-200"><div className="h-full bg-emerald-500" style={{ width: `${profileCompletion}%` }} /></div>
              <div className="mt-5 space-y-3 text-sm">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-apple-gray-400" />{profile.city || '尚未選擇城市'}</p>
                <p className="flex items-start gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-apple-gray-400" /><span>{profile.goal || '尚未設定近期目標'}</span></p>
              </div></div>
              <Link href="/profile/edit" className="apple-button-primary mt-5 w-full gap-2 px-4 py-2.5 text-sm"><Edit3 className="h-4 w-4" />修改跑者資料</Link>
            </div>
          </div>
        </motion.section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-xs font-black text-apple-blue">NEXT RACE</p>
            <h2 className="mt-1 text-xl font-black text-black sm:text-2xl">目標賽事</h2>
            <p className="mt-3 text-sm leading-6 text-apple-gray-600">{getTargetEventLabel(profile.target_event) || '尚未選擇目標賽事。可到修改頁從最新賽事目錄中選擇。'}</p>
            {race ? <a href={race.officialUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-black">查看官方資訊<ExternalLink className="h-4 w-4" /></a> : null}
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-xs font-black text-apple-blue">CONTACT</p><h2 className="mt-1 text-xl font-black text-black sm:text-2xl">聯絡資料</h2>
            <div className="mt-3 space-y-2 text-sm text-apple-gray-600"><p>{profile.phone || '尚未填寫電話'}</p><p>{profile.instagram ? `@${profile.instagram}` : '尚未填寫 Instagram'}</p></div>
          </div>
        </section>

        <section className="border-t border-black/10 py-7 sm:py-10">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold text-apple-blue sm:text-sm">ACHIEVEMENTS</p><h2 className="mt-1 text-2xl font-black text-black">榮譽勳章</h2></div>
            {isAccountLoading ? <Loader2 className="h-5 w-5 animate-spin text-apple-gray-400" /> : <p className="text-sm font-black">{earnedCount} / {achievements.length}</p>}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-apple-gray-200"><div className="h-full rounded-full bg-black" style={{ width: `${completion}%` }} /></div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 sm:gap-4">
            {achievements.map((badge) => {
              const Icon = achievementIcons[badge.icon as keyof typeof achievementIcons] ?? Award
              return (
                <article key={badge.slug} className={`min-h-44 rounded-lg border p-4 sm:min-h-52 sm:p-5 ${badge.earned ? rarityTone[badge.rarity] : 'border-black/10 bg-apple-gray-100 text-apple-gray-500'}`}>
                  <div className="flex items-start justify-between gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-black/10">{badge.earned ? <Icon className="h-5 w-5" /> : <LockKeyhole className="h-4 w-4" />}</div><span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black">{badge.category}</span></div>
                  <h3 className="mt-4 text-base font-black sm:text-lg">{badge.name}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 opacity-80 sm:text-sm sm:leading-6">{badge.description}</p>
                  <p className="mt-3 border-t border-current/10 pt-2 text-[11px] font-bold leading-4 opacity-65">{badge.earned ? badge.reason || '已獲得' : badge.unlockHint}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="border-t border-black/10 py-7">
          <h2 className="text-xl font-black text-black">常用入口</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">{accountLinks.map((item) => <Link key={item.href} href={item.href} className="flex min-h-24 flex-col justify-between rounded-lg border border-black/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 sm:min-h-32 sm:p-5"><item.icon className="h-5 w-5 text-apple-blue" /><span className="mt-4 text-xs font-black sm:text-base">{item.title}</span></Link>)}</div>
        </section>

        <a href="https://www.instagram.com/nurture.running.team/" target="_blank" rel="noreferrer" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-600"><Instagram className="h-4 w-4" />聯絡好運跑班</a>
      </div>
    </main>
  )
}
