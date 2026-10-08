import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../app/api/admin/enrollment-transfer/route.ts', import.meta.url), 'utf8')
function harness(role: string | null, error: unknown = null) {
  const calls: Array<Record<string, unknown>> = []
  const routes = {} as { POST: (request: Request) => Promise<Response>; GET: (request: Request) => Promise<Response> }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: routes, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/admin-auth') return { getAdminProfile: async () => role === 'admin' ? { id: 'admin' } : null }
      if (name === '@/lib/supabase-pagination') return {}
      if (name === '@/lib/supabase-server') return { getAuthedUser: async () => role ? { id: 'admin' } : null, supabaseAdmin: { rpc: async (_name: string, args: Record<string, unknown>) => { calls.push(args); return { data: { transferred: true }, error } } } }
      throw new Error(name)
    },
  })
  return { calls, routes, post: (body: unknown) => routes.POST(new Request('https://example.com', { method: 'POST', body: JSON.stringify(body) })) }
}
const base = { action: 'preview', enrollmentId: '11111111-1111-4111-8111-111111111111', targetId: '22222222-2222-4222-8222-222222222222', startDate: '2026-10-07', mode: 'preserve_history', dateMap: {} }
test('only administrators may view transfer context or perform a transfer', async () => {
  for (const role of [null, 'student', 'coach']) {
    const h = harness(role)
    assert.equal((await h.post(base)).status, role ? 403 : 401)
    assert.equal((await h.routes.GET(new Request('https://example.com'))).status, role ? 403 : 401)
    assert.equal(h.calls.length, 0)
  }
})
test('preview uses the authenticated actor and never commits a caller-supplied fingerprint', async () => {
  const h = harness('admin')
  assert.equal((await h.post({ ...base, actorId: 'forged', fingerprint: 'a'.repeat(32) })).status, 200)
  assert.equal(h.calls[0].p_actor_id, 'admin')
  assert.equal(h.calls[0].p_fingerprint, null)
})
test('invalid transfer dates, mapping, identifiers and unpreviewed writes are rejected', async () => {
  const h = harness('admin')
  for (const body of [null, { ...base, enrollmentId: '' }, { ...base, mode: 'delete_history' }, { ...base, dateMap: [] }, { ...base, dateMap: { '2026-10-01': null } }, { ...base, action: 'apply' }, { ...base, action: 'apply', fingerprint: 'a'.repeat(32), reason: '' }]) assert.equal((await h.post(body)).status, 400)
  assert.equal(h.calls.length, 0)
  assert.equal((await h.post({ ...base, action: 'apply', fingerprint: 'a'.repeat(32), reason: 'Confirmed transfer' })).status, 200)
  assert.equal(h.calls[0].p_reason, 'Confirmed transfer')
})
test('database conflicts and a missing migration never report a successful transfer', async () => {
  assert.equal((await harness('admin', { code: 'P0001', message: 'conflict' }).post(base)).status, 409)
  assert.equal((await harness('admin', { code: 'PGRST202', message: 'missing' }).post(base)).status, 503)
})
