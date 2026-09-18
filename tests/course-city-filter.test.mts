import assert from 'node:assert/strict'
import test from 'node:test'
import { courseMatchesCity, getCourseCityOptions } from '../lib/course-sort.ts'

test('multi-city classes appear under either city without duplicate city chips', () => {
  const location = '台北市、新北市'
  assert.equal(courseMatchesCity(location, '台北'), true)
  assert.equal(courseMatchesCity(location, '新北市'), true)
  assert.equal(courseMatchesCity(location, '新竹市'), false)
  assert.deepEqual(getCourseCityOptions(['臺北市', location, '新北']), ['台北', '新北市'])
})

test('city matching normalizes whitespace and does not confuse Hsinchu city and county', () => {
  assert.equal(courseMatchesCity(' 新竹縣 ／ 新竹市 ', '新竹市'), true)
  assert.equal(courseMatchesCity('新竹縣', '新竹市'), false)
  assert.equal(courseMatchesCity('', 'all'), true)
})
