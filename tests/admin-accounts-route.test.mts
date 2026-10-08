import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../app/api/admin/accounts/route.ts', import.meta.url), 'utf8')
function harness(role: string | null, error: unknown = null, authFails = false) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const routes = {} as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: routes, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/admin-auth') return { getAdminEmails: () => ['bootstrap@example.com'], getAdminProfile: async () => { if (authFails) throw Error('database unavailable'); return role === 'admin' ? { id: 'actual-admin' } : null } }
      if (name === '@/lib/supabase-server') return { getAuthedUser: async () => role ? { id: 'actual-admin' } : null, supabaseAdmin: { rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { data: { admins: [], diagnostic: null, audit: [] }, error } } } }
      throw new Error(name)
    },
  })
  return {
    calls,
    get: (email = '') => { const url = new URL('https://example.com/api/admin/accounts'); if (email) url.searchParams.set('email', email); const request = new Request(url); Object.assign(request, { nextUrl: url }); return routes.GET(request) },
    post: (body: unknown) => routes.POST(new Request('https://example.com/api/admin/accounts', { method: 'POST', body: JSON.stringify(body) })),
  }
}
const grant = { email: ' Person@example.com ', active: true, reason: ' Delegate operations ' }
test('admin account inspection and writes reject coaches, students and unauthenticated users', async () => {
  for (const role of [null, 'student', 'coach']) {
    const h = harness(role)
    assert.equal((await h.get()).status, role ? 403 : 401)
    assert.equal((await h.post(grant)).status, role ? 403 : 401)
    assert.equal(h.calls.length, 0)
  }
})
test('account diagnostics only calls the read-only RPC and never activates the target', async () => {
  const h = harness('admin')
  const response = await h.get(' Person@example.com ')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(h.calls.length, 1)
  assert.equal(h.calls[0].name, 'admin_account_overview')
  assert.equal(h.calls[0].args.p_email, 'person@example.com')
  assert.equal(h.calls[0].args.p_actor_id, 'actual-admin')
})
test('grant/revoke uses authenticated actor and rejects malformed input before writing', async () => {
  const h = harness('admin')
  for (const body of [null, {}, { ...grant, active: 'true' }, { ...grant, email: 'invalid' }, { ...grant, reason: '' }, { ...grant, reason: 'x'.repeat(801) }]) assert.equal((await h.post(body)).status, 400)
  assert.equal((await h.get('invalid')).status, 400)
  assert.equal(h.calls.length, 0)
  assert.equal((await h.post({ ...grant, actorId: 'forged', p_env_emails: ['attacker@example.com'] })).status, 200)
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), { name: 'admin_set_access', args: { p_actor_id: 'actual-admin', p_email: 'person@example.com', p_active: true, p_reason: 'Delegate operations' } })
  assert.equal((await h.post({ ...grant, active: false })).status, 200)
  assert.equal(h.calls[1].args.p_active, false)
})
test('revoked actors, self-revoke, missing migration and authorization outages fail closed', async () => {
  assert.equal((await harness('admin', { message: 'admin_required' }).post(grant)).status, 403)
  assert.equal((await harness('admin', { message: 'admin_cannot_revoke_self' }).post(grant)).status, 409)
  const response = await harness('admin', { code: 'PGRST202', message: 'private database detail' }).post(grant)
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /private database detail/)
  const h = harness('admin', null, true)
  assert.equal((await h.post(grant)).status, 503)
  assert.equal(h.calls.length, 0)
})
