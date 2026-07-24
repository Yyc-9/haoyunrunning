'use client'

import Image from 'next/image'
import { PlayCircle } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'
import { getYouTubeEmbedUrl } from '@/lib/youtube'

export default function TestimonialsPage() {
  const { pageMedia, testimonials } = useSiteContent()
  const youtubeEmbedUrl = getYouTubeEmbedUrl(testimonials.videoUrl)
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

      {testimonials.videoEnabled && testimonials.videoUrl ? (
        <section className="border-b border-black/10 bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                <PlayCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-apple-blue">RUNNER STORIES</p>
                <h2 className="mt-1 text-2xl font-black text-apple-gray-950 sm:text-3xl">{testimonials.videoTitle}</h2>
              </div>
            </div>
            <p className="mb-5 max-w-3xl text-sm leading-7 text-apple-gray-600 sm:text-base">
              {testimonials.videoDescription}
            </p>
            <div className="overflow-hidden rounded-lg border border-black/10 bg-black shadow-sm">
              {youtubeEmbedUrl ? (
                <iframe
                  src={youtubeEmbedUrl}
                  title={testimonials.videoTitle}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="aspect-video h-auto w-full"
                />
              ) : (
                <video
                  src={testimonials.videoUrl}
                  poster={pageMedia.testimonialsHero}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video h-auto w-full object-contain"
                />
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b border-black/10 bg-white">
        <div className="relative isolate flex min-h-[500px] overflow-hidden text-white sm:min-h-[560px]">
          <Image
            src={pageMedia.testimonialPathHero}
            alt="好運跑班學員一起訓練與成長"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="container relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-12">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-wide text-amber-300">{testimonials.pathLabel}</p>
              <h2 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">{testimonials.pathTitle}</h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-xl sm:leading-9">
                {testimonials.pathDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.themes.map((item, index) => (
              <article key={item.title} className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-apple-gray-100">
                  <Image
                    src={pageMedia.testimonialThemeImages[index] ?? pageMedia.testimonialPathHero}
                    alt={item.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                    {index + 1}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black leading-7 text-apple-gray-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-apple-gray-600">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
