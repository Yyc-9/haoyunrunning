'use client'

import { motion } from 'framer-motion'
import { Target, BarChart, Users, Clock, Heart, Trophy } from 'lucide-react'
import { useLanguage } from '@/app/language-context'

const features = [
  {
    icon: Target,
    color: 'from-apple-blue to-cyan-500',
  },
  {
    icon: BarChart,
    color: 'from-apple-orange to-pink-500',
  },
  {
    icon: Users,
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Clock,
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Heart,
    color: 'from-red-500 to-orange-500',
  },
  {
    icon: Trophy,
    color: 'from-yellow-500 to-orange-500',
  },
]

export default function FeaturesSection() {
  const { t } = useLanguage()

  return (
    <section id="about" className="py-20 bg-white">
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
              {t.features.title}
            </span>
          </h2>
          <p className="text-xl text-apple-gray-600 max-w-3xl mx-auto">
            {t.features.subtitle}
          </p>
        </motion.div>

        <div className="bento-grid">
          {features.map((feature, index) => {
            const content = t.features.items[index]

            return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="apple-card p-8"
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{content.title}</h3>
                  <p className="text-apple-gray-600">{content.description}</p>
                </div>
              </div>
            </motion.div>
            )
          })}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 bg-gradient-to-r from-apple-blue/5 via-apple-orange/5 to-purple-500/5 rounded-3xl p-8 border border-apple-gray-200"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {t.features.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-apple-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-apple-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
