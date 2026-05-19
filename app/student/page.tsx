'use client'

import { useState } from 'react'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  ImageUp,
  Mic,
  MessageSquareText,
  Route,
  Send,
  Timer,
} from 'lucide-react'
import { studentProfile, weeklyWorkouts } from '@/lib/training-workflow-data'

export default function StudentPage() {
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState({
    distance: '',
    duration: '',
    pace: '',
    heartRate: '',
    rpe: 6,
    feeling: '',
  })

  const todayWorkout = weeklyWorkouts[0]

  const updateField = (field: keyof typeof feedback, value: string | number) => {
    setFeedback((current) => ({ ...current, [field]: value }))
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Student dashboard
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">
                {studentProfile.name}，今天照顧好這一課。
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                課表、完成狀態與訓練感受都集中在這裡。回報越清楚，教練越能幫你把下一週調得剛剛好。
              </p>
            </div>
            <div className="apple-card p-5">
              <p className="text-sm text-apple-gray-500">目前計畫</p>
              <p className="mt-1 text-xl font-bold text-apple-gray-900">{studentProfile.program}</p>
              <p className="mt-1 text-sm text-apple-gray-600">
                第 {studentProfile.currentWeek} 週 · {studentProfile.goal}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-6">
              <article className="apple-card p-6 md:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-apple-blue">{todayWorkout.date}</p>
                    <h2 className="mt-2 text-2xl font-black text-apple-gray-900">
                      今日訓練：{todayWorkout.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
                    {todayWorkout.status}
                  </span>
                </div>

                <div className="rounded-3xl bg-apple-gray-100 p-5">
                  <p className="text-2xl font-black text-apple-gray-900">{todayWorkout.target}</p>
                  <p className="mt-2 text-apple-gray-600">{todayWorkout.pace}</p>
                  <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-apple-gray-600">
                    {todayWorkout.note}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Route, label: '訓練類型', value: todayWorkout.title },
                    { icon: Timer, label: '週數', value: `第 ${todayWorkout.week} 週` },
                    { icon: CalendarDays, label: '教練', value: studentProfile.coach },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4">
                      <item.icon className="mb-3 h-5 w-5 text-apple-gray-700" />
                      <p className="text-xs text-apple-gray-500">{item.label}</p>
                      <p className="mt-1 font-bold text-apple-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="apple-card p-6 md:p-8">
                <h2 className="mb-5 text-xl font-bold text-apple-gray-900">本週課表</h2>
                <div className="space-y-3">
                  {weeklyWorkouts.map((workout) => (
                    <div
                      key={workout.date}
                      className="grid gap-4 rounded-3xl border border-black/10 bg-white p-5 md:grid-cols-[120px_1fr]"
                    >
                      <div>
                        <p className="text-sm font-bold text-apple-gray-900">{workout.day}</p>
                        <p className="text-xs text-apple-gray-500">{workout.date}</p>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-apple-gray-900">{workout.title}</h3>
                          <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-semibold text-apple-gray-600">
                            {workout.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-apple-gray-600">{workout.target}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-apple-gray-500">完成後回報</p>
                  <h2 className="text-2xl font-black text-apple-gray-900">今日訓練感受</h2>
                </div>
              </div>

              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  setSubmitted(true)
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: 'distance', label: '實際里程', placeholder: '例如 8.2 km', icon: Route },
                    { key: 'duration', label: '完成時間', placeholder: '例如 42:10', icon: Timer },
                    { key: 'pace', label: '平均配速', placeholder: '例如 5:03/km', icon: Activity },
                    { key: 'heartRate', label: '平均心率', placeholder: '例如 158', icon: HeartPulse },
                  ].map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-2 block text-sm font-semibold text-apple-gray-700">
                        {field.label}
                      </span>
                      <div className="relative">
                        <field.icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
                        <input
                          value={feedback[field.key as keyof typeof feedback] as string}
                          onChange={(event) =>
                            updateField(field.key as keyof typeof feedback, event.target.value)
                          }
                          placeholder={field.placeholder}
                          className="apple-input pl-11"
                        />
                      </div>
                    </label>
                  ))}
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-apple-gray-700">
                    RPE 體感強度：{feedback.rpe}
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.rpe}
                    onChange={(event) => updateField('rpe', Number(event.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-apple-gray-500">
                    <span>很輕鬆</span>
                    <span>剛剛好</span>
                    <span>非常吃力</span>
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-apple-gray-700">文字或語音感受</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-apple-gray-700"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      語音輸入概念
                    </button>
                  </div>
                  <textarea
                    value={feedback.feeling}
                    onChange={(event) => updateField('feeling', event.target.value)}
                    rows={5}
                    placeholder="例如：今天 T 段最後一公里偏硬，右小腿有一點緊，但沒有痛。"
                    className="apple-input resize-none"
                  />
                </label>

                <div className="rounded-3xl border border-dashed border-black/20 bg-white p-6 text-center">
                  <ImageUp className="mx-auto mb-3 h-8 w-8 text-apple-gray-400" />
                  <p className="font-semibold text-apple-gray-800">上傳跑步 App 截圖</p>
                  <p className="mt-1 text-sm text-apple-gray-500">
                    第一版先做保存圖片；自動辨識里程、心率與配速可放到後端階段。
                  </p>
                </div>

                {submitted && (
                  <div className="flex items-start gap-3 rounded-3xl bg-green-50 p-4 text-green-800">
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                    <p className="text-sm leading-6">
                      已送出。教練端的「今日待處理」會看到這筆回饋，並依照 RPE 與感受調整下一次課表。
                    </p>
                  </div>
                )}

                <button type="submit" className="apple-button-primary w-full gap-2">
                  <Send className="h-4 w-4" />
                  提交給教練
                </button>
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
