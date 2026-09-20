import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeWeekday, sortCourses } from '../lib/course-sort.ts'

test('weekday grouping accepts the published and editor weekday formats', () => {
  for (const value of ['週一', '周一', '星期一', ' 星期一 ']) assert.equal(normalizeWeekday(value), '週一')
  for (const value of ['週日', '周天', '星期日', '星期天']) assert.equal(normalizeWeekday(value), '週日')
  assert.equal(normalizeWeekday('待確認'), '待確認')
})

test('mixed weekday formats retain chronological course order', () => {
  const courses = [
    { name: 'Sunday', weekday: '星期天', location: '竹北', classTime: '09:00' },
    { name: 'Wednesday', weekday: '週三', location: '竹北', classTime: '19:00' },
    { name: 'Monday late', weekday: '周一', location: '竹北', classTime: '20:00' },
    { name: 'Monday early', weekday: '星期一', location: '竹北', classTime: '18:00' },
  ]
  assert.deepEqual(sortCourses(courses).map(course => course.name), ['Monday early', 'Monday late', 'Wednesday', 'Sunday'])
  assert.equal(courses[0].name, 'Sunday')
})
