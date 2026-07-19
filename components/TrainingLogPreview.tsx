'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  CalendarDays,
  CheckCircle,
  Heart,
  MapPin,
  MessageSquare,
  Timer,
  TrendingUp,
} from 'lucide-react'
import Toast from '@/components/Toast'
import { useAuth } from '@/app/providers'
import {
  getMyTrainingFeedback,
  getMyTrainingPlans,
  submitTrainingFeedback,
  type TrainingFeedback,
  type TrainingPlan,
} from '@/lib/supabase'

function parseDistance(value: string) {
  const match = value.replace(',', '.').match(/\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

function parseHeartRate(value: string) {
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : null
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TrainingLogPreview() {
  const { user, isLoggedIn } = useAuth()
  const [showToast, setShowToast] = useState(false)
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [recentFeedback, setRecentFeedback] = useState<TrainingFeedback[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    distance: '',
    duration: '',
    pace: '',
    heartRate: '',
    rpe: 5,
    comment: '',
  })

  const latestPlan = plans[0]

  useEffect(() => {
    let isActive = true

    const loadTrainingLog = async () => {
      if (!isLoggedIn || !user) {
        setPlans([])
        setRecentFeedback([])
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const [planData, feedbackData] = await Promise.all([
          getMyTrainingPlans(user.id),
          getMyTrainingFeedback(user.id),
        ])

        if (!isActive) return
        setPlans(planData)
        setRecentFeedback(feedbackData)
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : '讀取訓練日志失敗。')
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadTrainingLog()

    return () => {
      isActive = false
    }
  }, [isLoggedIn, user])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!isLoggedIn || !user) {
      setError('請先登入，登入後才能提交訓練回饋。')
      return
    }

    setIsSubmitting(true)

    try {
      await submitTrainingFeedback({
        training_plan_id: latestPlan?.id ?? null,
        student_id: user.id,
        coach_id: latestPlan?.coach_id ?? null,
        distance_km: parseDistance(formData.distance),
        duration_text: formData.duration,
        pace_text: formData.pace,
        average_heart_rate: parseHeartRate(formData.heartRate),
        rpe: formData.rpe,
        feeling: formData.comment,
      })

      setFormData({
        distance: '',
        duration: '',
        pace: '',
        heartRate: '',
        rpe: 5,
        comment: '',
      })
      setRecentFeedback(user ? await getMyTrainingFeedback(user.id) : [])
      setShowToast(true)
      window.setTimeout(() => setShowToast(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交訓練回饋失敗，請稍後再試。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
  }

  const handleRpeChange = (value: number) => {
    setFormData({
      ...formData,
      rpe: value,
    })
  }

  return (
    <section className="rounded-3xl bg-apple-gray-100 px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="mb-8"
      >
        <h2 className="text-3xl font-black text-apple-gray-900 md:text-4xl">訓練日志系統</h2>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-apple-gray-600">
          這裡會同步教練派發的真實課表；課表清空或尚未派發時顯示空狀態。
        </p>
      </motion.div>

      {error && (
        <div className="mb-6 rounded-3xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="apple-card p-6 md:p-8"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-apple-gray-500">
                  {latestPlan?.workout_date || (isLoading ? '同步中' : '尚未同步')}
                </div>
                <h3 className="text-xl font-bold text-apple-gray-900">今日訓練計畫</h3>
              </div>
            </div>
            <span className="rounded-full bg-apple-blue/10 px-4 py-1 text-sm font-bold text-apple-blue">
              {latestPlan ? '已同步' : '待同步'}
            </span>
          </div>

          {latestPlan ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-apple-gray-100 p-4">
                <div className="text-2xl font-black text-apple-gray-900">{latestPlan.title}</div>
                <p className="mt-2 leading-7 text-apple-gray-600">{latestPlan.target}</p>
                {latestPlan.note && (
                  <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-apple-gray-600">
                    {latestPlan.note}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: CalendarDays, label: '訓練日', value: latestPlan.day_label },
                  { icon: Timer, label: '目標配速', value: latestPlan.pace || '由教練調整' },
                  { icon: TrendingUp, label: '週數', value: `第 ${latestPlan.week_number} 周` },
                  { icon: Heart, label: '狀態', value: '完成後回報' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-apple-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-apple-blue" />
                      <span className="text-sm text-apple-gray-500">{item.label}</span>
                    </div>
                    <div className="text-base font-bold text-apple-gray-900">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-apple-gray-200 pt-4">
                <div className="flex items-center gap-2 text-apple-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">完成訓練後，請在右側提交回饋。</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white p-8 text-center">
              <CalendarDays className="mx-auto mb-3 h-9 w-9 text-apple-gray-400" />
              <p className="font-bold text-apple-gray-900">
                {isLoading ? '正在同步課表' : '目前沒有已同步課表'}
              </p>
              <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                教練重新派發課表後，這裡會自動顯示真實訓練內容。
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="apple-card p-6 md:p-8"
        >
          <h3 className="mb-6 text-2xl font-bold text-apple-gray-900">訓練回饋</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: 'distance', label: '完成里程 (km)', icon: MapPin, placeholder: '填寫完成里程' },
                  { name: 'duration', label: '完成時間', icon: Timer, placeholder: '填寫完成時間' },
                  { name: 'pace', label: '平均配速', icon: Timer, placeholder: '填寫平均配速' },
                  { name: 'heartRate', label: '平均心率', icon: Heart, placeholder: '填寫平均心率' },
                ].map((field) => (
                  <label key={field.name} className="block">
                    <span className="mb-2 block text-sm font-medium text-apple-gray-700">{field.label}</span>
                    <div className="relative">
                      <field.icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-apple-gray-400" />
                      <input
                        type="text"
                        name={field.name}
                        value={formData[field.name as keyof typeof formData] as string}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        className="apple-input pl-10"
                      />
                    </div>
                  </label>
                ))}
              </div>

              <label className="block">
                <span className="mb-4 block text-sm font-medium text-apple-gray-700">
                  體感疲勞度 (RPE 1-10): <span className="font-bold text-apple-blue">{formData.rpe}</span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.rpe}
                  onChange={(event) => handleRpeChange(Number(event.target.value))}
                  className="w-full"
                />
                <div className="mt-2 flex justify-between text-xs text-apple-gray-500">
                  <span>非常輕鬆</span>
                  <span>中等</span>
                  <span>非常困難</span>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-apple-gray-700">訓練感受與備註</span>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-apple-gray-400" />
                  <textarea
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    placeholder="請描述今天的訓練感受..."
                    rows={4}
                    className="apple-input resize-none pl-10"
                  />
                </div>
              </label>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                className="apple-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '提交中...' : '提交訓練回饋'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        viewport={{ once: true }}
        className="mt-10"
      >
        <h4 className="mb-4 text-lg font-semibold text-apple-gray-900">最近完成訓練</h4>
        {recentFeedback.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {recentFeedback.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-2xl border border-apple-gray-200 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-apple-gray-900">{formatDateTime(item.created_at)}</div>
                    <div className="text-sm text-apple-gray-500">{item.distance_km ?? '-'} km</div>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                    RPE {item.rpe ?? '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-apple-gray-500">
                  <span>配速：{item.pace_text || '-'}</span>
                  <span>心率：{item.average_heart_rate ?? '-'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-black/15 bg-white p-6 text-center">
            <p className="font-bold text-apple-gray-900">還沒有完成記錄</p>
            <p className="mt-2 text-sm text-apple-gray-600">提交第一次真實回饋後，這裡會顯示最近訓練。</p>
          </div>
        )}
      </motion.div>

      <Toast
        isVisible={showToast}
        message="訓練回饋已提交，教練端會同步看到。"
        type="success"
      />
    </section>
  )
}
