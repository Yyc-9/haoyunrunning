'use client'

import { motion } from 'framer-motion'
import { Quote, Star, Award, TrendingUp, Calendar } from 'lucide-react'
import { useLanguage } from '@/app/language-context'

const testimonials = [
  {
    rating: 5,
    color: 'from-apple-blue to-cyan-500',
  },
  {
    rating: 5,
    color: 'from-apple-orange to-pink-500',
  },
  {
    rating: 5,
    color: 'from-purple-500 to-pink-500',
  },
  {
    rating: 5,
    color: 'from-green-500 to-emerald-500',
  },
]

export default function TestimonialsSection() {
  const { t } = useLanguage()

  return (
    <section className="py-20 bg-apple-gray-100">
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
              {t.testimonials.title}
            </span>
          </h2>
          <p className="text-xl text-apple-gray-600 max-w-3xl mx-auto">
            {t.testimonials.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {testimonials.map((testimonial, index) => {
            const content = t.testimonials.items[index]

            return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="apple-card p-8"
            >
              <div className="flex items-start space-x-4 mb-6">
                <div
                  className={`h-14 w-14 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white text-lg font-bold flex-shrink-0`}
                >
                  {content.avatar}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">{content.name}</h4>
                  <p className="text-apple-gray-600 text-sm mb-2">{content.role}</p>
                  <div className="flex items-center">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
                <Quote className="h-8 w-8 text-apple-gray-300 flex-shrink-0" />
              </div>

              <blockquote className="text-apple-gray-700 mb-6 italic">
                &quot;{content.content}&quot;
              </blockquote>

              <div className="pt-6 border-t border-apple-gray-200">
                <div className="flex items-center text-apple-blue font-medium">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {content.progress}
                </div>
              </div>
            </motion.div>
            )
          })}
        </div>

        {/* Progress Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl p-8 border border-apple-gray-200"
        >
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Award, color: 'text-apple-blue', bg: 'bg-apple-blue/10' },
              { icon: Calendar, color: 'text-apple-orange', bg: 'bg-apple-orange/10' },
              { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-500/10' },
              { icon: Star, color: 'text-purple-600', bg: 'bg-purple-500/10' },
            ].map((stat, index) => {
              const content = t.testimonials.stats[index]

              return (
              <div key={index} className="text-center">
                <div
                  className={`h-16 w-16 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mx-auto mb-4`}
                >
                  <stat.icon className="h-8 w-8" />
                </div>
                <div className="text-3xl font-bold mb-1">{content.value}</div>
                <div className="font-medium mb-1">{content.label}</div>
                <div className="text-sm text-apple-gray-600">{content.description}</div>
              </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
