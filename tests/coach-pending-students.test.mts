import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(path: string, modules = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: (name: string) => modules[name] })
  return exports
}
const { appendPendingStudents } = load('../lib/coach-pending-students.ts', { './coach-registration': load('../lib/coach-registration.ts') }) as typeof import('../lib/coach-pending-students')
const pending = { id: 'lead-1', name: '測試學員', email: 'student@example.invalid', status: 'pending_review', preferred_course: '星期一班', created_at: '2026-09-23' }

test('pending registration appears even without a formal binding or profile', () => {
  const rows = appendPendingStudents([], [pending])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].pendingReview, true)
  assert.equal(rows[0].active, false)
  assert.match(rows[0].student!.id, /^pending-/)
  assert.equal(rows[0].student!.name, '測試學員')
  assert.equal(rows[0].recentFeedback.length, 0)
})
test('same email is grouped and a paid student is not duplicated or demoted', () => {
  const grouped = appendPendingStudents([], [pending, { ...pending, id: 'lead-2', email: 'STUDENT@example.invalid', preferred_course: '星期二班' }])
  assert.equal(grouped.length, 1)
  assert.equal(grouped[0].enrollments.length, 2)
  const paid = { id: 'binding', active: true, created_at: '', student: { id: 'profile', name: '會員', email: pending.email, program: '正式班', goal: null, pb: null }, recentFeedback: [{ id: 'feedback' }], enrollments: [] }
  const result = appendPendingStudents([paid], [pending])
  assert.equal(result.length, 1)
  assert.equal(result[0].active, true)
  assert.equal(result[0].pendingReview, undefined)
  assert.equal(result[0].enrollments[0].status, 'pending_review')
  assert.equal(paid.enrollments.length, 0)
})
test('unreported, rejected and approved entries are not synthesized as pending students', () => {
  assert.equal(appendPendingStudents([], ['pending_transfer', 'rejected', 'approved'].map(status => ({ ...pending, status }))).length, 0)
})
