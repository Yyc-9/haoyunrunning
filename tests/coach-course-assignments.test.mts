import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../lib/goodluck-data.ts', import.meta.url), 'utf8')
const mapStart = source.indexOf('const coachesBySlug')
const mapEnd = source.indexOf('if (coachesBySlug', mapStart)
const coachMap = source.slice(mapStart, mapEnd)

test("Peter 使用獨立身份與照片，不繼承詠馨的課程或經歷", () => {
  assert.match(source, /peter: \{/)
  assert.match(source, /avatars\/peter\.jpg/)
  assert.doesNotMatch(source, /yongXin|詠馨/)
  assert.doesNotMatch(coachMap, /coachProfiles\.peter/)
  const profiles = readFileSync(new URL("../lib/coach-profiles.ts", import.meta.url), "utf8")
  assert.match(profiles, /if \(row\.coach_key === .yongXin.\) continue/)
})

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
