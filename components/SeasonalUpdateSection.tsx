'use client'

import Link from 'next/link'
import { ArrowUpRight, CalendarRange } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

export default function SeasonalUpdateSection() {
  const { seasonalUpdate } = useSiteContent()

  if (!seasonalUpdate.active || !seasonalUpdate.title || !seasonalUpdate.summary) return null

  const content = (
    <span className="inline-flex items-center gap-2 font-bold text-white">
      {seasonalUpdate.linkLabel}
      <ArrowUpRight className="h-4 w-4" />
    </span>
  )

  return (
    <section className="bg-black px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="container mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-white/60">
            <CalendarRange className="h-5 w-5" />
            {seasonalUpdate.period || '季度資訊'}
          </div>
          <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">{seasonalUpdate.title}</h2>
        </div>
        <div>
          <p className="text-lg font-semibold leading-8 text-white/85">{seasonalUpdate.summary}</p>
          {seasonalUpdate.body ? (
            <p className="mt-5 whitespace-pre-line leading-8 text-white/65">{seasonalUpdate.body}</p>
          ) : null}
          {seasonalUpdate.href ? (
            seasonalUpdate.href.startsWith('http') ? (
              <a href={seasonalUpdate.href} target="_blank" rel="noreferrer" className="mt-7 inline-flex">
                {content}
              </a>
            ) : (
              <Link href={seasonalUpdate.href} className="mt-7 inline-flex">
                {content}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </section>
  )
}
