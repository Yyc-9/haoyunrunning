'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, BookOpenCheck, Instagram, Target, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

const storyIcons = [BookOpenCheck, UsersRound, Target]

export default function TestimonialsPage() {
  const { brand, pageMedia, testimonials } = useSiteContent()
  return (
    <main className="bg-white pt-24">
      <section className="relative min-h-[34rem] overflow-hidden bg-black sm:min-h-[40rem]">
        <Image
          src={pageMedia.testimonialsHero}
          alt="好運跑班學員與教練團體合照"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="container relative mx-auto flex min-h-[34rem] items-end px-4 pb-14 text-white sm:min-h-[40rem] sm:px-6 sm:pb-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-wide text-white/80">{testimonials.eyebrow}</p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{testimonials.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/88 sm:text-lg">
              {testimonials.description}
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-apple-blue">{testimonials.pathLabel}</p>
            <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">{testimonials.pathTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-apple-gray-600">
              {testimonials.pathDescription}
            </p>
          </div>

          <div className="grid gap-10 md:grid-cols-3">
            {testimonials.themes.map((item, index) => {
              const Icon = storyIcons[index] ?? BookOpenCheck
              return (
              <div key={item.title} className="border-t border-black/15 pt-6">
                <Icon className="h-7 w-7 text-apple-blue" />
                <h3 className="mt-5 text-xl font-black text-apple-gray-950">{item.title}</h3>
                <p className="mt-3 leading-7 text-apple-gray-600">{item.description}</p>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-apple-gray-100 py-16 sm:py-20">
        <div className="container mx-auto grid gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-apple-blue">{testimonials.ctaLabel}</p>
            <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">{testimonials.ctaTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-apple-gray-600">
              {testimonials.ctaDescription}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a
              href={brand.instagramUrl}
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
