'use client'

import Image from 'next/image'
import { HeartHandshake, MapPin, Route, Sparkles, Target, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

const philosophyItems = [
  {
    title: '專注速度能力與跑步經濟性',
    english: 'Precision Training. Smarter, Faster, Stronger.',
    description: '不是追求更多公里，而是透過科學化訓練，提升速度能力與跑步經濟性，讓每一步都更有效率。',
  },
  {
    title: '建立穩固的訓練基礎',
    english: 'Build the Base. Prepare for Your Best.',
    description: '真正的進步，來自一季又一季穩定累積。用清楚的訓練節奏，讓每一次努力都能銜接賽事目標。',
  },
  {
    title: '每位跑者都值得被看見',
    english: 'Every Runner Matters.',
    description: '依班級人數配置專屬教練，確保每位學員都能獲得足夠的指導與回饋。',
  },
]

const factIcons = [MapPin, Route, UsersRound]

export default function AboutPage() {
  const { about, pageMedia } = useSiteContent()

  return (
    <main className="min-h-screen bg-white pt-20 sm:pt-24">
      <section className="relative isolate flex min-h-[680px] overflow-hidden text-white sm:min-h-[700px]">
        <Image
          src="/site-visuals/hero-2026/about-track.webp"
          alt="陽光下的田徑跑道"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />

        <div className="container relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-between px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.42em] text-white/85 sm:text-sm">OUR PHILOSOPHY</p>
            <h1 className="mt-4 text-4xl font-black tracking-[0.16em] sm:text-6xl">好運跑班</h1>
            <p className="mt-7 text-2xl font-black leading-tight sm:text-4xl lg:text-5xl">
              A great place builds great runners.
            </p>
            <p className="mt-6 text-xl font-black tracking-[0.12em] sm:text-3xl">
              好的環境，創造出好的運動員。
            </p>
          </div>

          <div className="mt-16 grid gap-7 border-t border-white/35 pt-7 lg:grid-cols-3 lg:gap-0 lg:border-t-0 lg:pt-0">
            {philosophyItems.map((item, index) => (
              <article
                key={item.title}
                className={`min-w-0 ${index > 0 ? 'lg:border-l lg:border-white/55 lg:pl-10' : ''} ${index < philosophyItems.length - 1 ? 'lg:pr-10' : ''}`}
              >
                <h2 className="text-lg font-black tracking-[0.08em] sm:text-xl">{item.title}</h2>
                <p className="mt-2 text-sm font-bold text-white/90">{item.english}</p>
                <p className="mt-2 text-sm leading-6 text-white/75">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black/5 bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {about.facts.map((item, index) => {
            const Icon = factIcons[index] ?? MapPin
            return (
              <article key={item.title} className="rounded-3xl border border-black/10 bg-white p-6 sm:p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 text-apple-blue">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-7 text-xl font-black text-apple-gray-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-apple-gray-600">{item.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="bg-apple-gray-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="container mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-apple-blue">{about.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-apple-gray-950 sm:text-5xl">
              {about.title}
              <span className="block">{about.titleHighlight}</span>
            </h2>
            <p className="mt-6 text-base leading-8 text-apple-gray-600 sm:text-lg sm:leading-9">{about.description}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {about.beliefs.map((item, index) => {
                const Icon = [Sparkles, HeartHandshake, Target][index] ?? Sparkles
                return (
                  <div key={item.title} className="border-l-2 border-black/15 pl-4">
                    <Icon className="h-5 w-5 text-apple-blue" />
                    <p className="mt-3 text-sm font-black text-apple-gray-950">{item.title}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-3xl border border-black/10 bg-apple-gray-100 sm:min-h-[460px]">
            <Image
              src={pageMedia.aboutHero}
              alt="好運跑班跑者與團隊"
              fill
              sizes="(min-width: 1024px) 56vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </main>
  )
}
