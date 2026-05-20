'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  KeyRound,
  MessageSquareText,
  NotebookPen,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type FeedbackItem = {
  id: string
  student: string
  program: string
  workout: string
  submittedAt: string
  distance: string
  pace: string
  heartRate: string
  rpe: number | string
  feeling: string
  status: 'new' | 'flagged' | 'reviewed' | 'missing'
}

const statusStyle = {
  new: 'bg-blue-50 text-blue-700',
  flagged: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-green-50 text-green-700',
  missing: 'bg-gray-100 text-gray-700',
}

const quickLinks = [
  {
    href: '/coach/students',
    icon: UsersRound,
    title: '學員列表',
    description: '查看每位學員的週數、目標、最近回饋與風險提醒。',
  },
  {
    href: '/coach/planner',
    icon: NotebookPen,
    title: '出課表面板',
    description: '用接近 Excel 的方式編輯週課表，之後可同步到學員端。',
  },
  {
    href: '/student',
    icon: MessageSquareText,
    title: '查看學員端',
    description: '站在學員視角檢查今日訓練與回饋表單。',
  },
]

const formatFeedback = (item: any): FeedbackItem => ({
  id: item.id,
  student: item.profiles?.name || '已登入學員',
  program: item.profiles?.program || '尚未分班',
  workout: item.training_plans?.target || '自主訓練回饋',
  submittedAt: new Date(item.created_at).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
  distance: item.distance_km ? `${item.distance_km}km` : '-',
  pace: item.pace_text || '-',
  heartRate: item.average_heart_rate ? String(item.average_heart_rate) : '-',
  rpe: item.rpe ?? '-',
  feeling: item.feeling || '尚未填寫感受。',
  status: item.status,
})

export default function CoachDashboardClient() {
  const [liveFeedback, setLiveFeedback] = useState<FeedbackItem[]>([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const loadFeedback = async () => {
      if (!supabase) return

      const { data, error } = await supabase
        .from('training_feedback')
        .select(`
          id,
          created_at,
          distance_km,
          pace_text,
          average_heart_rate,
          rpe,
          feeling,
          status,
          profiles:student_id (name, program),
          training_plans:training_plan_id (target)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        setLoadError(error.message)
        return
      }

      setLiveFeedback((data ?? []).map(formatFeedback))
    }

    loadFeedback()
  }, [])

  const displayFeedback = liveFeedback
  const flaggedCount = displayFeedback.filter((item) => item.status === 'flagged').length
  const missingCount = 0

  const stats = useMemo(
    () => [
      { label: '今日新回饋', value: displayFeedback.length, icon: MessageSquareText },
      { label: '需要留意', value: flaggedCount, icon: AlertTriangle },
      { label: '尚未回報', value: missingCount, icon: ClipboardList },
      { label: '管理學員', value: '待綁定', icon: UsersRound },
    ],
    [displayFeedback.length, flaggedCount, missingCount]
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Coach workspace
              </p>
              <h1 className="text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
                今天不用再一個一個等 Line。
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-apple-gray-600">
                教練端先把回饋集中、風險標出、課表入口放清楚。未來接上資料庫後，這裡就會成為每天調整訓練的主畫面。
              </p>
            </div>

            <div className="apple-card p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-apple-gray-500">Access model</p>
                  <h2 className="text-xl font-bold text-apple-gray-900">教練權限</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <div className="rounded-3xl bg-apple-gray-100 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-apple-gray-700" />
                  <p className="font-bold text-apple-gray-900">邀请码升级</p>
                </div>
                <p className="text-sm leading-6 text-apple-gray-600">
                  普通註冊預設是學員；教練從頁腳入口輸入內部邀请码後升級權限。
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="apple-card p-5">
                <item.icon className="mb-4 h-5 w-5 text-apple-gray-600" />
                <p className="text-3xl font-black text-apple-gray-900">{item.value}</p>
                <p className="mt-1 text-sm text-apple-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          {loadError && (
            <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              目前教練端讀取真實資料受權限限制。之後完成教練角色與學員綁定後，這裡會只顯示所屬學員回饋。訊息：{loadError}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-apple-gray-500">Feedback queue</p>
                  <h2 className="text-2xl font-black text-apple-gray-900">今日待處理回饋</h2>
                </div>
                <Link href="/coach/students" className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                  全部學員
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {displayFeedback.length > 0 ? (
                <div className="space-y-4">
                  {displayFeedback.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-black/10 bg-white p-5">
                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="text-lg font-bold text-apple-gray-900">{item.student}</h3>
                        <p className="text-sm text-apple-gray-500">
                          {item.program} · {item.submittedAt}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[item.status]}`}>
                        {item.status === 'flagged'
                          ? '需留意'
                          : item.status === 'new'
                            ? '新回饋'
                            : item.status === 'missing'
                              ? '未回報'
                              : '已看過'}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      {[
                        ['課表', item.workout],
                        ['實際', item.distance],
                        ['心率', item.heartRate],
                        ['RPE', item.rpe],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl bg-apple-gray-100 p-3">
                          <p className="text-xs text-apple-gray-500">{label}</p>
                          <p className="mt-1 font-bold text-apple-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 rounded-2xl bg-apple-gray-50 p-4 text-sm leading-6 text-apple-gray-700">
                      {item.feeling}
                    </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-black/15 bg-white p-8 text-center">
                  <p className="text-lg font-bold text-apple-gray-900">還沒有真實學員回饋</p>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-apple-gray-600">
                    學員從 `/student` 提交訓練回饋後，資料會出現在這裡。下一步完成教練角色與學員綁定後，這個列表會只顯示該教練負責的學員。
                  </p>
                </div>
              )}
            </section>

            <aside className="space-y-6">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="apple-card block p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-apple-gray-900">{item.title}</h2>
                  <p className="mt-3 leading-7 text-apple-gray-600">{item.description}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-900">
                    進入
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}

              <div className="apple-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="font-bold text-apple-gray-900">資料庫狀態</h2>
                </div>
                <p className="text-sm leading-6 text-apple-gray-600">
                  {liveFeedback.length > 0
                    ? '已讀取 Supabase 的真實學員回饋。'
                    : '已切換為真實資料模式；目前等待學員提交第一筆回饋。'}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
