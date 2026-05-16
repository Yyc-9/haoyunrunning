'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Heart,
  Timer,
  MapPin,
  CheckCircle,
  Upload,
  MessageSquare,
  Activity,
} from 'lucide-react'
import Toast from '@/components/Toast'

export default function TrainingLogPreview() {
  const [showToast, setShowToast] = useState(false)
  const [formData, setFormData] = useState({
    distance: '',
    pace: '',
    heartRate: '',
    rpe: 5,
    comment: '',
  })

  const workout = {
    type: 'E跑',
    distance: '10km',
    description: '轻松跑，维持有氧心率区间',
    date: '今日训练',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Training log submitted:', formData)
    setShowToast(true)
    // 3秒后隐藏toast
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleRpeChange = (value: number) => {
    setFormData({
      ...formData,
      rpe: value,
    })
  }

  return (
    <section className="py-20 bg-apple-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-black to-apple-gray-800">
              训练日志系统
            </span>
          </h2>
          <p className="text-xl text-apple-gray-600 max-w-3xl mx-auto">
            科学记录每一次训练，获取个性化反馈，持续优化训练计划
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Daily Workout Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="apple-card p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-apple-blue to-cyan-500 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-apple-gray-500">{workout.date}</div>
                  <h3 className="text-xl font-bold">今日训练计划</h3>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-apple-blue/10 text-apple-blue rounded-full px-4 py-1 text-sm font-medium"
              >
                未完成
              </motion.div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-apple-gray-50 rounded-2xl">
                <div className="text-2xl font-bold text-apple-gray-900 mb-1">
                  {workout.type} {workout.distance}
                </div>
                <p className="text-apple-gray-600">{workout.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: MapPin, label: '距离', value: workout.distance },
                  { icon: Timer, label: '建议配速', value: '5:30-6:00/km' },
                  { icon: Heart, label: '心率区间', value: '130-150' },
                  { icon: TrendingUp, label: '累计海拔', value: '±50m' },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-4 border border-apple-gray-200"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <item.icon className="h-4 w-4 text-apple-blue" />
                      <span className="text-sm text-apple-gray-500">{item.label}</span>
                    </div>
                    <div className="text-lg font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-apple-gray-200">
                <div className="flex items-center space-x-2 text-apple-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    完成训练后，请在下方提交反馈
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feedback Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="apple-card p-8"
          >
            <h3 className="text-2xl font-bold mb-6">训练反馈</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* 数值输入部分 */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    {
                      name: 'distance',
                      label: '完成里程 (km)',
                      icon: MapPin,
                      placeholder: '例如：10.5',
                    },
                    {
                      name: 'pace',
                      label: '平均配速',
                      icon: Timer,
                      placeholder: '例如：5:45',
                    },
                    {
                      name: 'heartRate',
                      label: '平均心率',
                      icon: Heart,
                      placeholder: '例如：145',
                    },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                        {field.label}
                      </label>
                      <div className="relative">
                        <field.icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-apple-gray-400" />
                        <input
                          type="text"
                          name={field.name}
                          value={formData[field.name as keyof typeof formData] as string}
                          onChange={handleChange}
                          placeholder={field.placeholder}
                          className="apple-input pl-10"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* RPE Slider */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-700 mb-4">
                    体感疲劳度 (RPE 1-10):{' '}
                    <span className="font-bold text-apple-blue">{formData.rpe}</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.rpe}
                      onChange={(e) => handleRpeChange(parseInt(e.target.value))}
                      className="apple-slider w-full"
                    />
                    <div className="flex justify-between text-xs text-apple-gray-500">
                      <span>非常轻松</span>
                      <span>中等</span>
                      <span>非常困难</span>
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                    训练感受与备注
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-apple-gray-400" />
                    <textarea
                      name="comment"
                      value={formData.comment}
                      onChange={handleChange}
                      placeholder="请描述今天的训练感受..."
                      rows={3}
                      className="apple-input pl-10 resize-none"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-700 mb-2">
                    上传跑步App截图
                  </label>
                  <div className="border-2 border-dashed border-apple-gray-300 rounded-2xl p-8 text-center hover:border-apple-blue transition-colors duration-200">
                    <Upload className="h-10 w-10 text-apple-gray-400 mx-auto mb-4" />
                    <p className="text-apple-gray-600 mb-2">
                      拖拽或点击上传截图 (支持JPG, PNG)
                    </p>
                    <p className="text-sm text-apple-gray-500">
                      建议上传跑步App的训练截图
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full apple-button-primary"
                >
                  提交训练反馈
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <h4 className="text-lg font-semibold mb-4">最近完成训练</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { type: '间歇跑', distance: '8km', date: '昨天', status: '已完成' },
              { type: '长距离', distance: '21km', date: '3天前', status: '已完成' },
              { type: '恢复跑', distance: '5km', date: '1周前', status: '已完成' },
            ].map((activity, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 border border-apple-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{activity.type}</div>
                    <div className="text-apple-gray-500 text-sm">{activity.distance}</div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-1">
                    {activity.status}
                  </span>
                </div>
                <div className="text-xs text-apple-gray-400">{activity.date}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Toast Notification */}
      <Toast
        isVisible={showToast}
        message="训练反馈已提交！教练将会尽快查看并给予反馈。"
        type="success"
      />
    </section>
  )
}