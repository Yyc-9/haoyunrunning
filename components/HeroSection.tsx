'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronRight, GraduationCap, Instagram, Pause, Play, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/app/language-context'

const images = [
  '/20250605[好運]三周年慶-7089.jpg',
  '/20250605[好運]三周年慶-7096.jpg',
  '/LINE_ALBUM_四週年手機桌布_260515_1.jpg',
]

export default function HeroSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const { t } = useLanguage()
  const entryCards = [
    {
      href: 'https://www.instagram.com/nurture.running.team/',
      external: true,
      icon: Instagram,
      ...t.hero.entries[0],
    },
    {
      href: '/student',
      external: false,
      icon: GraduationCap,
      ...t.hero.entries[1],
    },
    {
      href: '/coach',
      external: false,
      icon: ShieldCheck,
      ...t.hero.entries[2],
    },
  ]

  useEffect(() => {
    if (!isAutoPlay) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlay])

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
  }

  const goToNext = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const goToPrev = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    )
  }

  const renderEntryContent = (item: (typeof entryCards)[number]) => {
    const Icon = item.icon

    return (
      <>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white">
          <Icon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-lg font-black text-apple-gray-950">{item.title}</span>
          <span className="mt-2 block text-sm leading-6 text-apple-gray-600">{item.description}</span>
        </span>
      </>
    )
  }

  return (
    <>
    <section className="relative h-screen min-h-[640px] overflow-hidden bg-black">
      <div className="absolute inset-0">
        {images.map((image, index) => (
          <motion.div
            key={image}
            initial={{ opacity: 0 }}
            animate={{
              opacity: index === currentImageIndex ? 1 : 0,
              scale: 1,
            }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${image}")` }}
          />
        ))}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-between px-4 sm:px-8">
        <motion.button
          type="button"
          aria-label={t.hero.previous}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToPrev}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-white/30"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <motion.button
          type="button"
          aria-label={t.hero.next}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToNext}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-white/30"
        >
          <ChevronRight className="h-5 w-5" />
        </motion.button>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-5">
        <div className="flex items-center gap-3 rounded-full bg-black/25 px-4 py-3 backdrop-blur-md">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`${t.hero.carousel} ${index + 1}`}
              onClick={() => setCurrentImageIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/55'
              }`}
            />
          ))}
          <button
            type="button"
            aria-label={isAutoPlay ? t.hero.autoplayOn : t.hero.autoplayOff}
            onClick={() => setIsAutoPlay((value) => !value)}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-200 hover:bg-white/25"
          >
            {isAutoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </div>

        <motion.button
          type="button"
          aria-label={t.hero.learnCourses}
          onClick={scrollToContent}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="text-white/85"
        >
          <ChevronDown className="h-8 w-8 animate-bounce" />
        </motion.button>
      </div>
    </section>

    <section className="border-b border-black/10 bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-apple-blue">{t.hero.entryLabel}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {entryCards.map((item) => {
            const className =
              'group flex min-h-[132px] items-start gap-4 rounded-2xl border border-black/10 bg-white p-5 text-left text-black shadow-sm transition duration-300 hover:-translate-y-1 hover:border-black/20 hover:shadow-xl'
            const content = renderEntryContent(item)

            if ('external' in item && item.external) {
              return (
                <a key={item.title} href={item.href} target="_blank" rel="noreferrer" className={className}>
                  {content}
                </a>
              )
            }

            return (
              <Link key={item.title} href={item.href} className={className}>
                {content}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
    </>
  )
}
