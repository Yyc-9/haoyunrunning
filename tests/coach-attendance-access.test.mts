import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import {
  allowedSessionDateSet,
  canAccessCoachAssignment,
  filterCourseEnrollmentsByAccess,
  filterCourseMakeupsBySessionAccess,
  filterRowsBySessionAccess,
} from '../lib/coach-attendance-access.ts'

test('coach attendance includes assigned courses hidden from public enrollment', () => {
  const source = readFileSync(new URL('../app/api/coach/attendance/route.ts', import.meta.url), 'utf8')
  assert.match(source, /applyCourseOverrides\(season\.courseOverrides, \{ onlyConfigured: true, includeInactive: true \}\)/)
})

test('old regular assignment no longer grants access after a coach replacement', () => {
  const assignment = { scheduled_coach_id: 'old', actual_coach_id: 'old', substitute_coach_id: null, recommended_substitute_id: null }
  assert.equal(canAccessCoachAssignment(assignment, 'old', false), false)
  assert.equal(canAccessCoachAssignment(assignment, 'old', true), true)
  assert.equal(canAccessCoachAssignment(assignment, 'other', true), false)
})

test('substitute assignment remains accessible without granting regular course ownership', () => {
  const assignment = { scheduled_coach_id: 'regular', actual_coach_id: 'substitute', substitute_coach_id: 'substitute', recommended_substitute_id: 'candidate' }
  assert.equal(canAccessCoachAssignment(assignment, 'substitute', false), true)
  assert.equal(canAccessCoachAssignment(assignment, 'candidate', false), true)
  assert.equal(canAccessCoachAssignment(assignment, 'unrelated', false), false)
})

const access = allowedSessionDateSet([
  { courseSeasonCourseId: 'course-a', sessionDates: ['2026-09-08'] },
  { courseSeasonCourseId: 'course-b', sessionDates: ['2026-09-09', '2026-09-16'] },
])

test('attendance rows and cancellations only expose the assigned session dates', () => {
  const rows = [
    { course_season_course_id: 'course-a', session_date: '2026-09-08', id: 'allowed' },
    { course_season_course_id: 'course-a', session_date: '2026-09-15', id: 'other-date' },
    { course_season_course_id: 'course-c', session_date: '2026-09-08', id: 'other-course' },
  ]

  assert.deepEqual(filterRowsBySessionAccess(rows, access).map((row) => row.id), ['allowed'])
})

test('makeup access is based on target session and does not expand the original season', () => {
  const rows = [
    { id: 'allowed', target_course_season_course_id: 'course-b', target_session_date: '2026-09-09' },
    { id: 'other-date', target_course_season_course_id: 'course-b', target_session_date: '2026-09-23' },
    { id: 'unassigned', target_course_season_course_id: null, target_session_date: null },
  ]

  assert.deepEqual(filterCourseMakeupsBySessionAccess(rows, access).map((row) => row.id), ['allowed'])
})

test('regular enrollments stay within allowed classes while permitted makeups add only their student', () => {
  const rows = [
    { id: 'regular', season_id: 'season-1', course_slug: 'course-a' },
    { id: 'makeup', season_id: 'season-1', course_slug: 'course-c' },
    { id: 'other', season_id: 'season-1', course_slug: 'course-c' },
  ]

  assert.deepEqual(
    filterCourseEnrollmentsByAccess(rows, new Set(['season-1:course-a']), new Set(['makeup'])).map((row) => row.id),
    ['regular', 'makeup'],
  )
})
