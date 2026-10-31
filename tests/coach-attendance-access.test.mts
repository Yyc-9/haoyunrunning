import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import {
  allowedSessionDateSet,
  canAccessCoachAssignment,
  filterCourseEnrollmentsByAccess,
  filterCourseMakeupsBySessionAccess,
  filterRowsBySessionAccess,
  isEnrollmentInAttendanceSession,
} from '../lib/coach-attendance-access.ts'

test('late enrollees appear only from their starting class onward, irrespective of payment or prior-attendance claims', () => {
  const late = { id: 'late', course_season_course_id: 'home', billing_start_session_date: '2026-10-15', status: 'pending_review', prior_attendance_claimed: true }
  assert.equal(isEnrollmentInAttendanceSession(late, 'home', '2026-10-08'), false)
  assert.equal(isEnrollmentInAttendanceSession(late, 'home', '2026-10-15'), true)
  assert.equal(isEnrollmentInAttendanceSession(late, 'home', '2026-10-22'), true)
  assert.equal(isEnrollmentInAttendanceSession({ ...late, status: 'approved' }, 'home', '2026-10-08'), false)
  assert.equal(isEnrollmentInAttendanceSession(late, 'home', ''), false)
})

test('session roster counts exclude late students before admission while preserving regular and explicit makeup students', () => {
  const rows = [
    { id: 'regular', course_season_course_id: 'home', billing_start_session_date: '2026-10-01' },
    { id: 'late', course_season_course_id: 'home', billing_start_session_date: '2026-10-15' },
    { id: 'makeup', course_season_course_id: 'other', billing_start_session_date: '2026-10-01' },
    { id: 'unrelated', course_season_course_id: 'other', billing_start_session_date: null },
  ]
  const roster = (date: string) => rows.filter(row => isEnrollmentInAttendanceSession(row, 'home', date, new Set(['makeup'])))
  assert.deepEqual(roster('2026-10-08').map(row => row.id), ['regular', 'makeup'])
  assert.deepEqual(roster('2026-10-15').map(row => row.id), ['regular', 'late', 'makeup'])
  assert.equal(isEnrollmentInAttendanceSession(rows[1], 'home', '2026-10-08', new Set(['late'])), false)
  assert.equal(isEnrollmentInAttendanceSession({ id:'legacy',course_season_course_id:'home',billing_start_session_date:null }, 'home', '2026-10-08'), true)
})

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
