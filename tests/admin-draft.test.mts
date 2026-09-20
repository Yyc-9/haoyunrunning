import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcileAdminDraft, mergeAdminFields } from '../lib/admin-draft.ts'

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


test('publishing or restoring one page cannot change another page image draft', () => {
  const saved = { home: 'old-home', about: 'old-about' }
  const draft = { home: 'new-home', about: 'new-about' }
  assert.deepEqual(mergeAdminFields(saved, draft, ['home']), { home: 'new-home', about: 'old-about' })
  assert.deepEqual(mergeAdminFields(draft, saved, ['home']), { home: 'old-home', about: 'new-about' })
})
