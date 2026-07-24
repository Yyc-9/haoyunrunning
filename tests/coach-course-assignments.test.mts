import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../lib/goodluck-data.ts', import.meta.url), 'utf8')
const mapStart = source.indexOf('const coachesBySlug')
const mapEnd = source.indexOf('if (coachesBySlug', mapStart)
const coachMap = source.slice(mapStart, mapEnd)

test('鄔惟喬僅隸屬週二竹市班', () => {
  assert.match(
    coachMap,
    /'hsinchu-beginner-tuesday': \[coachProfiles\.bianbian, coachProfiles\.wuWeiQiao\]/,
  )
  assert.equal(coachMap.match(/coachProfiles\.wuWeiQiao/g)?.length, 1)
})

test('鄭以群隸屬週四竹南班', () => {
  assert.match(
    coachMap,
    /'zhunan-beginner-thursday': \[coachProfiles\.zhouXianFeng, coachProfiles\.yangShengHao, coachProfiles\.zhengYiQun\]/,
  )
  assert.equal(coachMap.match(/coachProfiles\.zhengYiQun/g)?.length, 1)
})
