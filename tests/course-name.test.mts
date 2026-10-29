import assert from 'node:assert/strict'
import test from 'node:test'
import { seasonCourseName, courseTimetableName } from '../lib/course-name.ts'
import { registerHooks } from 'node:module'
registerHooks({ resolve(specifier, context, next) {
  return specifier.startsWith('@/') ? next(new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, context) : next(specifier, context)
} })
const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
const { normalizeCourseOverrides } = await import('../lib/site-content.ts')
const { applyCourseOverrides } = await import('../lib/managed-courses.ts')

test('timetable hides season prefixes without losing weekdays or meaningful name content', () => {
  for (const name of ['2026Q4週一竹北夜跑', '2027-Q1週一竹北夜跑', 'Q4週一竹北夜跑', '2026 好運跑步訓練營 X 週一竹北夜跑']) {
    assert.equal(courseTimetableName(name), '週一竹北夜跑')
  }
  assert.equal(courseTimetableName('2026Q42026好運跑班X綜合體能訓練'), '好運跑班X綜合體能訓練')
  assert.equal(courseTimetableName('週二台北PB班'), '週二台北PB班')
})

test('administrator timetable name survives normalization and public course mapping independently of formal name', () => {
  const overrides = normalizeCourseOverrides({ 'test-course': { name: '2026Q4週一竹北夜跑', timetableName: '  竹北夜跑訓練班  ' } })
  const [course] = applyCourseOverrides(overrides, { onlyConfigured: true })
  assert.equal(courseTimetableName(course.name, course.timetableName), '竹北夜跑訓練班')
  assert.equal(course.name, '2026Q4週一竹北夜跑')
  const cleared = normalizeCourseOverrides({ 'test-course': { ...overrides['test-course'], timetableName: '  ' } })
  assert.equal(courseTimetableName(cleared['test-course'].name!, cleared['test-course'].timetableName), '週一竹北夜跑')
  assert.equal(normalizeCourseOverrides({ 'test-course': { timetableName: 'x'.repeat(200) } })['test-course'].timetableName?.length, 180)
})

test('names use the offering quarter without repeated or outdated prefixes', () => {
  assert.equal(seasonCourseName('2026 好運跑步訓練營 X 週三竹北夜跑班', '2026-Q4'), '2026Q4週三竹北夜跑班')
  assert.equal(seasonCourseName('2026Q4週三竹北夜跑班', '2027-Q1'), '2027Q1週三竹北夜跑班')
  assert.equal(seasonCourseName('2026Q3週二台北PB班', '2026-Q3'), '2026Q3週二台北PB班')
  assert.equal(seasonCourseName('週三竹北夜跑班', 'custom'), '週三竹北夜跑班')
})

test('compact names translate with the year and quarter intact', () => {
  assert.equal(toEnglishWebsiteText('2026Q4週二台北PB班'), '2026Q4 Tuesday Taipei PB Class')
  for (const name of ['2026Q4週三竹北夜跑班', '2026Q4週四新莊初階班', '2026Q3週二竹市初心補習班']) {
    const translated = toEnglishWebsiteText(name)
    assert.ok(translated.startsWith(name.slice(0, 6)))
    assert.ok(!/[\u3400-\u9fff]/u.test(translated))
  }
})
