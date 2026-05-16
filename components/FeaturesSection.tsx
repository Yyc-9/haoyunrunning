'use client'

import { motion } from 'framer-motion'
import { Target, BarChart, Users, Clock, Heart, Trophy } from 'lucide-react'

const features = [
  {
    icon: Target,
    title: '个性化训练计划',
    description: '基于您的目标、水平和进度，量身定制科学训练计划',
    color: 'from-apple-blue to-cyan-500',
  },
  {
    icon: BarChart,
    title: '数据追踪分析',
    description: '实时追踪训练数据，智能分析进步曲线，及时调整训练强度',
    color: 'from-apple-orange to-pink-500',
  },
  {
    icon: Users,
    title: '专业教练团队',
    description: '经验丰富的跑步教练提供一对一指导和技术纠正',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Clock,
    title: '灵活时间安排',
    description: '随时随地训练，支持离线训练数据同步',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Heart,
    title: '健康安全保障',
    description: '科学的训练体系，预防运动损伤，确保训练安全',
    color: 'from-red-500 to-orange-500',
  },
  {
    icon: Trophy,
    title: '成就激励系统',
    description: '丰富的成就徽章和奖励机制，激励您持续进步',
    color: 'from-yellow-500 to-orange-500',
  },
]

export default function FeaturesSection() {
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
              为什么选择好運跑班？
            </span>
          </h2>
          <p className="text-xl text-apple-gray-600 max-w-3xl mx-auto">
            我们提供完整的跑步训练生态系统，帮助您安全、高效地实现目标
          </p>
        </motion.div>

        <div className="bento-grid">
          {features.map((feature, index) => (
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
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-apple-gray-600">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
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
            {[
              { value: '10,000+', label: '累计训练里程' },
              { value: '500+', label: 'PB突破学员' },
              { value: '99.8%', label: '训练安全率' },
              { value: '4.9/5.0', label: '学员评分' },
            ].map((stat, index) => (
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