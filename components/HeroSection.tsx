'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useSiteContent } from '@/app/site-content-provider'

type HeroSectionProps = {
  initialImages: string[]
}

const ENTRANCE_EASE = [0.16, 1, 0.3, 1] as const
const HERO_MOBILE_IMAGE = '/site-visuals/home-hero-mobile-v2.jpg'

export default function HeroSection({ initialImages }: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion()
  const { heroSlides: syncedImages, hasSyncedContent } = useSiteContent()
  const managedImages = hasSyncedContent ? syncedImages : initialImages

  // Keep server and client initial styles identical. Reduced-motion preferences
  // are only available in the browser, so branching `initial` on that value
  // causes a hydration mismatch for people who disable motion system-wide.
  const entrance = { opacity: 0, y: 22 }
  const entranceTransition = (duration: number, delay: number) =>
    prefersReducedMotion
      ? { duration: 0 }
      : { duration, delay, ease: ENTRANCE_EASE }

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <p className="home-hero-kinetic home-hero-kinetic-run" aria-hidden="true">
        RUN
      </p>
      <p className="home-hero-kinetic home-hero-kinetic-together" aria-hidden="true">
        TOGETHER
      </p>

      <figure className="home-hero-mobile-media" aria-hidden="true">
        <Image
          src={HERO_MOBILE_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="home-hero-mobile-image"
        />
      </figure>

      {managedImages.slice(0, 3).map((src, index) => <motion.figure
        key={src}
        initial={entrance}
        animate={{ opacity: 1, y: 0 }}
        transition={entranceTransition(0.65, 0.16 + index * 0.08)}
        className={`home-hero-photo home-hero-photo-${['one', 'two', 'three'][index]}`}
      >
        <Image
          src={src}
          alt={`好運跑班訓練紀錄 ${index + 1}`}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 255px, 46vw"
          className="object-cover"
        />
      </motion.figure>)}

      <motion.div
        initial={entrance}
        animate={{ opacity: 1, y: 0 }}
        transition={entranceTransition(0.72, 0.08)}
        className="home-hero-copy"
      >
        <p className="home-hero-kicker">陪伴全球跑者的系統化訓練團隊</p>
        <h1 id="home-hero-title">
          <span>認識跑步，</span>
          <span>跑向更穩定的自己。</span>
        </h1>
        <Link href="/courses" className="home-hero-course-link">
          查看本期課程
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, rotate: -2, y: 18 }}
        animate={{ opacity: 1, rotate: 2, y: 0 }}
        transition={entranceTransition(0.62, 0.4)}
        className="home-hero-story-stamp"
        aria-label="好運跑班精神"
      >
        <small>NURTURE EVERY RUN</small>
        <strong>
          一起帶領
          <br />
          每一次訓練
        </strong>
      </motion.aside>
    </section>
  )
}
