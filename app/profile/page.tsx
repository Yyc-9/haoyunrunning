'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CircleUserRound, Instagram, ShieldCheck, ShoppingBag, TicketCheck, UsersRound } from 'lucide-react'
import { useAuth } from '@/app/providers'

const accountLinks = [
  {
    href: '/courses',
    icon: TicketCheck,
    title: '查看訓練課程',
    description: '依地點、程度與目標找到適合的班級。',
  },
  {
    href: '/group-signup',
    icon: UsersRound,
    title: '參加開放團練',
    description: '留下本週六團練意向與聯絡資料。',
  },
  {
    href: '/shop',
    icon: ShoppingBag,
    title: '前往好運商店',
    description: '查看跑班服飾、配件與訓練補給。',
  },
]

export default function ProfilePage() {
  const { isLoggedIn, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-apple-gray-50 pt-24">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-apple-gray-200 border-t-black" />
          <p className="mt-4 text-sm font-semibold text-apple-gray-600">正在讀取帳戶...</p>
        </div>
      </main>
    )
  }

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-apple-gray-50 pt-24">
        <section className="container mx-auto max-w-4xl px-4 py-16 sm:py-24">
          <div className="grid overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm md:grid-cols-[1.15fr_0.85fr]">
            <div className="p-7 sm:p-10">
              <p className="text-sm font-bold uppercase tracking-wide text-apple-blue">我的帳戶</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-apple-gray-950 sm:text-5xl">登入後查看你的帳戶資料</h1>
              <p className="mt-5 text-base leading-8 text-apple-gray-600">
                使用註冊信箱登入即可。所有一般帳戶使用相同入口；管理員登入後可另外進入管理後台。
              </p>
              <Link href="/?auth=login" className="apple-button-primary mt-8 inline-flex gap-2 px-6 py-3">
                登入帳戶
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex items-center justify-center bg-black p-10 text-white">
              <div className="max-w-xs text-center">
                <CircleUserRound className="mx-auto h-14 w-14 text-white/85" />
                <h2 className="mt-5 text-xl font-black">一個帳戶，一個入口</h2>
                <p className="mt-3 text-sm leading-7 text-white/70">不再區分學生或教練登入入口，日常瀏覽與報名功能保持一致。</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-24">
      <div className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-black/10 pb-10"
        >
          <p className="text-sm font-bold uppercase tracking-wide text-apple-blue">我的帳戶</p>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black text-2xl font-black text-white">
              {user.name?.charAt(0) || <CircleUserRound className="h-9 w-9" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-3xl font-black text-apple-gray-950">{user.name || '好運會員'}</h1>
              <p className="mt-2 truncate text-apple-gray-600">{user.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-sm font-bold text-apple-gray-700 ring-1 ring-black/10">
                帳戶已登入
              </span>
            </div>
            {user.role === 'admin' ? (
              <Link href="/admin" className="apple-button-primary gap-2 px-5 py-3">
                <ShieldCheck className="h-4 w-4" />
                進入管理後台
              </Link>
            ) : null}
          </div>
        </motion.section>

        <section className="py-10">
          <h2 className="text-2xl font-black text-apple-gray-950">常用入口</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {accountLinks.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <item.icon className="h-6 w-6 text-apple-blue" />
                <h3 className="mt-5 text-lg font-black text-apple-gray-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-apple-gray-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-between gap-5 border-t border-black/10 py-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-black text-apple-gray-950">需要協助？</h2>
            <p className="mt-1 text-sm text-apple-gray-600">課程、團練與商品問題請透過官方 Instagram 聯絡。</p>
          </div>
          <a
            href="https://www.instagram.com/nurture.running.team/"
            target="_blank"
            rel="noreferrer"
            className="apple-button-secondary gap-2 px-5 py-3"
          >
            <Instagram className="h-4 w-4" />
            聯絡好運
          </a>
        </section>
      </div>
    </main>
  )
}
