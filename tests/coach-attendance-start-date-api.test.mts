import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import * as access from '../lib/coach-attendance-access.ts'
const require = createRequire(import.meta.url)
const ts = require('typescript')

function harness({ makeup = false, originalMakeup = false } = {}) {
  const writes: Array<{ table: string; operation: string; value: unknown }> = []
  const enrollment = { id: 'student', name: 'Fixture', email: 'fixture@example.test', season_id: 'season', course_season_course_id: makeup ? 'other' : 'home', course_slug: 'class', status: 'pending_review', billing_start_session_date: '2026-10-15' }
  function from(table: string) {
    const filters: Record<string, unknown> = {}
    const query: Record<string, unknown> = {}
    const result = () => ({ error: null, data: table === 'signup_leads' ? [enrollment] : table === 'course_makeup_requests' && ((makeup && filters.target_course_season_course_id) || (originalMakeup && filters.original_course_season_course_id)) ? [{ id: 'makeup', enrollment_id: 'student', status: 'scheduled' }] : [] })
    for (const op of ['select', 'in', 'neq', 'or', 'order']) query[op] = () => query
    query.eq = (key: string, value: unknown) => { filters[key] = value; return query }
    query.single = async () => ({ error: null, data: { id: 'coach', role: 'admin' } })
    query.maybeSingle = async () => ({ error: null, data: table === 'signup_leads' ? enrollment : null })
    query.then = (resolve: (value: unknown) => void) => Promise.resolve(result()).then(resolve)
    for (const operation of ['delete', 'upsert']) query[operation] = (value: unknown) => { writes.push({ table, operation, value }); return query }
    return query
  }
  const routes: Record<string, (request: Request) => Promise<Response>> = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/coach/attendance/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: routes, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/supabase-server') return { getAuthedUser: async () => ({ id: 'coach' }), supabaseAdmin: { from, rpc: async (operation: string, value: unknown) => { writes.push({ table: 'rpc', operation, value }); return { error: null } } } }
      if (name === '@/lib/admin-auth') return { getAdminProfile: async () => ({ id: 'coach' }) }
      if (name === '@/lib/coach-profiles') return { getDefaultCourseCoachKeys: () => [] }
      if (name === '@/lib/course-attendance') return { attendanceCourseLabel: (v: string) => v, taipeiDateKey: () => '2026-10-31' }
      if (name === '@/lib/course-seasons-server') return { getCourseSeasons: async () => [{ id: 'season', name: 'Current', isCurrent: true, status: 'active', courseOverrides: {}, courseOfferingIds: { class: 'home' }, courseBillingConfigs: { class: { scheduleReady: true, sessionDates: ['2026-10-08', '2026-10-15', '2026-10-22'] } } }] }
      if (name === '@/lib/managed-courses') return { applyCourseOverrides: () => [{ slug: 'class', name: 'Fixture class' }] }
      if (name === '@/lib/coach-attendance-access') return access
      if (name === '@/lib/coach-session-duty') return { syncCoachSessionAssignments: async () => {} }
      if (name === '@/lib/coach-leave-options') return {}
      if (name === '@/lib/test-account') return { getIsolatedTestAccount: async () => null }
      if (name === '@/lib/season-write-guard') return { archivedSeasonResponse: async () => null }
      throw Error(name)
    },
  })
  const send = (sessionDate: string, extra: Record<string, unknown> = {}) => routes.POST(new Request('https://test/api/coach/attendance', { method: 'POST', body: JSON.stringify({ courseSeasonCourseId: 'home', sessionDate, records: [{ enrollmentId: 'student', status: 'present' }], ...extra }) }))
  return { send, writes }
}

test('server rejects every pre-admission attendance write before deleting or updating any record', async () => {
  for (const status of ['present', 'deducted', 'unmarked']) {
    const h = harness()
    const response = await h.send('2026-10-08', { records: [{ enrollmentId: 'student', status }] })
    assert.equal(response.status, 400); assert.match(await response.text(), /尚未入班/); assert.equal(h.writes.length, 0)
  }
})
test('server allows admission date and later while retaining pending-payment eligibility', async () => {
  for (const date of ['2026-10-15', '2026-10-22']) {
    const h = harness(); assert.equal((await h.send(date)).status, 200)
    assert.equal(h.writes.length, 1); assert.equal(h.writes[0].operation, 'upsert')
  }
})
test('leave cannot be created before admission and active makeup still belongs to its target session', async () => {
  const h = harness()
  assert.equal((await h.send('2026-10-08', { intent: 'resolve_leave', enrollmentId: 'student', leaveMode: 'self_training' })).status, 400)
  assert.equal(h.writes.length, 0)
  const makeup = harness({ makeup: true })
  assert.equal((await makeup.send('2026-10-08')).status, 200)
  assert.equal(makeup.writes[0].operation, 'upsert')
  const leave = harness()
  assert.equal((await leave.send('2026-10-15', { intent: 'resolve_leave', enrollmentId: 'student', leaveMode: 'self_training' })).status, 200)
  assert.equal(leave.writes[0].operation, 'resolve_coach_course_leave')
})
