'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

const images = [
  '/20250605[好運]三周年慶-7089.jpg',
  '/20250605[好運]三周年慶-7096.jpg',
  '/20241106[好運]教練拍-13.jpg',
  '/LINE_ALBUM_四週年手機桌布_260515_1.jpg',
]

export default function HeroSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)

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

  return (
    <section className="relative h-screen min-h-[640px] overflow-hidden bg-black">
      <div className="absolute inset-0">
        {images.map((image, index) => (
          <motion.div
            key={image}
            initial={{ opacity: 0 }}
            animate={{
              opacity: index === currentImageIndex ? 1 : 0,
              scale: index === currentImageIndex ? 1 : 1.04,
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
          aria-label="上一張照片"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToPrev}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-white/30"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        <motion.button
          type="button"
          aria-label="下一張照片"
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
              aria-label={`切換到第 ${index + 1} 張照片`}
              onClick={() => setCurrentImageIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/55'
              }`}
            />
          ))}
          <button
            type="button"
            aria-label={isAutoPlay ? '暫停輪播' : '播放輪播'}
            onClick={() => setIsAutoPlay((value) => !value)}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-200 hover:bg-white/25"
          >
            {isAutoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </div>

        <motion.button
          type="button"
          aria-label="往下瀏覽"
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
  )
}
