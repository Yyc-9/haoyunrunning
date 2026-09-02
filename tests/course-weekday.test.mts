import assert from 'node:assert/strict'
import test from 'node:test'

import { formatCourseWeekday } from '../lib/course-weekday.ts'

test('課程星期顯示使用完整名稱，但不改動英文', () => {
  assert.equal(formatCourseWeekday('週一'), '星期一')
  assert.equal(formatCourseWeekday('周日'), '星期日')
  assert.equal(formatCourseWeekday('2026 好運跑步訓練營 X 週六台北早鳥班'), '2026 好運跑步訓練營 X 星期六台北早鳥班')
  assert.equal(formatCourseWeekday('週三', 'en'), 'Wednesday')
  assert.equal(formatCourseWeekday('Monday'), 'Monday')
})
