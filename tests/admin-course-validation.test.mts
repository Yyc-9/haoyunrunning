import assert from 'node:assert/strict'
import test from 'node:test'
import { courseBillingInputError } from '../lib/admin-course-validation.ts'
import { defaultCourseBillingConfig, normalizeCourseBillingConfig } from '../lib/course-pricing.ts'

test('administrator billing rejects impossible calendar dates instead of publishing a different schedule', () => {
  const config = { ...defaultCourseBillingConfig(), scheduleReady: true, sessionDates: ['2026-02-30'] }
  assert.ok(courseBillingInputError(config))
  assert.equal(courseBillingInputError({ ...config, sessionDates: ['2028-02-29'] }), null)
  assert.ok(courseBillingInputError({ ...config, sessionDates: ['2026-13-01'] }))
})
test('zero prices persist while invalid amounts and rule boundaries are rejected', () => {
  const config = { ...defaultCourseBillingConfig(), newFullPrice: 0, returningLateRate: 0 }
  assert.equal(courseBillingInputError(config), null)
  assert.equal(normalizeCourseBillingConfig(config, defaultCourseBillingConfig()).newFullPrice, 0)
  for (const change of [{ priceLockHours: 0 }, { regularUntilSessionNumber: 21 }, { newFullPrice: -1 }, { newFullPrice: 0.5 }]) assert.ok(courseBillingInputError({ ...config, ...change }))
})
