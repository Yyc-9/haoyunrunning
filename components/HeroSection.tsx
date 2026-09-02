'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useSiteContent } from '@/app/site-content-provider'

type HeroSectionProps = {
  initialImages: string[]
}

const storyImages = [
  {
    src: '/site-visuals/about-belief-coaching.webp',
    alt: '教練帶領好運跑班跑者訓練',
  },
  {
    src: '/site-visuals/about-belief-foundation.webp',
    alt: '好運跑班夥伴在跑道上一起前進',
  },
  {
    src: '/site-visuals/about-fact-community.webp',
    alt: '好運跑班跑者一起出發',
  },
]

const TRAIL_POOL_SIZE = 8
const TRAIL_DISTANCE = 92

export default function HeroSection({ initialImages }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null)
  const trailItemsRef = useRef<Array<HTMLSpanElement | null>>([])
  const poolIndexRef = useRef(0)
  const imageIndexRef = useRef(0)
  const lastPointRef = useRef({ x: -999, y: -999 })
  const prefersReducedMotion = useReducedMotion()
  const { heroSlides: syncedImages, hasSyncedContent } = useSiteContent()
  const managedImages = hasSyncedContent ? syncedImages : initialImages

  const trailImages = useMemo(
    () =>
      Array.from(
        new Set([
          ...managedImages,
          ...storyImages.map((image) => image.src),
          '/site-visuals/about-belief-speed.webp',
          '/site-visuals/testimonial-together.webp',
        ]),
      ).filter(Boolean),
    [managedImages],
  )

  useEffect(() => {
    trailImages.forEach((src) => {
      const preload = new window.Image()
      preload.src = src
    })
  }, [trailImages])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || prefersReducedMotion || !window.matchMedia('(pointer: fine)').matches) return

    const emitTrail = (x: number, y: number) => {
      const lastPoint = lastPointRef.current
      if (Math.hypot(x - lastPoint.x, y - lastPoint.y) < TRAIL_DISTANCE) return

      const poolIndex = poolIndexRef.current
      const item = trailItemsRef.current[poolIndex % TRAIL_POOL_SIZE]
      if (!item || trailImages.length === 0) return

      const image = trailImages[imageIndexRef.current % trailImages.length]
      item.style.left = `${x}px`
      item.style.top = `${y}px`
      item.style.backgroundImage = `url("${image}")`
      item.style.setProperty('--trail-rotate', `${(poolIndex % 2 ? 1 : -1) * (5 + (poolIndex % 7))}deg`)
      item.style.setProperty('--trail-drift-x', `${((poolIndex % 3) - 1) * 22}px`)
      item.style.setProperty('--trail-drift-y', `${-20 - (poolIndex % 4) * 9}px`)
      item.classList.remove('home-hero-trail-visible')
      void item.offsetWidth
      item.classList.add('home-hero-trail-visible')

      poolIndexRef.current += 1
      imageIndexRef.current += 1
      lastPointRef.current = { x, y }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const xPercent = (x / rect.width) * 100
      const yPercent = (y / rect.height) * 100
      const dx = xPercent - 50
      const dy = yPercent - 50

      hero.style.setProperty('--hero-x', `${xPercent.toFixed(2)}%`)
      hero.style.setProperty('--hero-y', `${yPercent.toFixed(2)}%`)
      hero.style.setProperty('--hero-one-x', `${dx * 0.12}px`)
      hero.style.setProperty('--hero-one-y', `${dy * 0.08}px`)
      hero.style.setProperty('--hero-two-x', `${dx * -0.08}px`)
      hero.style.setProperty('--hero-two-y', `${dy * 0.06}px`)
      hero.style.setProperty('--hero-three-x', `${dx * 0.06}px`)
      hero.style.setProperty('--hero-three-y', `${dy * -0.07}px`)

      if (y > 110) emitTrail(x, y)
    }

    const handlePointerLeave = () => {
      hero.style.setProperty('--hero-x', '76%')
      hero.style.setProperty('--hero-y', '42%')
      hero.style.setProperty('--hero-one-x', '0px')
      hero.style.setProperty('--hero-one-y', '0px')
      hero.style.setProperty('--hero-two-x', '0px')
      hero.style.setProperty('--hero-two-y', '0px')
      hero.style.setProperty('--hero-three-x', '0px')
      hero.style.setProperty('--hero-three-y', '0px')
      lastPointRef.current = { x: -999, y: -999 }
    }

    hero.addEventListener('pointermove', handlePointerMove)
    hero.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      hero.removeEventListener('pointermove', handlePointerMove)
      hero.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [prefersReducedMotion, trailImages])

  const entrance = prefersReducedMotion ? false : { opacity: 0, y: 22 }

  return (
    <section ref={heroRef} className="home-hero" aria-labelledby="home-hero-title">
      <svg
        className="home-hero-track"
        viewBox="0 0 1600 820"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="home-hero-track-ghost" d="M-90 185 C 250 55, 385 430, 716 302 S 1115 110, 1690 454" />
        <path className="home-hero-track-edge" d="M-90 137 C 250 7, 385 382, 716 254 S 1115 62, 1690 406" />
        <path className="home-hero-track-edge" d="M-90 233 C 250 103, 385 478, 716 350 S 1115 158, 1690 502" />
        <path className="home-hero-track-accent" d="M-90 185 C 250 55, 385 430, 716 302 S 1115 110, 1690 454" />
      </svg>

      <p className="home-hero-kinetic home-hero-kinetic-run" aria-hidden="true">
        RUN
      </p>
      <p className="home-hero-kinetic home-hero-kinetic-together" aria-hidden="true">
        TOGETHER
      </p>

      <motion.figure
        initial={entrance}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="home-hero-photo home-hero-photo-one"
      >
        <Image
          src={storyImages[0].src}
          alt={storyImages[0].alt}
          fill
          priority
          sizes="(min-width: 1024px) 255px, 46vw"
          className="object-cover"
        />
      </motion.figure>

      <motion.figure
        initial={entrance}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="home-hero-photo home-hero-photo-two"
      >
        <Image
          src={storyImages[1].src}
          alt={storyImages[1].alt}
          fill
          sizes="(min-width: 1024px) 230px, 38vw"
          className="object-cover"
        />
      </motion.figure>

      <motion.figure
        initial={entrance}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="home-hero-photo home-hero-photo-three"
      >
        <Image
          src={storyImages[2].src}
          alt={storyImages[2].alt}
          fill
          sizes="285px"
          className="object-cover"
        />
      </motion.figure>

      <div className="home-hero-trail-layer" aria-hidden="true">
        {Array.from({ length: TRAIL_POOL_SIZE }, (_, index) => (
          <span
            key={index}
            ref={(element) => {
              trailItemsRef.current[index] = element
            }}
            className="home-hero-trail-item"
          />
        ))}
      </div>

      <motion.div
        initial={entrance}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.72, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="home-hero-copy"
      >
        <p className="home-hero-kicker">陪伴全球跑者的系統化訓練團隊</p>
        <h1 id="home-hero-title">
          <span>認識跑步，</span>
          <span>跑向更穩定的自己</span>
        </h1>
        <p className="home-hero-pointer-instruction">
          <span aria-hidden="true" />
          移動滑鼠，讓好運的訓練片段沿著你的跑跡出現
        </p>
      </motion.div>

      <motion.aside
        initial={prefersReducedMotion ? false : { opacity: 0, rotate: -2, y: 18 }}
        animate={{ opacity: 1, rotate: 2, y: 0 }}
        transition={{ duration: 0.62, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="home-hero-story-stamp"
        aria-label="好運跑班精神"
      >
        <small>NURTURE EVERY RUN</small>
        <strong>
          一起帶領
          <br />
          每一次訓練
        </strong>
        <span>不自動播放，由你的移動觸發。</span>
      </motion.aside>
    </section>
  )
}
