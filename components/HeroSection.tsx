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

const TRAIL_POOL_SIZE = 3
const TRAIL_DISTANCE = 72
const ENTRANCE_EASE = [0.16, 1, 0.3, 1] as const

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
    if (!hero) return

    const emitTrail = (x: number, y: number, force = false) => {
      const lastPoint = lastPointRef.current
      if (!force && Math.hypot(x - lastPoint.x, y - lastPoint.y) < TRAIL_DISTANCE) return

      const poolIndex = poolIndexRef.current
      const item = trailItemsRef.current[poolIndex % TRAIL_POOL_SIZE]
      if (!item || trailImages.length === 0) return

      const image = trailImages[imageIndexRef.current % trailImages.length]
      const itemWidth = item.getBoundingClientRect().width || 104
      const safeX = Math.max(itemWidth / 2 + 10, Math.min(hero.clientWidth - itemWidth / 2 - 10, x))
      item.style.left = String(safeX) + 'px'
      item.style.top = String(y) + 'px'
      item.style.backgroundImage = 'url(\"' + image + '\")'
      item.style.setProperty('--trail-rotate', String((poolIndex % 2 ? 1 : -1) * (5 + (poolIndex % 7))) + 'deg')
      item.style.setProperty('--trail-drift-x', String(((poolIndex % 3) - 1) * 22) + 'px')
      item.style.setProperty('--trail-drift-y', String(-20 - (poolIndex % 4) * 9) + 'px')
      item.classList.remove('home-hero-trail-visible')
      void item.offsetWidth
      item.classList.add('home-hero-trail-visible')

      poolIndexRef.current += 1
      imageIndexRef.current += 1
      lastPointRef.current = { x, y }
    }

    const resetHeroMotion = () => {
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

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
      if (prefersReducedMotion) return
      const rect = hero.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const xPercent = (x / rect.width) * 100
      const yPercent = (y / rect.height) * 100
      const dx = xPercent - 50
      const dy = yPercent - 50

      hero.style.setProperty('--hero-x', String(xPercent.toFixed(2)) + '%')
      hero.style.setProperty('--hero-y', String(yPercent.toFixed(2)) + '%')
      hero.style.setProperty('--hero-one-x', String(dx * 0.12) + 'px')
      hero.style.setProperty('--hero-one-y', String(dy * 0.08) + 'px')
      hero.style.setProperty('--hero-two-x', String(dx * -0.08) + 'px')
      hero.style.setProperty('--hero-two-y', String(dy * 0.06) + 'px')
      hero.style.setProperty('--hero-three-x', String(dx * 0.06) + 'px')
      hero.style.setProperty('--hero-three-y', String(dy * -0.07) + 'px')

      if (y > 110) emitTrail(x, y)
    }

    let touchStart: { x: number; y: number } | null = null
    let lastTouchX = 0
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!touch) return
      const rect = hero.getBoundingClientRect()
      touchStart = { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
      lastTouchX = touchStart.x
      lastPointRef.current = touchStart
    }
    const handleTouchMove = (event: TouchEvent) => {
      if (!touchStart || prefersReducedMotion) return
      const touch = event.changedTouches[0]
      if (!touch) return
      const rect = hero.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      if (Math.abs(x - touchStart.x) <= Math.abs(y - touchStart.y) + 8) return
      if (Math.abs(x - lastTouchX) >= TRAIL_DISTANCE) {
        const direction = x > lastTouchX ? 1 : -1
        emitTrail(x, Math.max(140, Math.min(rect.height - 300, y)))
        lastTouchX += direction * TRAIL_DISTANCE
      }
    }
    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStart) return
      const touch = event.changedTouches[0]
      if (!touch) return
      const rect = hero.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const dx = x - touchStart.x
      const dy = y - touchStart.y
      if (Math.hypot(dx, dy) < 16) {
        emitTrail(x, Math.max(140, Math.min(rect.height - 300, y)), true)
      }
      touchStart = null
      lastTouchX = 0
    }

    hero.addEventListener('pointermove', handlePointerMove)
    hero.addEventListener('pointerleave', resetHeroMotion)
    hero.addEventListener('touchstart', handleTouchStart, { passive: true })
    hero.addEventListener('touchmove', handleTouchMove, { passive: true })
    hero.addEventListener('touchend', handleTouchEnd, { passive: true })
    hero.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      hero.removeEventListener('pointermove', handlePointerMove)
      hero.removeEventListener('pointerleave', resetHeroMotion)
      hero.removeEventListener('touchstart', handleTouchStart)
      hero.removeEventListener('touchmove', handleTouchMove)
      hero.removeEventListener('touchend', handleTouchEnd)
      hero.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [prefersReducedMotion, trailImages])

  // Keep server and client initial styles identical. Reduced-motion preferences
  // are only available in the browser, so branching `initial` on that value
  // causes a hydration mismatch for people who disable motion system-wide.
  const entrance = { opacity: 0, y: 22 }
  const entranceTransition = (duration: number, delay: number) =>
    prefersReducedMotion
      ? { duration: 0 }
      : { duration, delay, ease: ENTRANCE_EASE }

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
        transition={entranceTransition(0.65, 0.16)}
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
        transition={entranceTransition(0.65, 0.24)}
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
        transition={entranceTransition(0.65, 0.32)}
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
        transition={entranceTransition(0.72, 0.08)}
        className="home-hero-copy"
      >
        <p className="home-hero-kicker">陪伴全球跑者的系統化訓練團隊</p>
        <h1 id="home-hero-title">
          <span>認識跑步，</span>
          <span>跑向更穩定的自己</span>
        </h1>
        <p className="home-hero-pointer-instruction">
          <span aria-hidden="true" />
          輕觸或橫向滑動，留下你的好運跑跡
        </p>
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
