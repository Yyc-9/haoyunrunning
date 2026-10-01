import assert from 'node:assert/strict'
import test from 'node:test'
import { GROUP_PRACTICE_PATH, publicActivityHref, isGroupPractice } from '../lib/group-practice.ts'

const group = { title: '好運跑班 X 週末團練', description: '已發布說明', action: '', href: '' }
test('clearing a group link in the CMS leaves an announcement with no navigation', () => {
  assert.equal(isGroupPractice(group), true)
  assert.equal(publicActivityHref(group), '')
})
test('custom activity destinations are respected while public group invitations remain closed', () => {
  assert.equal(publicActivityHref({ ...group, href: '/courses' }), '/courses')
  assert.equal(publicActivityHref({ ...group, href: '/group-signup' }), '/group-signup')
  for (const href of ['https://line.me/ti/g2/example', 'https://lin.ee/example']) {
    assert.equal(publicActivityHref({ ...group, href }), GROUP_PRACTICE_PATH)
  }
  assert.equal(publicActivityHref({ ...group, title: '週年活動', href: '/anniversary' }), '/anniversary')
})
