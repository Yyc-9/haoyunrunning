'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import TrainingLogPreview from '@/components/TrainingLogPreview'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  MessageSquareText,
  NotebookPen,
  Settings,
  Target,
  TrendingUp,
  User,
  UsersRound,
} from 'lucide-react'
import Link from 'next/link'

function QuickLink({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 rounded-2xl hover:bg-gray-50 transition-colors"
    >
      <Icon className="h-6 w-6 text-apple-blue mb-2" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

export default function ProfilePage() {
  const { isLoggedIn, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/?auth=login')
    }
  }, [isLoggedIn, router])

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-apple-blue"></div>
      </div>
    )
  }

  const isCoach = user.role === 'coach' || user.role === 'admin'

  if (isCoach) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-3xl bg-white p-8 shadow-lg"
          >
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-2xl font-bold text-white">
                {user.name?.charAt(0) || <User className="h-10 w-10" />}
              </div>
              <div className="flex-1">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                  Coach account
                </p>
                <h1 className="text-2xl font-bold text-apple-gray-900 md:text-3xl">
                  {user.name || '好運教練'}
                </h1>
                <p className="mt-1 text-apple-gray-500">{user.email}</p>
                <div className="mt-3 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-700">
                  教練權限已啟用
                </div>
              </div>
              <Link href="/coach" className="apple-button-primary gap-2">
                進入教練工作台
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                href: '/coach/students',
                icon: UsersRound,
                title: '學員管理',
                description: '查看已綁定學員，後續會加入風險提醒、最近回饋與訓練進度。',
              },
              {
                href: '/coach/planner',
                icon: NotebookPen,
                title: '課表工作區',
                description: '保留熟悉的表格節奏，把每週訓練內容整理後同步給學員。',
              },
              {
                href: '/coach',
                icon: MessageSquareText,
                title: '回饋隊列',
                description: '集中處理學員提交的 RPE、訓練感受、里程與心率資訊。',
              },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="apple-card block p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                  <item.icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-apple-gray-900">{item.title}</h2>
                <p className="mt-3 leading-7 text-apple-gray-600">{item.description}</p>
              </Link>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8 rounded-3xl bg-white p-8 shadow-lg"
          >
            <div className="mb-6 flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-apple-gray-700" />
              <h2 className="text-xl font-bold text-apple-gray-900">接下來可以設計的教練個人頁</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['本週待處理', '顯示未查看回饋、異常 RPE、缺回報學員。'],
                ['常用課表模板', '沉澱間歇、節奏跑、長距離與恢復跑模板。'],
                ['教練備註庫', '記錄每位學員近期狀態，減少翻 Line 的成本。'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-3xl bg-apple-gray-100 p-5">
                  <h3 className="font-bold text-apple-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-24 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* 用户信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-apple-blue to-apple-orange flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.charAt(0) || <User className="h-10 w-10" />}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-apple-gray-900">
                {user.name || '好運学员'}
              </h1>
              <p className="text-apple-gray-500 mt-1">{user.email}</p>
              {user.pb && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-apple-blue/10 text-apple-blue text-sm font-medium">
                  <Target className="h-4 w-4 mr-1" />
                  PB: {user.pb}
                </div>
              )}
            </div>
            <Link href="/student" className="apple-button-primary flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>进入学员看板</span>
            </Link>
            <button className="apple-button-outline flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>编辑资料</span>
            </button>
          </div>

          {/* 快捷入口 */}
          <div className="grid grid-cols-4 gap-2 md:gap-4 mt-8 pt-6 border-t border-apple-gray-200">
            <QuickLink icon={TrendingUp} label="训练数据" />
            <QuickLink icon={Calendar} label="训练计划" />
            <QuickLink icon={Target} label="我的目标" />
            <QuickLink icon={Settings} label="设置" />
          </div>
        </motion.div>

        {/* 训练日志 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-bold mb-4 text-apple-gray-900">训练日志</h2>
          <TrainingLogPreview />
        </motion.div>
      </div>
    </main>
  )
}
