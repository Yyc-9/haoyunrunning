import assert from 'node:assert/strict'
import test from 'node:test'
import { GROUP_LINE_URL, groupLineUrl, isGroupPractice } from '../lib/group-practice.ts'

test('only group practice cards use the explanation route', () => {
  const base = { description: '', action: '' }
  assert.equal(isGroupPractice({ ...base, title: '好運跑班 X 週末團練', href: GROUP_LINE_URL }), true)
  assert.equal(isGroupPractice({ ...base, title: 'Group', href: '/group-signup' }), true)
  assert.equal(isGroupPractice({ ...base, title: '週年活動', href: '/anniversary' }), false)
})

test('LINE destination follows configured invitations and rejects unrelated URLs', () => {
  assert.equal(groupLineUrl('https://lin.ee/example'), 'https://lin.ee/example')
  for (const href of ['/group-signup', 'javascript:alert(1)', 'https://line.me.example.com/', undefined]) {
    assert.equal(groupLineUrl(href), GROUP_LINE_URL)
  }
})
