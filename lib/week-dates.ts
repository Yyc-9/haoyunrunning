import type { Language } from '@/lib/dictionary'

export const APP_TIME_ZONE = 'Asia/Taipei'

export type WeekStatus = 'this' | 'next' | 'past' | 'future'

const weekdayLabels: Record<Language, string[]> = {
  'zh-CN': ['一', '二', '三', '四', '五', '六', '日'],
  'zh-TW': ['一', '二', '三', '四', '五', '六', '日'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

const shortWeekdayLabels: Record<Language, string[]> = {
  'zh-CN': ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  'zh-TW': ['週一', '週二', '週三', '週四', '週五', '週六', '週日'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

const statusLabels: Record<Language, Record<WeekStatus, string>> = {
  'zh-CN': {
    this: '本周',
    next: '下一周',
    past: '历史周',
    future: '未来周',
  },
  'zh-TW': {
    this: '本週',
    next: '下週',
    past: '歷史週',
    future: '未來週',
  },
  en: {
    this: 'This week',
    next: 'Next week',
    past: 'Past week',
    future: 'Future week',
  },
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function parseIsoDate(dateText: string) {
  const [year, month, day] = dateText.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function getTaipeiIsoDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

function normalizeDateInput(date: Date | string) {
  return typeof date === 'string' ? date.slice(0, 10) : getTaipeiIsoDate(date)
}

export function addDays(dateText: string, offset: number) {
  const date = parseIsoDate(dateText)
  date.setUTCDate(date.getUTCDate() + offset)
  return formatIsoDate(date)
}

export function getWeekdayIndex(date: Date | string) {
  const isoDate = normalizeDateInput(date)
  const day = parseIsoDate(isoDate).getUTCDay()
  return (day + 6) % 7
}

export function getMondayOfWeek(date: Date | string = new Date()) {
  const isoDate = normalizeDateInput(date)
  return addDays(isoDate, -getWeekdayIndex(isoDate))
}

export function getSundayOfWeek(date: Date | string = new Date()) {
  return addDays(getMondayOfWeek(date), 6)
}

export function getWeekRange(date: Date | string = new Date()) {
  const weekStart = getMondayOfWeek(date)
  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
  }
}

export function getTodayInfo(date: Date = new Date(), language: Language = 'zh-CN') {
  const todayIso = getTaipeiIsoDate(date)
  const { weekStart, weekEnd } = getWeekRange(todayIso)
  const weekdayIndex = getWeekdayIndex(todayIso)

  return {
    todayIso,
    weekStart,
    weekEnd,
    weekdayIndex,
    weekdayLabel: shortWeekdayLabels[language][weekdayIndex],
  }
}

export function isToday(date: Date | string, today: Date | string = new Date()) {
  return normalizeDateInput(date) === normalizeDateInput(today)
}

export function getWeekStatus(weekStart: string, today: Date | string = new Date()): WeekStatus {
  const currentWeekStart = getMondayOfWeek(today)
  const nextWeekStart = addDays(currentWeekStart, 7)

  if (weekStart === currentWeekStart) return 'this'
  if (weekStart === nextWeekStart) return 'next'
  if (weekStart < currentWeekStart) return 'past'
  return 'future'
}

export function getWeekStatusLabel(status: WeekStatus, language: Language = 'zh-CN') {
  return statusLabels[language][status]
}

export function formatDateWithWeekday(dateText: string, language: Language = 'zh-CN') {
  const index = getWeekdayIndex(dateText)
  const date = parseIsoDate(dateText)

  if (language === 'en') {
    return `${weekdayLabels.en[index]}, ${date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  }

  const slashDate = `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}`
  return `${slashDate}（${weekdayLabels[language][index]}）`
}

export function formatWeekRange(weekStart: string, language: Language = 'zh-CN') {
  const weekEnd = addDays(weekStart, 6)
  return `${formatDateWithWeekday(weekStart, language)} – ${formatDateWithWeekday(weekEnd, language)}`
}

export function formatShortWeekRange(weekStart: string) {
  const start = weekStart.replaceAll('-', '/')
  const end = addDays(weekStart, 6).replaceAll('-', '/')
  return `${start}–${end}`
}

export function formatTodayLabel(today: Date | string = new Date(), language: Language = 'zh-CN') {
  const todayIso = normalizeDateInput(today)
  const prefix = language === 'zh-TW' ? '今日是' : language === 'en' ? 'Today is' : '今天是'
  return `${prefix} ${formatDateWithWeekday(todayIso, language)}`
}

export function formatCoachWeekTitle(weekStart: string, language: Language = 'zh-CN') {
  const date = parseIsoDate(weekStart)

  if (language === 'en') {
    return `Week of ${date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`
  }

  const weekText = language === 'zh-TW' ? '這一週' : '这一周'
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日${weekText}`
}

export function formatWeekSwitchLabel(label: string, weekStart: string) {
  return `${label}：${formatShortWeekRange(weekStart)}`
}
