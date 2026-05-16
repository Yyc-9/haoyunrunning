'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import TrainingLogPreview from '@/components/TrainingLogPreview'
import { motion } from 'framer-motion'
import { User, Settings, TrendingUp, Calendar, Target } from 'lucide-react'

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
