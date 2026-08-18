'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'

type HeroSectionProps = {
  initialImages: string[]
}

export default function HeroSection({ initialImages }: HeroSectionProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const { t } = useLanguage()
  const { heroSlides: syncedImages, hasSyncedContent } = useSiteContent()
  const images = hasSyncedContent ? syncedImages : initialImages

  useEffect(() => {
    if (!isAutoPlay) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [images.length, isAutoPlay])

  useEffect(() => {
    if (currentImageIndex >= images.length) setCurrentImageIndex(0)
  }, [currentImageIndex, images.length])

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

  return (
    <section className="relative h-screen min-h-[640px] overflow-hidden bg-black">
      <h1 className="sr-only">認識跑步，跑向更穩定的自己</h1>
      <div className="absolute inset-0">
        {images.map((image, index) => (
          <motion.div
            key={image}
            initial={false}
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

      <div className="absolute bottom-6 right-4 z-10 sm:bottom-8 sm:right-8">
        <div className="flex items-center gap-3 rounded-full bg-black/20 px-4 py-3 backdrop-blur-md">
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
        className="absolute bottom-6 left-4 z-10 text-white/85 sm:bottom-8 sm:left-8"
      >
        <ChevronDown className="h-8 w-8 animate-bounce" />
      </motion.button>
    </section>
  )
}
