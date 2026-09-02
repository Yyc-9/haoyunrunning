'use client'

import Link from 'next/link'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { ArrowUpRight, CalendarDays, PartyPopper, UsersRound, type LucideIcon } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'
import type { HomeActivity } from '@/lib/site-content'

const icons = [PartyPopper, UsersRound]
const ENTRANCE_EASE = [0.16, 1, 0.3, 1] as const

type ActivityCardProps = {
  activity: HomeActivity
  icon: LucideIcon
  index: number
}

function ActivityCard({ activity, icon: Icon, index }: ActivityCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springRotateX = useSpring(rotateX, { stiffness: 180, damping: 22, mass: 0.8 })
  const springRotateY = useSpring(rotateY, { stiffness: 180, damping: 22, mass: 0.8 })
  const isExternal = activity.href.startsWith('http')

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (prefersReducedMotion || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    rotateX.set(y * -3)
    rotateY.set(x * 4)
  }

  const resetTilt = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  const content = (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.28 }}
      transition={prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.62, delay: index * 0.08, ease: ENTRANCE_EASE }}
      style={prefersReducedMotion
        ? undefined
        : { rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 900 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      className="relative h-full min-h-[238px] overflow-hidden rounded-3xl border border-apple-gray-200 bg-white p-7 shadow-sm transition-[border-color,box-shadow] duration-300 group-hover:border-apple-blue/35 group-hover:shadow-xl group-hover:shadow-black/10 group-focus-visible:border-apple-blue/40 group-focus-visible:shadow-xl group-focus-visible:shadow-black/10"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-[72px] -top-[76px] h-[180px] w-[180px] rounded-full transition-transform duration-300 group-hover:scale-125 group-focus-visible:scale-125 ${index % 2 === 0 ? 'bg-apple-blue/[0.07]' : 'bg-apple-orange/[0.09]'}`}
      />
      <div className="relative z-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue to-apple-orange shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 group-focus-visible:-rotate-3 group-focus-visible:scale-105">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="mb-3 text-xl font-bold text-apple-gray-900">
          {activity.title}
        </h3>
        <p className="mb-8 max-w-lg leading-7 text-apple-gray-600">{activity.description}</p>
        <div className="inline-flex items-center text-sm font-semibold text-apple-blue">
          {activity.action}
          <ArrowUpRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 group-focus-visible:translate-x-1 group-focus-visible:-translate-y-1" />
        </div>
      </div>
    </motion.article>
  )

  const linkClassName = 'group block rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-apple-blue/25'

  return isExternal ? (
    <a
      href={activity.href}
      target="_blank"
      rel="noreferrer"
      className={linkClassName}
      aria-label={`${activity.action}：${activity.title}`}
    >
      {content}
    </a>
  ) : (
    <Link
      href={activity.href}
      className={linkClassName}
      aria-label={`${activity.action}：${activity.title}`}
    >
      {content}
    </Link>
  )
}

export default function UpcomingActivitiesSection() {
  const { activities: recentActivities, home } = useSiteContent()
  const prefersReducedMotion = useReducedMotion()

  if (recentActivities.length === 0) return null

  return (
    <section id="updates" className="bg-apple-gray-100 py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: ENTRANCE_EASE }}
            viewport={{ once: true, amount: 0.35 }}
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              {home.activitiesLabel}
            </p>
            <h2 className="text-3xl font-bold text-apple-gray-900 md:text-4xl">
              {home.activitiesTitle}
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.08, ease: ENTRANCE_EASE }}
            viewport={{ once: true, amount: 0.35 }}
            className="max-w-2xl text-lg leading-8 text-apple-gray-600"
          >
            {home.activitiesDescription}
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {recentActivities.map((activity, index) => {
            const Icon = icons[index] ?? CalendarDays
            return <ActivityCard key={`${activity.title}-${activity.href}`} activity={activity} icon={Icon} index={index} />
          })}
        </div>
      </div>
    </section>
  )
}
