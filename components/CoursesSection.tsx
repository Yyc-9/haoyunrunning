'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Target, Clock, ChevronRight } from 'lucide-react'
import { courseGroups } from '@/lib/goodluck-data'

export default function CoursesSection() {
  return (
    <section id="courses" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-black to-apple-gray-800">
              2026 好運跑步訓練營
            </span>
          </h2>
          <p className="text-xl text-apple-gray-600 max-w-3xl mx-auto">
            依照程度、地點與訓練目標安排班級，陪伴跑者備戰 5000m、10000m、半馬與全馬。
          </p>
        </motion.div>

        <div className="space-y-10">
          {courseGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: groupIndex * 0.1 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-apple-gray-200 bg-white p-6 shadow-sm md:p-8"
            >
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center rounded-full bg-apple-blue/10 px-4 py-2 text-sm font-semibold text-apple-blue">
                    {group.courses.length} 個班級
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-apple-gray-900 md:text-3xl">
                    {group.title}
                  </h3>
                  <p className="max-w-3xl text-apple-gray-600">{group.description}</p>
                </div>
                <p className="max-w-md rounded-2xl bg-apple-gray-50 p-4 text-sm leading-6 text-apple-gray-600">
                  {group.audience}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.courses.map((course, index) => (
                  <motion.article
                    key={course.name}
                    whileHover={{ y: -6 }}
                    className="rounded-2xl border border-apple-gray-200 bg-apple-gray-50 p-5 transition-all duration-300 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-apple-blue shadow-sm">
                        {course.weekday}
                      </span>
                      {groupIndex === 0 && index === 0 && (
                        <span className="rounded-full bg-apple-orange/10 px-3 py-1 text-xs font-semibold text-apple-orange">
                          初心推薦
                        </span>
                      )}
                      {course.name.includes('PB') && (
                        <span className="rounded-full bg-apple-orange/10 px-3 py-1 text-xs font-semibold text-apple-orange">
                          PB 目標
                        </span>
                      )}
                    </div>

                    <h4 className="mb-4 min-h-14 text-lg font-bold leading-7 text-apple-gray-900">
                      {course.name}
                    </h4>

                    <div className="mb-5 space-y-3 text-sm text-apple-gray-600">
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4 text-apple-blue" />
                        {course.location}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-apple-blue" />
                        {course.period}
                      </div>
                      <div className="flex items-start">
                        <Target className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-apple-blue" />
                        <span>{course.focus}</span>
                      </div>
                    </div>

                    <div className="border-t border-apple-gray-200 pt-4">
                      <Link
                        href="/shop"
                        className="inline-flex items-center text-sm font-semibold text-apple-blue"
                      >
                        購買或洽詢課程
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-12 rounded-3xl border border-apple-gray-200 bg-gradient-to-r from-apple-blue/5 via-white to-apple-orange/5 p-8"
        >
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Clock,
                title: '12 週週期',
                description: '目前班級集中在 4 月至 6 月，方便以完整週期建立訓練節奏。',
              },
              {
                icon: Target,
                title: '多目標備賽',
                description: '支援 5000m、10000m、半馬、全馬與 PB 目標的訓練安排。',
              },
              {
                icon: MapPin,
                title: '台灣多地開課',
                description: '台北、新竹、竹北、板橋、三重、竹南等班級逐步整理上線。',
              },
            ].map((item) => (
              <div key={item.title}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue to-apple-orange">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="mb-2 font-bold text-apple-gray-900">{item.title}</h4>
                <p className="text-sm leading-6 text-apple-gray-600">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <motion.a
              href="https://www.instagram.com/nurture.running.team/"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="apple-button-secondary inline-flex items-center"
            >
              聯絡好運，詢問適合班級
              <ChevronRight className="h-5 w-5 ml-2" />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
