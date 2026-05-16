'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Play, Calendar, ChevronLeft, ChevronRight, Pause } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/app/language-context'

export default function HeroSection() {
  const { t } = useLanguage()

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
  }

  const images = [
    { src: '/Instagram.png', ...t.hero.images[0] },
    { src: '/LINE_ALBUM_四週年手機桌布_260515_1.jpg', ...t.hero.images[1] },
  ]

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)

  useEffect(() => {
    if (!isAutoPlay) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlay, images.length])

  const goToNext = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const goToPrev = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    )
  }

  const toggleAutoPlay = () => {
    setIsAutoPlay(!isAutoPlay)
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background image with overlay */}
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-apple-gray-100 to-apple-gray-200" />

      {/* Optional: You can add a background image here */}
      {/*
      <div
        className="absolute inset-0 bg-gray-900"
        style={{
          backgroundImage: 'url("/Instagram.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>
      */}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -top-1/2 -right-1/2 h-full w-full rounded-full bg-gradient-to-br from-apple-blue/10 to-transparent"
        />
        <motion.div
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -bottom-1/2 -left-1/2 h-full w-full rounded-full bg-gradient-to-tr from-apple-orange/10 to-transparent"
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5ea_1px,transparent_1px),linear-gradient(to_bottom,#e5e5ea_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-6xl sm:text-7xl lg:text-8xl font-black mt-16 mb-4 tracking-tighter"
          >
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-black via-gray-900 to-gray-800 drop-shadow-lg">
              {t.common.brand}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-apple-gray-900 mb-6 max-w-2xl mx-auto bg-gradient-to-r from-apple-gray-800 to-apple-gray-600 bg-clip-text text-transparent drop-shadow-sm"
          >
            {t.common.tagline}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg text-apple-gray-500 mb-8 max-w-3xl mx-auto"
          >
            {t.hero.description}
          </motion.p>

          {/* Image Showcase Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mb-12 w-full max-w-4xl mx-auto px-4"
          >
            <div className="apple-card overflow-hidden w-full">
              <div className="relative aspect-video bg-gray-900">
                {/* Image Slider */}
                <div className="absolute inset-0 overflow-hidden">
                  {images.map((image, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: index === currentImageIndex ? 1 : 0,
                        scale: index === currentImageIndex ? 1 : 1.05
                      }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url("${image.src}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  ))}
                </div>

                {/* Gradient overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Navigation Buttons */}
                <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-between px-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToPrev}
                    className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToNext}
                    className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                  >
                    <ChevronRight className="h-5 w-5 text-white" />
                  </motion.button>
                </div>

                {/* Image label */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/90">
                        {images[currentImageIndex].desc}
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {images[currentImageIndex].title}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleAutoPlay}
                        className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                      >
                        {isAutoPlay ? (
                          <Pause className="h-3 w-3 text-white" />
                        ) : (
                          <Play className="h-3 w-3 text-white" />
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Calendar className="h-3 w-3 text-white" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Image Dots Indicator */}
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentImageIndex
                          ? 'w-8 bg-white'
                          : 'w-2 bg-white/50 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-apple-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-apple-gray-500">
                      {t.hero.carousel} {currentImageIndex + 1}/{images.length}
                    </div>
                    <div className="text-base text-apple-gray-800">
                      {isAutoPlay ? t.hero.autoplayOn : t.hero.autoplayOff}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={goToPrev}
                      className="text-sm text-apple-blue hover:text-apple-blue/80 font-medium"
                    >
                      {t.hero.previous}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={goToNext}
                      className="text-sm text-apple-blue hover:text-apple-blue/80 font-medium"
                    >
                      {t.hero.next}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link href="/register">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="apple-button-primary text-lg px-10 py-4 cursor-pointer inline-block"
              >
                {t.common.joinNow}
              </motion.div>
            </Link>
            <a
              href="#courses"
              onClick={(e) => {
                e.preventDefault()
                const element = document.querySelector('#courses')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="apple-button-secondary text-lg px-10 py-4 cursor-pointer inline-block"
              >
                <Play className="h-5 w-5 inline-block mr-2" />
                {t.hero.learnCourses}
              </motion.div>
            </a>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mb-16"
          >
            <h3 className="text-center text-2xl md:text-3xl font-bold mb-8 text-apple-gray-900">
              {t.hero.strengthsTitle}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {t.hero.strengths.map((feature, index) => (
                <motion.div
                  key={index}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-2xl p-6 border border-apple-gray-200 hover:border-apple-blue/30 transition-all duration-300"
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h4 className="text-lg font-semibold mb-2 text-apple-gray-900">
                    {feature.title}
                  </h4>
                  <p className="text-apple-gray-600 text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto mb-20"
          >
            {t.hero.stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-apple-gray-200"
              >
                <div className="text-2xl md:text-3xl font-bold text-apple-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-apple-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={scrollToContent}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <ChevronDown className="h-8 w-8 text-apple-gray-400 animate-bounce" />
      </motion.button>

      {/* Corner accents */}
      <div className="absolute top-8 left-8 h-32 w-32 rounded-full bg-apple-blue/5 blur-3xl" />
      <div className="absolute bottom-8 right-8 h-32 w-32 rounded-full bg-apple-orange/5 blur-3xl" />
    </section>
  )
}
