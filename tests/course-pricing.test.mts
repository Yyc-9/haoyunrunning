import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateCourseRegistrationQuote,
  getCoursePricingOptions,
  type CourseBillingConfig,
} from '../lib/course-pricing.ts'

const billingConfig: CourseBillingConfig = {
  scheduleReady: true,
  sessionDates: ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27'],
  returningFullPrice: 1800,
  newFullPrice: 2000,
  returningLateRate: 450,
  referredLateRate: 450,
  standardLateRate: 500,
  regularUntilSessionNumber: 2,
  priceLockHours: 24,
}

test('開課前報名使用整季價格並自動從第一堂開始', () => {
  const quote = calculateCourseRegistrationQuote({
    config: billingConfig,
    isReturning: false,
    referrerProvided: false,
    referrerVerified: false,
    now: new Date('2026-07-01T04:00:00.000Z'),
  })

  assert.equal(quote.enrollmentTiming, 'regular')
  assert.equal(quote.billingStartSessionDate, '2026-07-06')
  assert.equal(quote.amount, 2000)
  assert.equal(quote.chargedSessionCount, 4)
  assert.equal(quote.lockedUntil, '2026-07-02T04:00:00.000Z')
})

test('開課後插班依剩餘課次與身分計價', () => {
  const returningQuote = calculateCourseRegistrationQuote({
    config: billingConfig,
    isReturning: true,
    referrerProvided: false,
    referrerVerified: false,
    billingStartSessionDate: '2026-07-20',
    now: new Date('2026-07-14T04:00:00.000Z'),
  })
  const referredNewQuote = calculateCourseRegistrationQuote({
    config: billingConfig,
    isReturning: false,
    referrerProvided: true,
    referrerVerified: true,
    billingStartSessionDate: '2026-07-20',
    now: new Date('2026-07-14T04:00:00.000Z'),
  })

  assert.equal(returningQuote.amount, 900)
  assert.equal(returningQuote.unitRate, 450)
  assert.equal(referredNewQuote.amount, 900)
  assert.equal(referredNewQuote.referrerStatus, 'verified')
})

test('補繳只能選擇最近一堂已結束課次並等待教練核實', () => {
  const options = getCoursePricingOptions(
    billingConfig,
    new Date('2026-07-21T04:00:00.000Z'),
  )

  assert.equal(options.priorAttendanceSession?.date, '2026-07-20')
  assert.throws(
    () => calculateCourseRegistrationQuote({
      config: billingConfig,
      isReturning: true,
      referrerProvided: false,
      referrerVerified: false,
      billingStartSessionDate: '2026-07-13',
      priorAttendanceClaimed: true,
      now: new Date('2026-07-21T04:00:00.000Z'),
    }),
    /最近一堂已結束/,
  )

  const quote = calculateCourseRegistrationQuote({
    config: billingConfig,
    isReturning: true,
    referrerProvided: false,
    referrerVerified: false,
    billingStartSessionDate: '2026-07-20',
    priorAttendanceClaimed: true,
    now: new Date('2026-07-21T04:00:00.000Z'),
  })
  assert.equal(quote.attendanceVerificationStatus, 'pending')
})
