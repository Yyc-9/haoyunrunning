import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, BookOpenCheck, Instagram, Target, UsersRound } from 'lucide-react'

export const metadata: Metadata = {
  title: '學員見證 - 好運跑班',
  description: '從訓練現場與學員分享，認識好運跑班陪伴跑者成長的方式。',
}

const storyThemes = [
  {
    icon: BookOpenCheck,
    title: '從適合自己的起點開始',
    description: '依照跑齡、目前能力與可訓練時間選擇班級，先把穩定跑步的節奏建立起來。',
  },
  {
    icon: UsersRound,
    title: '在團練裡持續前進',
    description: '和教練、同學一起完成每次訓練，在現場獲得配速、動作與節奏上的協助。',
  },
  {
    icon: Target,
    title: '朝自己的目標靠近',
    description: '不論是第一次參賽、穩定完賽或挑戰 PB，都用適合自己的步調累積。',
  },
]

export default function TestimonialsPage() {
  return (
    <main className="bg-white pt-24">
      <section className="relative min-h-[34rem] overflow-hidden bg-black sm:min-h-[40rem]">
        <Image
          src="/20250605[好運]三周年慶-7089.jpg"
          alt="好運跑班學員與教練團體合照"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="container relative mx-auto flex min-h-[34rem] items-end px-4 pb-14 text-white sm:min-h-[40rem] sm:px-6 sm:pb-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-wide text-white/80">學員見證</p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">每一步進步，都從願意開始</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/88 sm:text-lg">
              好運跑班陪跑者從第一次規律訓練，到完成賽事與挑戰個人目標。真實學員分享與最新訓練現場，持續發布在官方 Instagram。
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-apple-blue">跑者的成長路徑</p>
            <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">訓練不只看最後的成績</h2>
            <p className="mt-4 text-lg leading-8 text-apple-gray-600">
              我們更重視跑者能不能安全、穩定地持續下去。以下是好運跑班在每一段訓練裡最在意的事情。
            </p>
          </div>

          <div className="grid gap-10 md:grid-cols-3">
            {storyThemes.map((item) => (
              <div key={item.title} className="border-t border-black/15 pt-6">
                <item.icon className="h-7 w-7 text-apple-blue" />
                <h3 className="mt-5 text-xl font-black text-apple-gray-950">{item.title}</h3>
                <p className="mt-3 leading-7 text-apple-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-apple-gray-100 py-16 sm:py-20">
        <div className="container mx-auto grid gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-apple-blue">真實內容持續更新</p>
            <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">到 Instagram 看最新學員故事與訓練現場</h2>
            <p className="mt-4 text-lg leading-8 text-apple-gray-600">
              為避免使用未經確認的姓名、成績或照片，網站不刊登虛構見證；公開內容以好運跑班官方帳號發布為準。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a
              href="https://www.instagram.com/nurture.running.team/"
              target="_blank"
              rel="noreferrer"
              className="apple-button-primary gap-2 px-6 py-3"
            >
              <Instagram className="h-5 w-5" />
              查看官方 Instagram
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link href="/courses" className="apple-button-secondary gap-2 px-6 py-3">
              查看訓練課程
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
