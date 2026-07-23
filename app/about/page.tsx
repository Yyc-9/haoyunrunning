'use client'

import Image from 'next/image'
import { HeartHandshake, MapPin, Route, Sparkles, Target, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

const factIcons = [MapPin, Route, UsersRound]

export default function AboutPage() {
  const { about, pageMedia } = useSiteContent()

  return (
    <main className="min-h-screen bg-white pt-20 sm:pt-24">
      <section className="relative isolate flex min-h-[680px] overflow-hidden text-white sm:min-h-[700px]">
        <Image
          src={pageMedia.aboutPageHero}
          alt="陽光下的田徑跑道"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />

        <div className="container relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-between px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.42em] text-white/85 sm:text-sm">{about.heroEyebrow}</p>
            <h1 className="mt-4 text-4xl font-black tracking-[0.16em] sm:text-6xl">{about.heroBrandName}</h1>
            <p className="mt-7 text-2xl font-black leading-tight sm:text-4xl lg:text-5xl">
              {about.heroEnglishTitle}
            </p>
            <p className="mt-6 text-xl font-black tracking-[0.12em] sm:text-3xl">
              {about.heroChineseTitle}
            </p>
          </div>

          <div className="mt-16 grid gap-7 border-t border-white/35 pt-7 lg:grid-cols-3 lg:gap-0 lg:border-t-0 lg:pt-0">
            {about.philosophies.map((item, index) => (
              <article
                key={item.title}
                className={`min-w-0 ${index > 0 ? 'lg:border-l lg:border-white/55 lg:pl-10' : ''} ${index < about.philosophies.length - 1 ? 'lg:pr-10' : ''}`}
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

      <section className="relative isolate flex min-h-[660px] overflow-hidden text-white sm:min-h-[720px]">
        <Image
          src={pageMedia.aboutStoryHero}
          alt="好運跑班跑者與團隊"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="container relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-between px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-wide text-white/85">{about.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {about.title}
              <span className="block">{about.titleHighlight}</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/85 sm:text-lg sm:leading-9">
              {about.description}
            </p>
          </div>

          <div className="mt-14 grid gap-7 border-t border-white/35 pt-7 sm:grid-cols-3 sm:gap-0">
            {about.beliefs.map((item, index) => {
              const Icon = [Sparkles, HeartHandshake, Target][index] ?? Sparkles
              return (
                <div
                  key={item.title}
                  className={`${index > 0 ? 'sm:border-l sm:border-white/40 sm:pl-8' : ''} ${index < about.beliefs.length - 1 ? 'sm:pr-8' : ''}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                  <p className="mt-3 text-sm font-black leading-6 text-white">{item.title}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
