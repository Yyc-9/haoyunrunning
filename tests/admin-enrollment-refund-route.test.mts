import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../app/api/admin/enrollment-refund/route.ts', import.meta.url), 'utf8')
function harness(role: string | null, error: unknown = null) {
  const calls: Array<Record<string, unknown>> = []
  const routes = {} as { POST: (request: Request) => Promise<Response>; GET: (request: Request) => Promise<Response> }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: routes, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/admin-auth') return { getAdminProfile: async () => role === 'admin' ? { id: 'admin' } : null }
      if (name === '@/lib/supabase-pagination') return {}
      if (name === '@/lib/supabase-server') return { getAuthedUser: async () => role ? { id: 'admin' } : null, supabaseAdmin: { rpc: async (_name: string, args: Record<string, unknown>) => { calls.push(args); return { data: { withdrawn: true }, error } } } }
      throw new Error(name)
    },
  })
  return { calls, routes, post: (body: unknown) => routes.POST(new Request('https://example.com', { method: 'POST', body: JSON.stringify(body) })) }
}
const base = { action: 'preview', enrollmentId: '11111111-1111-4111-8111-111111111111' }
test('refund requires authentication and an administrator', async () => {
  for (const role of [null, 'student', 'coach']) {
    const h = harness(role)
    assert.equal((await h.post(base)).status, role ? 403 : 401)
    assert.equal(h.calls.length, 0)
  }
})
test('preview cannot write even when a caller supplies a fingerprint or actor', async () => {
  const h = harness('admin')
  assert.equal((await h.post({ ...base, actorId: 'forged', fingerprint: 'a'.repeat(32) })).status, 200)
  assert.equal(h.calls[0].p_actor_id, 'admin')
  assert.equal(h.calls[0].p_fingerprint, null)
})
test('invalid identifiers, missing previews and empty reasons are rejected', async () => {
  const h = harness('admin')
  for (const body of [null, { ...base, enrollmentId: '' }, { ...base, action: 'delete' }, { ...base, action: 'apply' }, { ...base, action: 'apply', fingerprint: 'a'.repeat(32), reason: ' ' }, { ...base, action: 'apply', fingerprint: 'a'.repeat(32), reason: 'x'.repeat(801) }]) assert.equal((await h.post(body)).status, 400)
  assert.equal(h.calls.length, 0)
  assert.equal((await h.post({ ...base, action: 'apply', fingerprint: 'a'.repeat(32), reason: ' Refunded outside the site ' })).status, 200)
  assert.equal(h.calls[0].p_reason, 'Refunded outside the site')
})
test('conflicts and missing migrations never report success', async () => {
  assert.equal((await harness('admin', { code: 'P0001', message: 'conflict' }).post(base)).status, 409)
  assert.equal((await harness('admin', { code: 'PGRST202', message: 'missing' }).post(base)).status, 503)
})
