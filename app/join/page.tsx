'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Instagram, MapPin, ShoppingBag } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

export default function JoinPage() {
  const { brand, courses } = useSiteContent()
  const sortedCourses = courses

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-24">
      <section className="border-b border-black/10 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-full border border-black/10 bg-white">
              <Image src={brand.logoUrl} alt={`${brand.brandName} Logo`} fill sizes="56px" className="object-cover" priority />
            </div>
            <div>
              <p className="text-sm font-bold text-apple-blue">{brand.brandName}</p>
              <h1 className="mt-1 text-3xl font-black text-apple-gray-950 sm:text-4xl">本期課程報名</h1>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-base leading-7 text-apple-gray-600">選擇適合的城市與時段，直接進入該班官方報名表。課程日期、費用與名額以報名表最新內容為準。</p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-3">
          {sortedCourses.map((course) => (
            <article key={course.slug} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-apple-gray-500">
                    <span className="rounded-full bg-apple-blue/10 px-3 py-1 text-apple-blue">{course.weekday}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{course.location}</span>
                    <span>{course.period}</span>
                  </div>
                  <h2 className="mt-3 text-base font-black leading-6 text-apple-gray-950 sm:text-lg">{course.name}</h2>
                </div>
                <Link
                  href={`/courses/${course.slug}/register`}
                  className="apple-button-primary w-full shrink-0 gap-2 px-5 py-2.5 text-sm sm:w-auto"
                >
                  立即報名
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <Link href={`/courses/${course.slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-apple-gray-600 transition hover:text-apple-blue">
                查看課程詳情
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}

          {sortedCourses.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-8 text-center text-apple-gray-600">目前沒有開放報名的課程。</div>
          ) : null}

          <div className="grid gap-3 pt-5 sm:grid-cols-2">
            <Link href="/shop" className="apple-button-outline gap-2">
              <ShoppingBag className="h-4 w-4" />
              好運商店
            </Link>
            <a href={brand.instagramUrl} target="_blank" rel="noreferrer" className="apple-button-outline gap-2">
              <Instagram className="h-4 w-4" />
              Instagram
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
