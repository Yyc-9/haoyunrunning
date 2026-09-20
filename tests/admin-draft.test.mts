import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcileAdminDraft } from '../lib/admin-draft.ts'

test('background refresh updates clean sections while retaining unrelated edits', () => {
  const previous = { hero: { title: 'old' }, about: { title: 'old' } }
  const current = { hero: { title: 'draft' }, about: { title: 'old' } }
  const incoming = { hero: { title: 'old' }, about: { title: 'published' } }
  assert.deepEqual(reconcileAdminDraft(current, previous, incoming), { hero: { title: 'draft' }, about: { title: 'published' } })
})

test('refresh retains list reorder and new draft rows without merging by index', () => {
  assert.deepEqual(reconcileAdminDraft(['b', 'a', 'new'], ['a', 'b'], ['a', 'b', 'remote']), ['b', 'a', 'new'])
})

test('clean fields accept cleared values and newly created server fields', () => {
  assert.deepEqual(reconcileAdminDraft({ title: 'old' }, { title: 'old' }, { title: '', added: 'new' }), { title: '', added: 'new' })
})
