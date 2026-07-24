import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ATTENDANCE_ACCEPTANCE_TEST,
  acceptanceTestPhase,
  canSubmitAcceptanceCheckIn,
} from '../lib/attendance-acceptance-test.ts'

test('7 月 25 日 09:00 至 12:00（UTC+8）完整開放測試簽到', () => {
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T00:59:59.999Z')), 'upcoming')
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T01:00:00.000Z')), 'open')
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T04:00:00.000Z')), 'open')
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T04:00:00.001Z')), 'closed')
})

test('只有未簽到者能在開放時段提交一次測試簽到', () => {
  const openTime = new Date('2026-07-25T02:30:00.000Z')
  assert.equal(canSubmitAcceptanceCheckIn({ now: openTime, alreadyCheckedIn: false }), true)
  assert.equal(canSubmitAcceptanceCheckIn({ now: openTime, alreadyCheckedIn: true }), false)
  assert.equal(canSubmitAcceptanceCheckIn({ now: new Date('2026-07-25T04:00:00.001Z'), alreadyCheckedIn: false }), false)
})

test('測試紀錄有固定測試編號且不偽裝成正式課程', () => {
  assert.equal(ATTENDANCE_ACCEPTANCE_TEST.key, 'attendance-acceptance-2026-07-25')
  assert.equal(ATTENDANCE_ACCEPTANCE_TEST.courseName, '網站驗收測試')
  assert.equal(ATTENDANCE_ACCEPTANCE_TEST.timeZoneLabel, 'UTC+8')
})
