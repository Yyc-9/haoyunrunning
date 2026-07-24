import assert from 'node:assert/strict'
import test from 'node:test'

import { toTraditionalWebsiteText } from '../lib/traditional-chinese.ts'

test('馬拉松在繁體轉換後仍使用正確用字', () => {
  assert.equal(toTraditionalWebsiteText('波士頓馬拉松'), '波士頓馬拉松')
  assert.equal(toTraditionalWebsiteText('波士顿马拉松'), '波士頓馬拉松')
  assert.equal(toTraditionalWebsiteText('全程馬拉鬆'), '全程馬拉松')
})
