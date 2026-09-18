import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeSeasonOrders } from '../lib/admin-season-overview.ts'
import { overviewSeasonId } from '../lib/course-seasons.ts'

test('overview defaults to current quarter and preserves explicit historical selection', () => {
  const seasons = [{ id: 'q3', code: '2026-Q3', status: 'archived' as const, isCurrent: false }, { id: 'q4', code: '2026-Q4', status: 'enrolling' as const, isCurrent: true }]
  assert.equal(overviewSeasonId(seasons, ''), 'q4')
  assert.equal(overviewSeasonId(seasons, 'q3'), 'q3')
  assert.equal(overviewSeasonId(seasons, 'deleted'), 'q4')
  assert.equal(overviewSeasonId([], ''), '')
})

test('quarter totals exclude other quarters, shop orders and duplicate students', () => {
  const order = { id: '1', orderKind: 'course', seasonId: 'q4', status: 'approved', email: 'runner@example.com' }
  const result = summarizeSeasonOrders([order,
    { ...order, id: '2', seasonId: 'q3', status: 'pending_review' },
    { ...order, id: '3', orderKind: 'shop', status: 'pending_review' },
    { ...order, id: '4', email: ' RUNNER@example.com ', status: 'pending_review' },
    { ...order, id: '5', email: 'duplicate@example.com', status: 'rejected' },
  ], 'q4')
  assert.equal(result.records.length, 3)
  assert.equal(result.approved.length, 1)
  assert.equal(result.pending.length, 1)
  assert.equal(result.needsReview.length, 1)
  assert.equal(result.studentCount, 1)
  assert.equal(summarizeSeasonOrders([order], 'missing').studentCount, 0)
})
