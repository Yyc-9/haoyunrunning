'use client'

import { HeartHandshake, MapPin, Route, Sparkles, Target, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'
import ImageStoryCard from '@/components/ImageStoryCard'

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
                <span className="block">{about.titleHighlight}</span>
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
                <ImageStoryCard
                  key={item.title}
                  image={pageMedia.aboutBeliefImages[index]}
                  imageAlt={`好運跑班品牌理念：${item.title}`}
                  title={item.title}
                  description={item.description}
                  icon={Icon}
                  objectPosition={['center 50%', 'center 48%', 'center 38%'][index]}
                />
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
                <ImageStoryCard
                  key={item.title}
                  image={pageMedia.aboutFactImages[index]}
                  imageAlt={`好運跑班服務重點：${item.title}`}
                  title={item.title}
                  description={item.description}
                  icon={Icon}
                  compact
                  objectPosition={['center 48%', 'center 48%', 'center 42%'][index]}
                />
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
