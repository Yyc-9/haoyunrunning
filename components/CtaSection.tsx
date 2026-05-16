'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Smartphone, Clock, Users, Shield } from 'lucide-react'

export default function CtaSection() {
  const features = [
    {
      icon: CheckCircle,
      title: '30天免费试用',
      description: '体验完整训练系统',
    },
    {
      icon: Smartphone,
      title: '移动端优先',
      description: '随时随地训练记录',
    },
    {
      icon: Clock,
      title: '灵活安排',
      description: '适配您的日程计划',
    },
    {
      icon: Shield,
      title: '安全保障',
      description: '科学训练防伤体系',
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
                  开始您的跑步之旅
                </span>
              </h2>
              <p className="text-xl text-apple-gray-600 mb-8 max-w-lg">
                加入数千名已通过科学训练实现目标的跑者行列。
                专业的教练团队，个性化的训练计划，完整的支持系统。
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
                  立即免费试用
                  <ArrowRight className="h-5 w-5 inline-block ml-2" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="apple-button-outline text-lg px-10 py-4"
                >
                  预约咨询
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

                <h3 className="text-2xl font-bold mb-8">数据见证实力</h3>

                <div className="space-y-6">
                  {[
                    { label: '社区规模', value: '5,000+', unit: '活跃跑者' },
                    { label: '累计里程', value: '250万+', unit: '公里' },
                    { label: '目标达成', value: '89%', unit: '完成率' },
                    { label: '教练回复', value: '24', unit: '小时内平均回复' },
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
                      加入我们，您将会获得
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        '个性化计划',
                        '教练指导',
                        '数据分析',
                        '社群支持',
                        '营养建议',
                        '防伤指导',
                        '比赛策略',
                        '终身学习',
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
              <div className="text-sm text-apple-gray-500 mb-6">信任与认可</div>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                {[
                  { name: '跑步协会', logo: '🏃' },
                  { name: '体育科技', logo: '⚡' },
                  { name: '健康认证', logo: '⭐' },
                  { name: '运动医学', logo: '🏥' },
                  { name: '数据安全', logo: '🔒' },
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