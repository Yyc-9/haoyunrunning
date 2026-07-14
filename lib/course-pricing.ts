export type CourseBillingConfig = {
  scheduleReady: boolean
  sessionDates: string[]
  returningFullPrice: number
  newFullPrice: number
  returningLateRate: number
  referredLateRate: number
  standardLateRate: number
  regularUntilSessionNumber: number
  priceLockHours: number
}

export type CourseRegistrationQuote = {
  studentType: 'returning' | 'new'
  enrollmentTiming: 'regular' | 'late'
  billingStartSessionDate: string
  billingStartSessionNumber: number
  priorAttendanceClaimed: boolean
  attendanceVerificationStatus: 'not_required' | 'pending'
  amount: number
  amountText: string
  totalSessionCount: number
  chargedSessionCount: number
  chargedSessionDates: string[]
  unitRate: number | null
  fullPriceCap: number
  referrerStatus: 'not_applicable' | 'not_provided' | 'verified' | 'not_verified'
  calculatedAt: string
  lockedUntil: string
}

export type CourseStartSessionOption = {
  date: string
  sessionNumber: number
  remainingSessionCount: number
}

export type CoursePricingOptions = {
  today: string
  courseStarted: boolean
  selectionRequired: boolean
  automaticStartSessionDate: string | null
  availableStartSessions: CourseStartSessionOption[]
  priorAttendanceSession: CourseStartSessionOption | null
}

