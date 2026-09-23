import assert from 'node:assert/strict'
import test from 'node:test'
import { SEAT_HOLDING_STATUSES, courseSeatAvailability } from '../lib/course-capacity.ts'

const available = (statuses: string[], capacity = 3) => courseSeatAvailability(capacity, statuses.filter(status => (SEAT_HOLDING_STATUSES as readonly string[]).includes(status)).length)

test('submitted unpaid registrations reserve seats and approval does not consume another seat', () => {
  assert.equal(available(['pending_transfer']).remaining, 2)
  assert.equal(available(['pending_review']).remaining, 2)
  assert.equal(available(['approved']).remaining, 2)
  assert.deepEqual(available(['pending_transfer', 'pending_review', 'approved']), { registeredCount: 3, remaining: 0, full: true })
})

test('returned records do not reserve seats and lower capacities never show negative availability', () => {
  assert.equal(available(['pending_review', 'rejected']).registeredCount, 1)
  assert.equal(available(['pending_review', 'approved'], 1).remaining, 0)
  assert.equal(available(['pending_review', 'approved'], 1).full, true)
  assert.deepEqual(available([]), { registeredCount: 0, remaining: 3, full: false })
})
