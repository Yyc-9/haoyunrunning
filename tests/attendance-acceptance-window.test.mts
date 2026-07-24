import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ATTENDANCE_ACCEPTANCE_TEST,
  acceptanceTestPhase,
  canSubmitAcceptanceCheckIn,
} from '../lib/attendance-acceptance-test.ts'

test('暫停驗收測試後，正式網站不顯示入口也不接受簽到', () => {
  assert.equal(ATTENDANCE_ACCEPTANCE_TEST.enabled, false)
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T02:30:00.000Z')), 'hidden')
  assert.equal(canSubmitAcceptanceCheckIn({
    now: new Date('2026-07-25T02:30:00.000Z'),
    alreadyCheckedIn: false,
  }), false)
})

test('測試時段規則仍可在未來重新啟用，不需重建資料結構', () => {
  const enabledTest = { ...ATTENDANCE_ACCEPTANCE_TEST, enabled: true }
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T00:59:59.999Z'), enabledTest), 'upcoming')
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T01:00:00.000Z'), enabledTest), 'open')
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T04:00:00.000Z'), enabledTest), 'open')
  assert.equal(acceptanceTestPhase(new Date('2026-07-25T04:00:00.001Z'), enabledTest), 'closed')
})

test('重新啟用後，只有未簽到者能在開放時段提交一次', () => {
  const enabledTest = { ...ATTENDANCE_ACCEPTANCE_TEST, enabled: true }
  const openTime = new Date('2026-07-25T02:30:00.000Z')
  assert.equal(canSubmitAcceptanceCheckIn({ now: openTime, alreadyCheckedIn: false, test: enabledTest }), true)
  assert.equal(canSubmitAcceptanceCheckIn({ now: openTime, alreadyCheckedIn: true, test: enabledTest }), false)
  assert.equal(canSubmitAcceptanceCheckIn({ now: new Date('2026-07-25T04:00:00.001Z'), alreadyCheckedIn: false, test: enabledTest }), false)
})

test('測試紀錄有固定測試編號且不偽裝成正式課程', () => {
  assert.equal(ATTENDANCE_ACCEPTANCE_TEST.key, 'attendance-acceptance-2026-07-25')
  assert.equal(ATTENDANCE_ACCEPTANCE_TEST.courseName, '網站驗收測試')
  assert.equal(ATTENDANCE_ACCEPTANCE_TEST.timeZoneLabel, 'UTC+8')
})