type CourseScheduleSource = {
  period?: string
  weekday?: string
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/

function positiveInteger(value: unknown, fallback: number, minimum = 1, maximum = 1_000_000) {
  const number = Number(value)
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback
}

function dateKeyInTaipei(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function isoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

export function buildWeeklySessionDates(period = '', seasonCode = '') {
  const matches = [...period.matchAll(/(\d{1,2})\s*\/\s*(\d{1,2})/g)]
  if (matches.length < 2) return []

  const year = Number(/^([0-9]{4})/.exec(seasonCode)?.[1] ?? new Date().getFullYear())
  const startMonth = Number(matches[0][1])
  const startDay = Number(matches[0][2])
  const endMonth = Number(matches[1][1])
  const endDay = Number(matches[1][2])
  const endYear = endMonth < startMonth ? year + 1 : year
  const start = new Date(`${isoDate(year, startMonth, startDay)}T00:00:00Z`)
  const end = new Date(`${isoDate(endYear, endMonth, endDay)}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const dates: string[] = []
  for (const cursor = new Date(start); cursor <= end && dates.length < 60; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    dates.push(cursor.toISOString().slice(0, 10))
  }
  return dates
}

export function defaultCourseBillingConfig(course: CourseScheduleSource = {}, seasonCode = ''): CourseBillingConfig {
  const sessionDates = buildWeeklySessionDates(course.period, seasonCode)
  return {
    scheduleReady: sessionDates.length > 0,
    sessionDates,
    returningFullPrice: sessionDates.length * 450,
    newFullPrice: sessionDates.length * 500,
    returningLateRate: 450,
    referredLateRate: 450,
    standardLateRate: 500,
    regularUntilSessionNumber: 2,
    priceLockHours: 24,
  }
}

export function normalizeCourseBillingConfig(value: unknown, fallback: CourseBillingConfig): CourseBillingConfig {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const hasScheduleReady = typeof source.scheduleReady === 'boolean'
  const sessionDates = Array.isArray(source.sessionDates)
    ? [...new Set(source.sessionDates.filter((date): date is string => typeof date === 'string' && datePattern.test(date)))].sort()
    : fallback.sessionDates
  const scheduleReady = hasScheduleReady ? source.scheduleReady === true : sessionDates.length > 0

  return {
    scheduleReady,
    sessionDates: scheduleReady ? sessionDates : [],
    returningFullPrice: positiveInteger(source.returningFullPrice, fallback.returningFullPrice),
    newFullPrice: positiveInteger(source.newFullPrice, fallback.newFullPrice),
    returningLateRate: positiveInteger(source.returningLateRate, fallback.returningLateRate),
    referredLateRate: positiveInteger(source.referredLateRate, fallback.referredLateRate),
    standardLateRate: positiveInteger(source.standardLateRate, fallback.standardLateRate),
    regularUntilSessionNumber: positiveInteger(source.regularUntilSessionNumber, fallback.regularUntilSessionNumber, 1, 20),
    priceLockHours: positiveInteger(source.priceLockHours, fallback.priceLockHours, 1, 168),
  }
}

export function formatTwd(amount: number) {
  return `NT$${Math.max(0, Math.round(amount)).toLocaleString('en-US')}`
}

function sessionOption(config: CourseBillingConfig, date: string): CourseStartSessionOption {
  const index = config.sessionDates.indexOf(date)
  return {
    date,
    sessionNumber: index + 1,
    remainingSessionCount: config.sessionDates.length - index,
  }
}

export function getCoursePricingOptions(config: CourseBillingConfig | undefined, now = new Date()): CoursePricingOptions {
  if (!config?.scheduleReady || config.sessionDates.length === 0) {
    throw new Error('本班尚未完成收費課次設定，請聯絡管理員。')
  }

  const today = dateKeyInTaipei(now)
  const firstSessionDate = config.sessionDates[0]
  const courseStarted = today > firstSessionDate
  const availableStartSessions = config.sessionDates
    .filter((date) => date >= today)
    .map((date) => sessionOption(config, date))
  const priorDate = [...config.sessionDates].reverse().find((date) => date < today)

  return {
    today,
    courseStarted,
    selectionRequired: courseStarted,
    automaticStartSessionDate: courseStarted ? null : firstSessionDate,
    availableStartSessions,
    priorAttendanceSession: courseStarted && priorDate ? sessionOption(config, priorDate) : null,
  }
}

export function calculateCourseRegistrationQuote(options: {
  config: CourseBillingConfig
  isReturning: boolean
  referrerProvided: boolean
  referrerVerified: boolean
  billingStartSessionDate?: string
  priorAttendanceClaimed?: boolean
  now?: Date
}): CourseRegistrationQuote {
  const { config } = options
  if (!config?.scheduleReady || config.sessionDates.length === 0) {
    throw new Error('本班尚未完成收費課次設定，請聯絡管理員。')
  }

  const now = options.now ?? new Date()
  const pricingOptions = getCoursePricingOptions(config, now)
  const today = pricingOptions.today
  const priorAttendanceClaimed = options.priorAttendanceClaimed === true
  const billingStartSessionDate = options.billingStartSessionDate || pricingOptions.automaticStartSessionDate || ''
  const billingStartIndex = config.sessionDates.indexOf(billingStartSessionDate)

  if (billingStartIndex < 0) {
    throw new Error('請選擇正確的本期計費起始課次。')
  }
  if (pricingOptions.selectionRequired && !options.billingStartSessionDate) {
    throw new Error('課程已開始，請選擇本期計費起始課次。')
  }
  if (priorAttendanceClaimed) {
    if (pricingOptions.priorAttendanceSession?.date !== billingStartSessionDate) {
      throw new Error('補繳只能選擇最近一堂已結束的課次。')
    }
  } else if (billingStartSessionDate < today) {
    throw new Error('過去的課次必須申明已到課補繳。')
  }

  const enrollmentTiming = billingStartIndex === 0 ? 'regular' : 'late'
  const studentType = options.isReturning ? 'returning' : 'new'
  const fullPriceCap = options.isReturning ? config.returningFullPrice : config.newFullPrice

  let unitRate: number | null = null
  let amount = fullPriceCap
  let chargedSessionDates = config.sessionDates
  let referrerStatus: CourseRegistrationQuote['referrerStatus'] = 'not_applicable'

  if (enrollmentTiming === 'late') {
    chargedSessionDates = config.sessionDates.slice(billingStartIndex)
    if (options.isReturning) {
      unitRate = config.returningLateRate
    } else if (options.referrerVerified) {
      unitRate = config.referredLateRate
      referrerStatus = 'verified'
    } else {
      unitRate = config.standardLateRate
      referrerStatus = options.referrerProvided ? 'not_verified' : 'not_provided'
    }
    amount = Math.min(unitRate * chargedSessionDates.length, fullPriceCap)
  }

  const calculatedAt = now.toISOString()
  const lockedUntil = new Date(now.getTime() + config.priceLockHours * 60 * 60 * 1000).toISOString()

  return {
    studentType,
    enrollmentTiming,
    billingStartSessionDate,
    billingStartSessionNumber: billingStartIndex + 1,
    priorAttendanceClaimed,
    attendanceVerificationStatus: priorAttendanceClaimed ? 'pending' : 'not_required',
    amount,
    amountText: formatTwd(amount),
    totalSessionCount: config.sessionDates.length,
    chargedSessionCount: chargedSessionDates.length,
    chargedSessionDates,
    unitRate,
    fullPriceCap,
    referrerStatus,
    calculatedAt,
    lockedUntil,
  }
}
