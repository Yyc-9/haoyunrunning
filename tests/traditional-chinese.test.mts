import assert from 'node:assert/strict'
import test from 'node:test'

import { toSimplifiedWebsiteText, toTraditionalWebsiteText } from '../lib/traditional-chinese.ts'
import { toTraditionalWithOpenCC } from '../lib/traditional-opencc.ts'

test('馬拉松在繁體轉換後仍使用正確用字', () => {
  assert.equal(toTraditionalWebsiteText('波士頓馬拉松'), '波士頓馬拉松')
  assert.equal(toTraditionalWebsiteText('波士顿马拉松'), '波士頓馬拉松')
  assert.equal(toTraditionalWebsiteText('全程馬拉鬆'), '全程馬拉松')
})

test('教練姓氏周不會被繁體轉換成週', () => {
  assert.equal(toTraditionalWebsiteText('周贤峰教练'), '周賢峰教練')
  assert.equal(toTraditionalWebsiteText('週賢峰教練'), '周賢峰教練')
  assert.equal(toTraditionalWithOpenCC('周贤峰教练'), '周賢峰教練')
  assert.equal(toSimplifiedWebsiteText('週賢峰教練'), '周贤峰教练')
})
