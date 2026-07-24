import assert from 'node:assert/strict'
import test from 'node:test'

import {
  nearestUpcomingCourseSession,
  validateMakeupTarget,
} from '../lib/course-attendance.ts'

test('請假只能鎖定最近一堂尚未開始且未停課的課次', () => {
  const nearest = nearestUpcomingCourseSession(
    ['2026-07-06', '2026-07-13', '2026-07-20'],
    '19:00',
    new Set(['2026-07-13']),
    new Date('2026-07-07T04:00:00.000Z'),
  )

  assert.equal(nearest, '2026-07-20')
})

test('補課必須是本季度其他班級且晚於原請假課次', () => {
  const base = {
    seasonId: 'season-q3',
    seasonEndsOn: '2026-09-30',
    homeCourseId: 'course-monday',
    originalSessionDate: '2026-07-13',
    originalClassTime: '19:00',
    targetCourse: {
      seasonId: 'season-q3',
      courseId: 'course-tuesday',
      sessionDates: ['2026-07-14', '2026-07-21'],
      classTime: '19:00',
    },
    targetSessionDate: '2026-07-14',
    cancelled: false,
    now: new Date('2026-07-13T04:00:00.000Z'),
  } as const

  assert.deepEqual(validateMakeupTarget(base), { valid: true })
  assert.match(
    validateMakeupTarget({
      ...base,
      targetCourse: { ...base.targetCourse, courseId: 'course-monday' },
    }).message ?? '',
    /其他班級/,
  )
  assert.match(
    validateMakeupTarget({
      ...base,
      targetSessionDate: '2026-07-12',
      targetCourse: {
        ...base.targetCourse,
        sessionDates: ['2026-07-12'],
      },
    }).message ?? '',
    /原請假課次之後/,
  )
})

test('補課不可超過季度、選擇已開始或停課的課次', () => {
  const base = {
    seasonId: 'season-q3',
    seasonEndsOn: '2026-09-30',
    homeCourseId: 'course-monday',
    originalSessionDate: '2026-07-13',
    originalClassTime: '19:00',
    targetCourse: {
      seasonId: 'season-q3',
      courseId: 'course-tuesday',
      sessionDates: ['2026-10-06'],
      classTime: '19:00',
    },
    targetSessionDate: '2026-10-06',
    cancelled: false,
    now: new Date('2026-07-13T04:00:00.000Z'),
  } as const

  assert.match(validateMakeupTarget(base).message ?? '', /季度結束日/)
  assert.match(validateMakeupTarget({
    ...base,
    seasonEndsOn: '2026-10-31',
    targetSessionDate: '2026-07-14',
    targetCourse: { ...base.targetCourse, sessionDates: ['2026-07-14'] },
    now: new Date('2026-07-14T12:00:00.000Z'),
  }).message ?? '', /尚未開始/)
  assert.match(validateMakeupTarget({
    ...base,
    seasonEndsOn: '2026-10-31',
    cancelled: true,
  }).message ?? '', /停課/)
})
