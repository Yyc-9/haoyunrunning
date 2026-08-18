'use client'

import Link from 'next/link'
import { ArrowLeft, CalendarClock, Instagram, PartyPopper, Sparkles } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import LeadCollectionForm from '@/components/LeadCollectionForm'
import { useSiteContent } from '@/app/site-content-provider'

export default function AnniversaryPageClient() {
  const { t } = useLanguage()
  const { brand, pageMedia, anniversary } = useSiteContent()

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700 hover:text-apple-blue">
            <ArrowLeft className="h-4 w-4" />
            {anniversary.secondaryCta}
          </Link>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
            <section className="relative overflow-hidden rounded-[2rem] bg-apple-gray-900 p-8 text-white shadow-xl md:p-12">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-35"
                style={{ backgroundImage: `url("${pageMedia.anniversaryHero}")` }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-apple-gray-900 via-apple-gray-900/80 to-apple-blue/70" />

              <div className="relative z-10 max-w-3xl">
                <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white backdrop-blur">
                  <PartyPopper className="h-4 w-4" />
                  {anniversary.label}
                </p>
                <h1 className="text-4xl font-black leading-tight md:text-6xl">
                  {anniversary.title}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
                  {anniversary.subtitle}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/courses" className="apple-button-primary inline-flex items-center justify-center gap-2 px-6 py-3">
                    <CalendarClock className="h-5 w-5" />
                    {anniversary.formCta}
                  </Link>
                  <a
                    href={brand.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/35 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    <Instagram className="h-5 w-5" />
                    {anniversary.contactCta}
                  </a>
                </div>
              </div>
            </section>

            <aside className="apple-card flex flex-col justify-between p-7">
              <div>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue to-apple-orange text-white">
                  <Sparkles className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">
                  {anniversary.noticeTitle}
                </p>
                <h2 className="mt-3 text-3xl font-black text-apple-gray-900">
                  {anniversary.status}
                </h2>
                <p className="mt-4 leading-7 text-apple-gray-600">
                  {anniversary.noticeDescription}
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {anniversary.highlights.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-apple-gray-100 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-apple-blue" />
                    <span className="text-sm font-semibold text-apple-gray-800">{item}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <section className="apple-card p-7">
              <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">
                {anniversary.formLabel}
              </p>
              <h2 className="mt-3 text-3xl font-black text-apple-gray-900">
                {anniversary.formTitle}
              </h2>
              <p className="mt-4 leading-7 text-apple-gray-600">
                {anniversary.formDescription}
              </p>
            </section>

            <LeadCollectionForm
              source="anniversary_4th"
              labels={t.leadForm}
              selectField={{
                name: 'companionCount',
                label: anniversary.companionLabel,
                options: anniversary.companionOptions,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
