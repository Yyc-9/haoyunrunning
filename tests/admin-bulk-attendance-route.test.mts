import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../app/api/admin/coach-duty/bulk/route.ts', import.meta.url), 'utf8')
const assignmentId = '11111111-1111-4111-8111-111111111111'
function harness(role: string | null, rpcError: unknown = null) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const routes = {} as { POST: (request: Request) => Promise<Response> }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: routes, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/admin-auth') return { getAdminProfile: async () => role === 'admin' ? { id: 'authenticated-admin' } : null }
      if (name === '@/lib/supabase-server') return {
        getAuthedUser: async () => role ? { id: 'authenticated-admin' } : null,
        supabaseAdmin: { rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { data: { changed: 1 }, error: rpcError } } },
      }
      throw new Error(name)
    },
  })
  const request = (body: unknown) => routes.POST(new Request('https://example.com/api/admin/coach-duty/bulk', { method: 'POST', body: JSON.stringify(body) }))
  return { request, calls }
}
const preview = { action: 'preview', assignmentIds: [assignmentId], state: 'on_time' }
test('bulk correction rejects unauthenticated, student and coach accounts before accessing data', async () => {
  for (const role of [null, 'student', 'coach']) {
    const { request, calls } = harness(role)
    assert.equal((await request(preview)).status, role ? 403 : 401)
    assert.equal(calls.length, 0)
  }
})
test('preview never writes and actor identity is taken from the authenticated session', async () => {
  const { request, calls } = harness('admin')
  assert.equal((await request({ ...preview, actorId: 'someone-else', fingerprint: 'forged' })).status, 200)
  assert.equal(calls[0].args.p_actor_id, 'authenticated-admin')
  assert.equal(calls[0].args.p_fingerprint, null)
  assert.equal(calls[0].args.p_reason, '')
})
test('apply requires a bounded scope, a preview fingerprint and a reason', async () => {
  const { request, calls } = harness('admin')
  for (const body of [null, { ...preview, assignmentIds: [] }, { ...preview, assignmentIds: ['bad'] }, { ...preview, assignmentIds: Array(501).fill(assignmentId) }, { ...preview, state: 'arbitrary' }, { ...preview, action: 'apply' }, { ...preview, action: 'apply', fingerprint: 'a'.repeat(32), reason: ' ' }]) {
    assert.equal((await request(body)).status, 400)
  }
  assert.equal(calls.length, 0)
  assert.equal((await request({ ...preview, action: 'apply', fingerprint: 'a'.repeat(32), reason: 'Verified' })).status, 200)
  assert.equal(calls[0].args.p_reason, 'Verified')
})
test('stale previews and unavailable migrations never return success', async () => {
  for (const [error, expected] of [[{ code: 'P0001', message: '考勤已變更' }, 409], [{ code: 'PGRST202', message: 'missing' }, 503]] as const) {
    assert.equal((await harness('admin', error).request(preview)).status, expected)
  }
})
