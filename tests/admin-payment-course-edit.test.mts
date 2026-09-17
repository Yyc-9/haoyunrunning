import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { reconcileCourseField } from '../lib/admin-course-edit-state.ts'

test('刷新或舊季度資料不能覆蓋同一課程未儲存的新名稱', () => {
  const old = { name: '第三季舊名稱' }
  const edit = { name: '第四季新名稱' }
  assert.deepEqual(reconcileCourseField(edit, old, old, true), edit)
  assert.deepEqual(reconcileCourseField(edit, old, edit, true), edit)
  assert.deepEqual(reconcileCourseField(old, old, edit, true), edit)
  assert.deepEqual(reconcileCourseField(edit, old, old, false), old)
})

test('入帳接口只開放管理員，要求實收確認和備註並沿用原子名額檢查', () => {
  const api = readFileSync(new URL('../app/api/admin/route.ts', import.meta.url), 'utf8')
  assert.match(api, /export async function PATCH[\s\S]*?requireAdmin\(request\)/)
  assert.match(api, /body.confirmReceipt !== true \|\| !reviewNote/)
  assert.match(api, /rpc\('approve_course_enrollment'/)
  assert.match(api, /操作人：\$\{auth.adminProfile.id\}/)
  const migration = readFileSync(new URL('../supabase/migrations/20260715060000_course_attendance_reconciliation.sql', import.meta.url), 'utf8')
  assert.match(migration, /for update/)
  assert.match(migration, /if v_lead.status = 'approved'/)
  assert.match(migration, /pg_advisory_xact_lock/)
  assert.match(migration, /course capacity reached/)
  assert.match(migration, /from public, anon, authenticated/)
})

test('課程名稱依季度顯示，保存後同步統計與報名列表', () => {
  const api = readFileSync(new URL('../app/api/admin/route.ts', import.meta.url), 'utf8')
  assert.match(api, /courseName: courseSeasons.find[\s\S]*?courseOverrides\[order.course_slug/)
  const dashboard = readFileSync(new URL('../app/admin/AdminDashboardClient.tsx', import.meta.url), 'utf8')
  assert.match(dashboard, /courseCapacity: current.courseCapacity.map/)
  assert.match(dashboard, /orders: current.orders.map/)
  assert.match(dashboard, /requestId === dashboardRequestId.current/)
})
