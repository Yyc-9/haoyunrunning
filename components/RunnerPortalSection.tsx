'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ClipboardList, MessageSquareText, NotebookPen, UsersRound } from 'lucide-react'
import { weeklySchedulePreview } from '@/lib/goodluck-data'

export default function RunnerPortalSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              Runner portal
            </p>
            <h2 className="mb-6 text-3xl font-bold text-apple-gray-900 md:text-4xl">
              報名後，訓練不只停在集合現場
            </h2>
            <p className="mb-8 text-lg leading-8 text-apple-gray-600">
              學員可以回報每次訓練的里程、配速、心率與體感；教練可以依照回饋同步本週課表，讓訓練更有方向，也更容易被調整。
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: NotebookPen,
                  title: '學員回報',
                  description: '提交訓練感受、跑步截圖與 RPE。',
                },
                {
                  icon: ClipboardList,
                  title: '課表同步',
                  description: '教練更新本週訓練安排與注意事項。',
                },
                {
                  icon: MessageSquareText,
                  title: '教練調整',
                  description: '依照狀態調整強度、距離與恢復。',
                },
                {
                  icon: UsersRound,
                  title: '跑者社群',
                  description: '讓不同程度跑者都能被看見。',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-apple-gray-200 p-5">
                  <item.icon className="mb-4 h-6 w-6 text-apple-blue" />
                  <h3 className="mb-2 font-bold text-apple-gray-900">{item.title}</h3>
                  <p className="text-sm leading-6 text-apple-gray-600">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/profile" className="apple-button-primary text-center">
                進入學員中心
              </Link>
              <Link href="/courses" className="apple-button-outline text-center">
                查看課程
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-apple-gray-200 bg-apple-gray-50 p-6 md:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-apple-gray-500">Preview</p>
                <h3 className="text-2xl font-bold text-apple-gray-900">本週課表示例</h3>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-apple-blue shadow-sm">
                Coach sync
              </span>
            </div>

            <div className="space-y-4">
              {weeklySchedulePreview.map((item) => (
                <div key={item.day} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="rounded-full bg-apple-blue/10 px-3 py-1 text-sm font-semibold text-apple-blue">
                      {item.day}
                    </span>
                    <span className="text-sm text-apple-gray-500">依班級調整</span>
                  </div>
                  <h4 className="mb-2 text-lg font-bold text-apple-gray-900">
                    {item.workout}
                  </h4>
                  <p className="text-sm leading-6 text-apple-gray-600">{item.note}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
