import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canCoachRequestLeave,
  canCoachViewCheckInControl,
  coachDutyActionCoachId,
  coachDutyPunctuality,
  coachDutyWindow,
  resolveCoachDutyAttendanceState,
} from '../lib/coach-duty-policy.ts'
import { APP_TIME_ZONE_LABEL } from '../lib/app-time.ts'

test('所有可見時區名稱統一為 UTC+8', () => {
  assert.equal(APP_TIME_ZONE_LABEL, 'UTC+8')
})

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

test('原定教練申請請假不受簽到時間窗限制', () => {
  const base = {
    cancelled: false,
    scheduledCoachId: 'coach-a',
    userId: 'coach-a',
    leaveStatus: 'none' as const,
    substituteResponse: 'none' as const,
    hasCheckin: false,
  }

  assert.equal(canCoachRequestLeave(base), true)
  assert.equal(canCoachRequestLeave({ ...base, hasCheckin: true }), false)
  assert.equal(canCoachRequestLeave({ ...base, cancelled: true }), false)
  assert.equal(canCoachRequestLeave({ ...base, userId: 'coach-b' }), false)
  assert.equal(canCoachRequestLeave({ ...base, userId: 'admin-a', isAdmin: true }), true)
  assert.equal(canCoachRequestLeave({ ...base, hasCheckin: true, userId: 'admin-a', isAdmin: true }), false)
})

test('實際授課教練可持續看到簽到控制，是否開放由時間窗另行決定', () => {
  const base = {
    cancelled: false,
    actualCoachId: 'coach-a',
    userId: 'coach-a',
    scheduledCoachId: 'coach-a',
    leaveStatus: 'none' as const,
  }

  assert.equal(canCoachViewCheckInControl(base), true)
  assert.equal(canCoachViewCheckInControl({ ...base, cancelled: true }), false)
  assert.equal(canCoachViewCheckInControl({ ...base, userId: 'coach-b' }), false)
  assert.equal(canCoachViewCheckInControl({ ...base, leaveStatus: 'approved' }), false)
  assert.equal(canCoachViewCheckInControl({ ...base, userId: 'admin-a', isAdmin: true }), true)
  assert.equal(canCoachViewCheckInControl({
    ...base,
    actualCoachId: 'coach-b',
    leaveStatus: 'approved',
    userId: 'admin-a',
    isAdmin: true,
  }), true)
})

test('管理員可操作任一課次，但簽到與請假仍寫入該堂對應教練', () => {
  const assignment = {
    actualCoachId: 'actual-coach',
    scheduledCoachId: 'scheduled-coach',
  }

  assert.equal(coachDutyActionCoachId({
    ...assignment,
    action: 'check_in',
    isAdmin: true,
    userId: 'admin-a',
  }), 'actual-coach')
  assert.equal(coachDutyActionCoachId({
    ...assignment,
    action: 'request_leave',
    isAdmin: true,
    userId: 'admin-a',
  }), 'scheduled-coach')
  assert.equal(coachDutyActionCoachId({
    ...assignment,
    action: 'check_in',
    isAdmin: false,
    userId: 'other-coach',
  }), null)
  assert.equal(coachDutyActionCoachId({
    ...assignment,
    action: 'request_leave',
    isAdmin: false,
    userId: 'other-coach',
  }), null)
})
