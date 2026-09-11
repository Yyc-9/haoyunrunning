import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('裁切完成回到可見按鈕且不捲動隱藏上傳欄位', () => {
  const source = readFileSync(new URL('../components/admin/CroppableImageInput.tsx', import.meta.url), 'utf8')
  assert.match(source, /ref=\{triggerRef\}/)
  assert.match(source, /trigger\.focus\(\{ preventScroll: true \}\)/)
  assert.match(source, /dialogRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
  assert.doesNotMatch(source, /triggerInput\?\.focus/)
  assert.match(source, /element\.scrollTop = top/)
  assert.match(source, /element\.scrollLeft = left/)
  assert.match(source, /document\.body\.style\.overflow = previousOverflow/)
})
