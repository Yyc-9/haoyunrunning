import assert from 'node:assert/strict'
import test from 'node:test'
import { groupCoachDutySessions } from '../lib/coach-duty-sessions.ts'

test('same course session groups coaches without losing independent actions', () => {
  const first = { id: 'coach-a', courseSeasonCourseId: 'course-a', sessionDate: '2026-09-23', startTime: '19:27', canCheckIn: true }
  const second = { ...first, id: 'coach-b', canCheckIn: false }
  const groups = groupCoachDutySessions([first, second])
  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].items, [first, second])
  assert.notEqual(groups[0].items[0].canCheckIn, groups[0].items[1].canCheckIn)
})

test('different courses, dates, times and missing identifiers never merge accidentally', () => {
  const row = { id: '1', courseSeasonCourseId: 'a', sessionDate: '2026-09-23', startTime: '19:27' }
  assert.equal(groupCoachDutySessions([row, { ...row, id: '2', courseSeasonCourseId: 'b' }, { ...row, id: '3', sessionDate: '2026-09-24' }, { ...row, id: '4', startTime: '20:00' }, { ...row, id: '5', courseSeasonCourseId: undefined }, { ...row, id: '6', courseSeasonCourseId: undefined }]).length, 6)
  assert.deepEqual(groupCoachDutySessions([]), [])
  assert.equal(groupCoachDutySessions([row]).length, 1)
})
