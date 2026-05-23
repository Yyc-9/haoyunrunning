'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, CalendarDays, PartyPopper, UsersRound } from 'lucide-react'
import { recentActivities } from '@/lib/goodluck-data'
import { useLanguage } from '@/app/language-context'

const icons = [PartyPopper, UsersRound]

export default function UpcomingActivitiesSection() {
  const { t } = useLanguage()

  return (
    <section className="py-20 bg-apple-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              {t.homeUpdates.label}
            </p>
            <h2 className="text-3xl font-bold text-apple-gray-900 md:text-4xl">
              {t.homeUpdates.title}
            </h2>
          </motion.div>
          <p className="max-w-2xl text-lg text-apple-gray-600">
            {t.homeUpdates.description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {recentActivities.map((activity, index) => {
            const Icon = icons[index] ?? CalendarDays
            const isExternal = activity.href.startsWith('http')
            const content = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -6 }}
                className="h-full rounded-3xl border border-apple-gray-200 bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-md"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue to-apple-orange">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-apple-gray-900">
                  {t.homeUpdates.activities[index]?.title ?? activity.title}
                </h3>
                <p className="mb-8 text-apple-gray-600">{t.homeUpdates.activities[index]?.description ?? activity.description}</p>
                <div className="inline-flex items-center text-sm font-semibold text-apple-blue">
                  {t.homeUpdates.activities[index]?.action ?? activity.action}
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </div>
              </motion.div>
            )

            return isExternal ? (
              <a
                key={activity.title}
                href={activity.href}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {content}
              </a>
            ) : (
              <Link key={activity.title} href={activity.href} className="block">
                {content}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
