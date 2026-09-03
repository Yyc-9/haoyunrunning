import assert from 'node:assert/strict'
import test from 'node:test'

import { displayCourseLocation, displayCourseTime } from '../lib/course-sort.ts'
import { formatCourseWeekday } from '../lib/course-weekday.ts'

test('課程星期顯示使用完整名稱，但不改動英文', () => {
  assert.equal(formatCourseWeekday('週一'), '星期一')
  assert.equal(formatCourseWeekday('周日'), '星期日')
  assert.equal(formatCourseWeekday('2026 好運跑步訓練營 X 週六台北早鳥班'), '2026 好運跑步訓練營 X 星期六台北早鳥班')
  assert.equal(formatCourseWeekday('週三', 'en'), 'Wednesday')
  assert.equal(formatCourseWeekday('Monday'), 'Monday')
})

test('課程公開資訊使用完整城市名並隱藏課程時長', () => {
  assert.equal(displayCourseLocation('台北'), '台北市')
  assert.equal(displayCourseLocation('臺北市'), '台北市')
  assert.equal(displayCourseLocation('新竹'), '新竹市')
  assert.equal(displayCourseTime('19:30（1.5-2 小時）'), '19:30')
  assert.equal(displayCourseTime('05:30 (1.5-2小时)'), '05:30')
})
