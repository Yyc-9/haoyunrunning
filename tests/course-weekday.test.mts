import assert from 'node:assert/strict'
import test from 'node:test'

import { compareCourseLocations, displayCourseLocation, displayCourseTime, getCourseCityOptions, sortCourses } from '../lib/course-sort.ts'
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

test('課程城市從北到南排列，別名去重且不會漏掉新北', () => {
  const source = ['竹南鎮', '新竹', '新北市', '竹北市', '台北市', '臺北', '桃園', '新竹市', '']
  assert.deepEqual(getCourseCityOptions(source).map(displayCourseLocation), ['台北市', '新北市', '桃園市', '竹北', '新竹市', '竹南'])
  assert.equal(source[0], '竹南鎮')
  assert.ok(compareCourseLocations('新竹縣竹北市', '新竹市') < 0)
  assert.deepEqual(getCourseCityOptions(['高雄', '台中', '彰化', '苗栗', '台南']), ['苗栗', '台中', '彰化', '台南', '高雄'])
  assert.equal(getCourseCityOptions(['未知城市', '新北'])[1], '未知城市')
})

test('課表仍按星期排列，同一天先從北到南，同城市再按時間排列', () => {
  const source = [
    { name: '竹市早鳥班', weekday: '週二', location: '新竹市', classTime: '05:30' },
    { name: '台北夜跑班', weekday: '週二', location: '台北市', classTime: '19:00' },
    { name: '新北班', weekday: '週二', location: '新北市', classTime: '18:30' },
    { name: '竹北班', weekday: '週二', location: '竹北', classTime: '19:30' },
    { name: '台北早鳥班', weekday: '週二', location: '臺北', classTime: '06:00' },
    { name: '週一班', weekday: '週一', location: '竹南', classTime: '19:30' },
  ]
  assert.deepEqual(sortCourses(source).map((course) => course.name), ['週一班', '台北早鳥班', '台北夜跑班', '新北班', '竹北班', '竹市早鳥班'])
  assert.equal(source[0].name, '竹市早鳥班')
})
