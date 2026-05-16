'use client'

import { motion } from 'framer-motion'
import { Calendar, Users, Target, Award, Clock, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/app/language-context'

const courses = [
  {
    popular: true,
    color: 'from-apple-blue to-cyan-500',
  },
  {
    popular: false,
    color: 'from-apple-orange to-pink-500',
  },
  {
    popular: false,
    color: 'from-purple-500 to-pink-500',
  },
  {
    popular: false,
    color: 'from-green-500 to-emerald-500',
  },
]

export default function CoursesSection() {
  const { t } = useLanguage()

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
              {t.courses.title}
            </span>
          </h2>
          <p className="text-xl text-apple-gray-600 max-w-3xl mx-auto">
            {t.courses.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {courses.map((course, index) => {
            const content = t.courses.items[index]

            return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="apple-card p-6 relative"
            >
              {course.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-apple-orange to-pink-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    {t.courses.popular}
                  </div>
                </div>
              )}

              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${course.color} flex items-center justify-center mb-6`}>
                <Target className="h-6 w-6 text-white" />
              </div>

              <h3 className="text-xl font-bold mb-2">{content.title}</h3>
              <div className="flex items-center text-sm text-apple-gray-500 mb-4 space-x-3">
                <span className="flex items-center">
                  <Award className="h-4 w-4 mr-1" />
                  {content.level}
                </span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {content.duration}
                </span>
              </div>

              <ul className="space-y-2 mb-6">
                {content.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-apple-gray-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-apple-blue mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-6 border-t border-apple-gray-200">
                <div>
                  <div className="text-2xl font-bold">{content.price}</div>
                  <div className="text-sm text-apple-gray-500">{t.courses.from}</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="apple-button-primary text-sm px-6 py-2"
                >
                  {t.courses.details}
                </motion.button>
              </div>
            </motion.div>
            )
          })}
        </div>

        {/* Course Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-apple-blue/5 via-apple-orange/5 to-purple-500/5 rounded-3xl p-8 border border-apple-gray-200"
        >
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-apple-blue to-cyan-500 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">{t.courses.highlights[0].title}</h4>
              <p className="text-apple-gray-600 text-sm">
                {t.courses.highlights[0].description}
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-apple-orange to-pink-500 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">{t.courses.highlights[1].title}</h4>
              <p className="text-apple-gray-600 text-sm">
                {t.courses.highlights[1].description}
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">{t.courses.highlights[2].title}</h4>
              <p className="text-apple-gray-600 text-sm">
                {t.courses.highlights[2].description}
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="apple-button-secondary inline-flex items-center"
            >
              {t.courses.compare}
              <ChevronRight className="h-5 w-5 ml-2" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
