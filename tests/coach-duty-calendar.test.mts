import assert from 'node:assert/strict'
import test from 'node:test'
import {
  groupCoachDutyCalendarItems,
  selectCoachDutyCalendarDate,
} from '../lib/coach-duty-calendar.ts'

const items = [
  { id: 'late-course', sessionDate: '2026-07-27', startTime: '19:30' },
  { id: 'morning-course', sessionDate: '2026-07-27', startTime: '06:30' },
  { id: 'other-day', sessionDate: '2026-07-28', startTime: '19:00' },
]

test('calendar groups a date’s courses and sorts them by start time', () => {
  const grouped = groupCoachDutyCalendarItems(items)

  assert.deepEqual(
    grouped.get('2026-07-27')?.map((item) => item.id),
    ['morning-course', 'late-course'],
  )
})

test('clicking a date with courses opens its first course and clicking it again closes it', () => {
  const grouped = groupCoachDutyCalendarItems(items)

  assert.deepEqual(selectCoachDutyCalendarDate(grouped, '2026-07-27', ''), {
    selectedDate: '2026-07-27',
    selectedId: 'morning-course',
  })
  assert.deepEqual(selectCoachDutyCalendarDate(grouped, '2026-07-27', '2026-07-27'), {
    selectedDate: '',
    selectedId: '',
  })
})

test('clicking a date without courses does not open an empty popover', () => {
  const grouped = groupCoachDutyCalendarItems(items)

  assert.deepEqual(selectCoachDutyCalendarDate(grouped, '2026-07-29', ''), {
    selectedDate: '',
    selectedId: '',
  })
})
