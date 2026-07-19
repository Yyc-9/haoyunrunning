'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const TAIPEI_TIME_ZONE = 'Asia/Taipei'
const TAIPEI_UTC_OFFSET_MS = 8 * 60 * 60 * 1000

const weekdayLogos = {
  Mon: {
    src: '/brand/weekday-logos/monday-red.png',
    label: '週一紅色',
  },
  Tue: {
    src: '/brand/weekday-logos/tuesday-orange.png',
    label: '週二橙色',
  },
  Wed: {
    src: '/brand/weekday-logos/wednesday-yellow.png',
    label: '週三黃色',
  },
  Thu: {
    src: '/brand/weekday-logos/thursday-green.png',
    label: '週四綠色',
  },
  Fri: {
    src: '/brand/weekday-logos/friday-cyan.png',
    label: '週五青色',
  },
  Sat: {
    src: '/brand/weekday-logos/saturday-blue.png',
    label: '週六藍色',
  },
  Sun: {
    src: '/brand/weekday-logos/sunday-purple.png',
    label: '週日紫色',
  },
} as const

type WeekdayKey = keyof typeof weekdayLogos

const taipeiWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TAIPEI_TIME_ZONE,
  weekday: 'short',
})

const taipeiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TAIPEI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function getTaipeiWeekdayKey(date = new Date()): WeekdayKey {
  const weekday = taipeiWeekdayFormatter.format(date) as WeekdayKey
  return weekday in weekdayLogos ? weekday : 'Mon'
}

function millisecondsUntilNextTaipeiDay(date = new Date()) {
  const parts = Object.fromEntries(
    taipeiDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  )
  const nextTaipeiMidnight =
    Date.UTC(parts.year, parts.month - 1, parts.day + 1) - TAIPEI_UTC_OFFSET_MS

  return Math.max(1000, nextTaipeiMidnight - date.getTime() + 250)
}

export default function WeekdayLogo({ brandName }: { brandName: string }) {
  const [weekdayKey, setWeekdayKey] = useState<WeekdayKey>(() => getTaipeiWeekdayKey())
  const logo = weekdayLogos[weekdayKey]

  useEffect(() => {
    let timeoutId: number | undefined

    const scheduleNextChange = () => {
      setWeekdayKey(getTaipeiWeekdayKey())
      timeoutId = window.setTimeout(scheduleNextChange, millisecondsUntilNextTaipeiDay())
    }

    scheduleNextChange()

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <Image
      src={logo.src}
      alt={`${brandName} Logo`}
      title={`${logo.label} Logo`}
      data-weekday-logo={weekdayKey}
      fill
      sizes="40px"
      className="object-contain p-0.5"
      priority
    />
  )
}
