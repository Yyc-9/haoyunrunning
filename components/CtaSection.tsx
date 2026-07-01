'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Smartphone, Clock, Users, Shield } from 'lucide-react'

export default function CtaSection() {
  const features = [
    {
      icon: CheckCircle,
      title: '30天免費試用',
      description: '體验完整訓練系統',
    },
    {
      icon: Smartphone,
      title: '行動端優先',
      description: '隨時隨地訓練記錄',
    },
    {
      icon: Clock,
      title: '彈性安排',
      description: '適配您的日程計畫',
    },
    {
      icon: Shield,
      title: '安全保障',
      description: '科學訓練防傷體系',
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-black to-apple-gray-800">
                  開始您的跑步之旅
                </span>
              </h2>
              <p className="text-xl text-apple-gray-600 mb-8 max-w-lg">
                加入數千名已透過科學訓練實現目標的跑者行列。
                專業的教練團隊，個性化的訓練計畫，完整的支援系統。
              </p>

              <div className="space-y-4 mb-10">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center space-x-4"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-apple-blue to-apple-orange flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <p className="text-apple-gray-600 text-sm">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="apple-button-primary text-lg px-10 py-4"
                >
                  立即免費試用
                  <ArrowRight className="h-5 w-5 inline-block ml-2" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="apple-button-outline text-lg px-10 py-4"
                >
                  預約諮詢
                </motion.button>
              </div>
            </motion.div>

            {/* Right Content - Stats Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="apple-card p-8">
                <div className="absolute -top-4 -right-4">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-apple-orange to-pink-500 flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-8">資料見證實力</h3>

                <div className="space-y-6">
                  {[
                    { label: '社群规模', value: '5,000+', unit: '活躍跑者' },
                    { label: '累計里程', value: '250萬+', unit: '公里' },
                    { label: '目標達成', value: '89%', unit: '完成率' },
                    { label: '教練回覆', value: '24', unit: '小時內平均回覆' },
                  ].map((stat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-apple-gray-500">{stat.label}</div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                      </div>
                      <div className="text-apple-gray-600 text-sm">{stat.unit}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 pt-6 border-t border-apple-gray-200">
                  <div className="text-center">
                    <div className="text-sm text-apple-gray-500 mb-2">
                      加入我們，您將會獲得
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        '個性化計畫',
                        '教練指導',
                        '資料分析',
                        '社群支援',
                        '營養建議',
                        '防傷指導',
                        '比賽策略',
                        '終身學習',
                      ].map((benefit, index) => (
                        <div
                          key={index}
                          className="text-sm text-apple-gray-700 bg-apple-gray-50 rounded-lg px-3 py-2"
                        >
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -z-10 -top-6 -left-6 h-32 w-32 rounded-full bg-apple-blue/10 blur-3xl" />
              <div className="absolute -z-10 -bottom-6 -right-6 h-32 w-32 rounded-full bg-apple-orange/10 blur-3xl" />
            </motion.div>
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-20 pt-10 border-t border-apple-gray-200"
          >
            <div className="text-center">
              <div className="text-sm text-apple-gray-500 mb-6">信任與認可</div>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                {[
                  { name: '跑步協會', logo: '🏃' },
                  { name: '體育科技', logo: '⚡' },
                  { name: '健康認證', logo: '⭐' },
                  { name: '運動醫學', logo: '🏥' },
                  { name: '資料安全', logo: '🔒' },
                ].map((org, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center"
                  >
                    <div className="h-12 w-12 rounded-xl bg-apple-gray-100 flex items-center justify-center text-2xl mb-2">
                      {org.logo}
                    </div>
                    <div className="text-sm font-medium">{org.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}