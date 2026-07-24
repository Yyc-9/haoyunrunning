import assert from 'node:assert/strict'
import test from 'node:test'

import {
  coachDutyPunctuality,
  coachDutyWindow,
  resolveCoachDutyAttendanceState,
} from '../lib/coach-duty-policy.ts'

test('教練本人簽到於課前十五分鐘開放並於課後十五分鐘關閉', () => {
  const window = coachDutyWindow(
    '2026-07-14',
    '19:00',
    new Date('2026-07-14T10:45:00.000Z'),
  )

  assert.equal(window.opensAt?.toISOString(), '2026-07-14T10:45:00.000Z')
  assert.equal(window.startsAt?.toISOString(), '2026-07-14T11:00:00.000Z')
  assert.equal(window.closesAt?.toISOString(), '2026-07-14T11:15:00.000Z')
  assert.equal(window.phase, 'open')
})

test('開課前為準時，開課後十五分鐘內為遲到', () => {
  assert.equal(
    coachDutyPunctuality('2026-07-14', '19:00', new Date('2026-07-14T10:59:00.000Z')),
    'on_time',
  )
  assert.equal(
    coachDutyPunctuality('2026-07-14', '19:00', new Date('2026-07-14T11:01:00.000Z')),
    'late',
  )
  assert.equal(
    coachDutyPunctuality('2026-07-14', '19:00', new Date('2026-07-14T11:16:00.000Z')),
    null,
  )
})

test('停課、缺少時間、請假及代班未到各自保留不同事實', () => {
  const base = {
    sessionDate: '2026-07-14',
    startTime: '19:00',
    now: new Date('2026-07-14T11:16:00.000Z'),
    checkedInPunctuality: null,
    leaveApproved: false,
    hasActualCoach: true,
    isSubstitute: false,
    cancelled: false,
  } as const

  assert.equal(resolveCoachDutyAttendanceState({ ...base, cancelled: true }), 'cancelled')
  assert.equal(resolveCoachDutyAttendanceState({ ...base, startTime: '' }), 'missing_start_time')
  assert.equal(resolveCoachDutyAttendanceState({
    ...base,
    leaveApproved: true,
    hasActualCoach: false,
  }), 'leave_approved')
  assert.equal(resolveCoachDutyAttendanceState({ ...base, isSubstitute: true }), 'substitute_absent')
  assert.equal(resolveCoachDutyAttendanceState(base), 'not_checked_in')
})
