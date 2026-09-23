import assert from 'node:assert/strict'
import test from 'node:test'
import { seasonCourseName } from '../lib/course-name.ts'
import { registerHooks } from 'node:module'
registerHooks({ resolve(specifier, context, next) {
  return specifier.startsWith('@/') ? next(new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, context) : next(specifier, context)
} })
const { toEnglishWebsiteText } = await import('../lib/english-website.ts')

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
