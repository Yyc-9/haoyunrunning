'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ClipboardList, MessageSquareText, NotebookPen, UsersRound } from 'lucide-react'
import { useLanguage } from '@/app/language-context'

export default function RunnerPortalSection() {
  const { t } = useLanguage()
  const cards = [
    { icon: NotebookPen, ...t.runnerPortal.items[2] },
    { icon: ClipboardList, ...t.runnerPortal.items[1] },
    { icon: MessageSquareText, ...t.runnerPortal.items[3] },
    { icon: UsersRound, ...t.runnerPortal.items[0] },
  ]

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
              {t.runnerPortal.label}
            </p>
            <h2 className="mb-6 text-3xl font-bold text-apple-gray-900 md:text-4xl">
              {t.runnerPortal.title}
            </h2>
            <p className="mb-8 text-lg leading-8 text-apple-gray-600">
              {t.runnerPortal.description}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {cards.map((item) => (
                <div key={item.title} className="rounded-2xl border border-apple-gray-200 p-5">
                  <item.icon className="mb-4 h-6 w-6 text-apple-blue" />
                  <h3 className="mb-2 font-bold text-apple-gray-900">{item.title}</h3>
                  <p className="text-sm leading-6 text-apple-gray-600">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/student" className="apple-button-primary text-center">
                {t.runnerPortal.studentCenter}
              </Link>
              <Link href="/courses" className="apple-button-outline text-center">
                {t.runnerPortal.viewCourses}
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
                <p className="text-sm text-apple-gray-500">{t.runnerPortal.statusLabel}</p>
                <h3 className="text-2xl font-bold text-apple-gray-900">{t.runnerPortal.statusTitle}</h3>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-apple-blue shadow-sm">
                {t.runnerPortal.liveBadge}
              </span>
            </div>

            <div className="space-y-4">
              {t.runnerPortal.items.slice(0, 3).map((item) => (
                <div key={item.title} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="rounded-full bg-apple-blue/10 px-3 py-1 text-sm font-semibold text-apple-blue">
                      {t.runnerPortal.featureBadge}
                    </span>
                  </div>
                  <h4 className="mb-2 text-lg font-bold text-apple-gray-900">
                    {item.title}
                  </h4>
                  <p className="text-sm leading-6 text-apple-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
