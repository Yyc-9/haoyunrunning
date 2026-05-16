'use client'

import { motion } from 'framer-motion'
import { Calendar, Users, Target, Award, Clock, ChevronRight } from 'lucide-react'

const courses = [
  {
    title: '马拉松全程训练营',
    level: '中级 ~ 高级',
    duration: '16周',
    features: ['个性化训练计划', '每周视频分析', '营养指导', '比赛策略'],
    price: '¥2,999',
    popular: true,
    color: 'from-apple-blue to-cyan-500',
  },
  {
    title: '半程马拉松入门',
    level: '入门 ~ 中级',
    duration: '12周',
    features: ['基础技术训练', '渐进式计划', '防伤指导', '社群支持'],
    price: '¥1,899',
    popular: false,
    color: 'from-apple-orange to-pink-500',
  },
  {
    title: '10公里速成班',
    level: '所有级别',
    duration: '8周',
    features: ['速度训练', '间歇训练', '心肺提升', '高效训练法'],
    price: '¥1,299',
    popular: false,
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: '跑步新手入门',
    level: '零基础',
    duration: '6周',
    features: ['跑步姿势矫正', '基础耐力建立', '装备指导', '健康习惯养成'],
    price: '¥899',
    popular: false,
    color: 'from-green-500 to-emerald-500',
  },
]

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
              专业训练课程
            </span>
          </h2>
          <p className="text-xl text-apple-gray-600 max-w-3xl mx-auto">
            选择适合您的训练计划，与专业教练团队一起实现跑步目标
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {courses.map((course, index) => (
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
                  <div className="bg-gradient-to-r from-apple-orange to-pink-500 text-white text-xs font-semibold px.4 py-1 rounded-full">
                    最受欢迎
                  </div>
                </div>
              )}

              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${course.color} flex items-center justify-center mb-6`}>
                <Target className="h-6 w-6 text-white" />
              </div>

              <h3 className="text-xl font-bold mb-2">{course.title}</h3>
              <div className="flex items-center text-sm text-apple-gray-500 mb-4 space-x-3">
                <span className="flex items-center">
                  <Award className="h-4 w-4 mr-1" />
                  {course.level}
                </span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {course.duration}
                </span>
              </div>

              <ul className="space-y-2 mb-6">
                {course.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-apple-gray-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-apple-blue mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-6 border-t border-apple-gray-200">
                <div>
                  <div className="text-2xl font-bold">{course.price}</div>
                  <div className="text-sm text-apple-gray-500">起</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="apple-button-primary text-sm px-6 py-2"
                >
                  了解详情
                </motion.button>
              </div>
            </motion.div>
          ))}
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
              <h4 className="font-semibold mb-2">灵活时间安排</h4>
              <p className="text-apple-gray-600 text-sm">
                根据您的日程安排训练时间，支持随时调整计划
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-apple-orange to-pink-500 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">小班制教学</h4>
              <p className="text-apple-gray-600 text-sm">
                每个班级不超过15人，确保每位学员得到充分关注
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">认证教练团队</h4>
              <p className="text-apple-gray-600 text-sm">
                所有教练均持有专业认证，拥有丰富的教学经验
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="apple-button-secondary inline-flex items-center"
            >
              查看完整课程对比
              <ChevronRight className="h-5 w-5 ml-2" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}