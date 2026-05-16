'use client'

import { motion } from 'framer-motion'
import { Quote, Star, Award, TrendingUp, Calendar } from 'lucide-react'

const testimonials = [
  {
    name: '张伟',
    role: '马拉松跑者',
    content: '经过16周的训练，我的全马成绩从4小时30分提升到3小时45分，教练的专业指导让我少走了很多弯路。',
    rating: 5,
    progress: '全马PB提升45分钟',
    avatar: '张',
    color: 'from-apple-blue to-cyan-500',
  },
  {
    name: '李娜',
    role: '半程马拉松新手',
    content: '从完全不跑步到完成半程马拉松，教练的耐心指导和安全第一的理念让我充满信心地完成了挑战。',
    rating: 5,
    progress: '从0到完成半马',
    avatar: '李',
    color: 'from-apple-orange to-pink-500',
  },
  {
    name: '王刚',
    role: '跑步爱好者',
    content: '伤病恢复后的复出训练，教练制定的个性化计划让我安全地恢复到最佳状态，甚至超过了伤前水平。',
    rating: 5,
    progress: '伤后回归提升速度',
    avatar: '王',
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: '赵敏',
    role: '精英跑者',
    content: '针对性的间歇训练和科学的数据分析，让我的10公里配速提升了30秒，成功突破个人最佳成绩。',
    rating: 5,
    progress: '10km配速提升30秒',
    avatar: '赵',
    color: 'from-green-500 to-emerald-500',
  },
]

export default function TestimonialsSection() {
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
              学员见证
            </span>
          </h2>
          <p className="text-xl text-apple-gray-600 max-w-3xl mx-auto">
            听听我们的学员如何通过科学训练实现个人突破
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
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
                  {testimonial.avatar}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">{testimonial.name}</h4>
                  <p className="text-apple-gray-600 text-sm mb-2">{testimonial.role}</p>
                  <div className="flex items-center">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
                <Quote className="h-8 w-8 text-apple-gray-300 flex-shrink-0" />
              </div>

              <blockquote className="text-apple-gray-700 mb-6 italic">
                "{testimonial.content}"
              </blockquote>

              <div className="pt-6 border-t border-apple-gray-200">
                <div className="flex items-center text-apple-blue font-medium">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {testimonial.progress}
                </div>
              </div>
            </motion.div>
          ))}
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
              {
                icon: Award,
                label: 'PB突破率',
                value: '92%',
                description: '学员实现个人最佳成绩',
                color: 'text-apple-blue',
                bg: 'bg-apple-blue/10',
              },
              {
                icon: Calendar,
                label: '训练坚持率',
                value: '88%',
                description: '完成全部训练计划',
                color: 'text-apple-orange',
                bg: 'bg-apple-orange/10',
              },
              {
                icon: TrendingUp,
                label: '满意度',
                value: '97%',
                description: '学员推荐给朋友',
                color: 'text-green-600',
                bg: 'bg-green-500/10',
              },
              {
                icon: Star,
                label: '教练评分',
                value: '4.9/5.0',
                description: '专业度与责任心',
                color: 'text-purple-600',
                bg: 'bg-purple-500/10',
              },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className={`h-16 w-16 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mx-auto mb-4`}
                >
                  <stat.icon className="h-8 w-8" />
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="font-medium mb-1">{stat.label}</div>
                <div className="text-sm text-apple-gray-600">{stat.description}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}