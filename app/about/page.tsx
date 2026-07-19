'use client'

import { HeartHandshake, MapPin, Route, Sparkles, Target, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

const beliefIcons = [Sparkles, HeartHandshake, Target]
const factIcons = [MapPin, Route, UsersRound]

export default function AboutPage() {
  const { about, pageMedia } = useSiteContent()
  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                {about.eyebrow}
              </p>
              <h1 className="mb-6 text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
                {about.title}
                <span className="block">{about.titleHighlight.replaceAll('喜欢', '喜歡')}</span>
              </h1>
              <p className="text-lg leading-8 text-apple-gray-600 md:text-xl md:leading-9">
                {about.description}
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-apple-gray-200 bg-apple-gray-100">
              <div
                className="min-h-[320px] bg-cover bg-center sm:min-h-[420px] lg:min-h-[520px]"
                style={{ backgroundImage: `url("${pageMedia.aboutHero}")` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-apple-gray-100 px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              {about.beliefsLabel}
            </p>
            <h2 className="text-3xl font-bold text-apple-gray-900 md:text-4xl">
              {about.beliefsTitle}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {about.beliefs.map((item, index) => {
              const Icon = beliefIcons[index] ?? Sparkles
              return (
              <article key={item.title} className="rounded-3xl border border-apple-gray-200 bg-white p-8">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue to-apple-orange">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-apple-gray-900">{item.title}</h3>
                <p className="leading-7 text-apple-gray-600">{item.description}</p>
              </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="container mx-auto">
          <div className="grid gap-5 md:grid-cols-3">
            {about.facts.map((item, index) => {
              const Icon = factIcons[index] ?? MapPin
              return (
                <article key={item.title} className="rounded-3xl border border-apple-gray-200 bg-apple-gray-50 p-6 sm:p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-apple-blue shadow-sm ring-1 ring-black/5">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-xl font-black text-apple-gray-900">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-apple-gray-600">{item.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
