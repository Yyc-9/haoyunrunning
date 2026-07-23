'use client'

import { HeartHandshake, MapPin, Route, Sparkles, Target, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'
import ImageStoryBand from '@/components/ImageStoryBand'

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

          <div className="-mx-4 sm:mx-0">
            <ImageStoryBand
              image={pageMedia.aboutBeliefImages[0]}
              imageAlt="好運跑班訓練理念與跑者團練"
              items={about.beliefs.map((item, index) => ({
                ...item,
                icon: beliefIcons[index] ?? Sparkles,
              }))}
              objectPosition="center 48%"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="container mx-auto">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">TRAINING SUPPORT</p>
            <h2 className="mt-3 text-3xl font-bold text-apple-gray-900 md:text-4xl">
              從課程到社群，陪跑者穩定前進。
            </h2>
          </div>
          <div className="-mx-4 sm:mx-0">
            <ImageStoryBand
              image={pageMedia.aboutFactImages[0]}
              imageAlt="好運跑班多地課程與教練社群支援"
              items={about.facts.map((item, index) => ({
                ...item,
                icon: factIcons[index] ?? MapPin,
              }))}
              objectPosition="center 45%"
            />
          </div>
        </div>
      </section>
    </main>
  )
}
