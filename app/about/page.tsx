'use client'

import Link from 'next/link'
import { ArrowRight, HeartHandshake, MapPin, Route, Sparkles, Target, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

const beliefIcons = [Sparkles, HeartHandshake, Target]
const factIcons = [MapPin, Route, UsersRound]

export default function AboutPage() {
  const { about, brand, pageMedia } = useSiteContent()
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
                <span className="block">{about.titleHighlight}</span>
              </h1>
              <p className="text-lg leading-8 text-apple-gray-600 md:text-xl md:leading-9">
                {about.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/courses" className="apple-button-primary text-center">
                  查看近期課程
                </Link>
                <a
                  href={brand.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="apple-button-outline text-center"
                >
                  聯絡好運
                </a>
              </div>
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

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                {about.audienceLabel}
              </p>
              <h2 className="mb-6 text-3xl font-bold text-apple-gray-900 md:text-4xl">
                {about.audienceTitle}
              </h2>
              <p className="text-base leading-8 text-apple-gray-600 md:text-lg">
                {about.audienceDescription}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {about.audienceTags.map((runner) => (
                  <span
                    key={runner}
                    className="rounded-full border border-apple-gray-200 bg-white px-4 py-2 text-sm font-semibold text-apple-gray-800 shadow-sm"
                  >
                    {runner}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-apple-gray-200 bg-apple-gray-50 p-5 sm:p-8">
              <div className="space-y-6">
                {about.facts.map((item, index) => {
                  const Icon = factIcons[index] ?? MapPin
                  return (
                  <div key={item.title} className="flex gap-4 rounded-2xl bg-white p-4 sm:p-5">
                    <Icon className="mt-1 h-6 w-6 flex-shrink-0 text-apple-blue" />
                    <div>
                      <h3 className="mb-2 font-bold text-apple-gray-900">{item.title}</h3>
                      <p className="text-sm leading-6 text-apple-gray-600">{item.description}</p>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="rounded-3xl border border-apple-gray-200 bg-gradient-to-r from-apple-blue/5 via-white to-apple-orange/5 p-8 text-center md:p-12">
            <h2 className="mb-4 text-3xl font-bold text-apple-gray-900">
              {about.ctaTitle}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-apple-gray-600">
              {about.ctaDescription}
            </p>
            <Link href="/courses" className="apple-button-secondary inline-flex items-center">
              前往課程列表
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
