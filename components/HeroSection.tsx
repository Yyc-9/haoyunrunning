'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Play, Calendar, ChevronLeft, ChevronRight, Pause } from 'lucide-react'
import Link from 'next/link'

export default function HeroSection() {
  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
  }

  const images = [
    { src: '/Instagram.png', title: '跑步的乐趣与成就', desc: '学员精彩瞬间' },
    { src: '/LINE_ALBUM_四週年手機桌布_260515_1.jpg', title: '四周年纪念', desc: '社区活动瞬间' },
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
              好運跑班
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-apple-gray-900 mb-6 max-w-2xl mx-auto bg-gradient-to-r from-apple-gray-800 to-apple-gray-600 bg-clip-text text-transparent drop-shadow-sm"
          >
            科学训练，跑出好运
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg text-apple-gray-500 mb-8 max-w-3xl mx-auto"
          >
            专业的跑步训练平台，为跑者提供科学、系统、个性化的训练指导。
            我们相信每一次奔跑都是对自我的挑战与超越。
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
                      图片轮播 {currentImageIndex + 1}/{images.length}
                    </div>
                    <div className="text-base text-apple-gray-800">
                      {isAutoPlay ? '自动播放中...' : '点击播放按钮开始自动播放'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={goToPrev}
                      className="text-sm text-apple-blue hover:text-apple-blue/80 font-medium"
                    >
                      上一张
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={goToNext}
                      className="text-sm text-apple-blue hover:text-apple-blue/80 font-medium"
                    >
                      下一张
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
                立即加入
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
                了解课程
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
              我们的核心优势
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                {
                  icon: '🎯',
                  title: '方案个性化',
                  description: '基于您的目标、水平和进度，量身定制科学训练计划'
                },
                {
                  icon: '📊',
                  title: '数据驱动',
                  description: '实时追踪训练数据，智能分析进步曲线，及时调整训练强度'
                },
                {
                  icon: '👨‍🏫',
                  title: '专业教练指导',
                  description: '经验丰富的跑步教练提供一对一指导和技术纠正'
                }
              ].map((feature, index) => (
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
            {[
              { value: '1,200+', label: '活跃学员' },
              { value: '98%', label: '满意度' },
              { value: '24/7', label: '在线支持' },
              { value: '50+', label: '专业教练' },
            ].map((stat, index) => (
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

          {/* Appointment CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 border border-apple-gray-200"
          >
            <Calendar className="h-5 w-5 text-apple-blue" />
            <span className="text-apple-gray-700">
              预约免费咨询 →
            </span>
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