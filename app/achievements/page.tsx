import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Award,
  CalendarCheck2,
  Crown,
  HeartHandshake,
  Medal,
  MessageCircleHeart,
  Route,
  TicketCheck,
  Trophy,
  UserRound,
} from 'lucide-react'
import { publicAchievementCatalog } from '@/lib/achievement-catalog'

export const metadata: Metadata = {
  title: '榮耀徽章 - 好運跑班',
  description: '查看好運跑班榮耀徽章的意義與取得方式。',
}

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
  common: 'border-black/10 bg-white',
  rare: 'border-blue-200 bg-blue-50',
  epic: 'border-emerald-200 bg-emerald-50',
  legendary: 'border-amber-300 bg-amber-50',
} as const

export default function AchievementsPage() {
  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="border-b border-black/10 bg-white px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase tracking-wide text-apple-blue">GOOD LUCK ACHIEVEMENTS</p>
          <h1 className="mt-3 text-4xl font-black text-apple-gray-950 sm:text-5xl lg:text-6xl">榮耀徽章</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-apple-gray-600 sm:text-lg">
            徽章記錄的是每一次完成、持續與突破。符合條件後由系統、教練或管理員依實際紀錄發放，不需要另外購買。
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicAchievementCatalog.map((badge) => {
              const Icon = achievementIcons[badge.icon as keyof typeof achievementIcons] ?? Award
              return (
                <article key={badge.slug} className={`rounded-lg border p-5 shadow-sm sm:p-6 ${rarityTone[badge.rarity]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-sm ring-1 ring-black/10">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-apple-gray-600 ring-1 ring-black/5">{badge.category}</span>
                  </div>
                  <h2 className="mt-5 text-xl font-black text-apple-gray-950">{badge.name}</h2>
                  <p className="mt-2 text-sm leading-7 text-apple-gray-600">{badge.description}</p>
                  <div className="mt-5 border-t border-black/10 pt-4">
                    <p className="text-xs font-black uppercase tracking-wide text-apple-gray-400">如何取得</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-apple-gray-700">{badge.unlockHint}</p>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-10 rounded-lg bg-black p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-300">MY ACHIEVEMENTS</p>
              <h2 className="mt-2 text-2xl font-black">查看你已經取得的徽章</h2>
              <p className="mt-2 text-sm leading-6 text-white/65">登入個人帳戶後，可查看解鎖狀態與實際取得原因。</p>
            </div>
            <Link href="/profile" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-black text-black sm:mt-0 sm:w-auto">
              前往個人帳戶
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
