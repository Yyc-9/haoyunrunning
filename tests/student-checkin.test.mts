import test from 'node:test'
import assert from 'node:assert/strict'
import { studentCheckinOpen, attendanceVerification } from '../lib/student-checkin.ts'

test('正式學員簽到只在課前後15分鐘且需有效時間', () => {
  assert.equal(studentCheckinOpen('2026-09-18','19:00',new Date('2026-09-18T18:44:59+08:00')),false)
  assert.equal(studentCheckinOpen('2026-09-18','19:00',new Date('2026-09-18T18:45:00+08:00')),true)
  assert.equal(studentCheckinOpen('2026-09-18','19:00',new Date('2026-09-18T19:15:00+08:00')),true)
  assert.equal(studentCheckinOpen('2026-09-18','19:00',new Date('2026-09-18T19:15:01+08:00')),false)
  assert.equal(studentCheckinOpen('2026-09-18','',new Date()),false)
})
test('雙重核實保留單方與矛盾狀態，不把未確認當缺席', () => {
  assert.equal(attendanceVerification(true,'present'),'雙方已確認')
  assert.equal(attendanceVerification(true),'學員已簽到，待教練確認')
  assert.equal(attendanceVerification(false,'present'),'教練已確認，學員未簽到')
  assert.equal(attendanceVerification(true,'excused'),'紀錄不一致，待核對')
  assert.equal(attendanceVerification(false),'尚未雙重確認')
})
