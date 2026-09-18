import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import { isFinanceViewer } from '../lib/finance-viewers.ts'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../lib/finance-access.ts', import.meta.url), 'utf8')
function authFor(user: Record<string, unknown> | null, admin = false) {
  const credential = { credential_version: 1, token_secret: 'test-only-secret' }
  const query = { select() { return query }, eq() { return query }, async maybeSingle() { return { data: credential, error: null } } }
  type AuthResult = { response: Response; readOnly: boolean; adminProfile: { role: string } }
  const exports = {} as {
    authenticateReconciliationUser: (request: Request) => Promise<AuthResult>
    authenticateFinanceRequest: (request: Request) => Promise<AuthResult>
    createFinanceAccessToken: (id: string, value: typeof credential) => { token: string }
  }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, Buffer, process: { env: {} }, require(name: string) {
      if (name === 'server-only') return {}
      if (name.startsWith('node:')) return require(name)
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/finance-viewers') return { isFinanceViewer }
      if (name === '@/lib/admin-auth') return { getAdminEmails: () => ['owner@example.com'], getAdminProfile: async () => admin ? { id: 'user', email: 'owner@example.com', role: 'admin' } : null }
      if (name === '@/lib/supabase-server') return { supabaseAdmin: { from: () => query }, getAuthedUser: async () => user }
      throw new Error(name)
    },
  })
  return { exports, credential }
}
const viewer = { id: 'viewer', email: 'yuanma0525@gmail.com', email_confirmed_at: '2026-09-18' }

test('only the exact confirmed finance email gets scoped access; metadata cannot grant it', async () => {
  assert.equal(isFinanceViewer(' YUANMA0525@gmail.com '), true)
  assert.equal(isFinanceViewer('yuanma0525+other@gmail.com'), false)
  for (const user of [null, { ...viewer, email_confirmed_at: null }, { ...viewer, email: 'other@gmail.com', user_metadata: { email: viewer.email } }]) {
    const { exports } = authFor(user)
    const result = await exports.authenticateReconciliationUser(new Request('https://example.com'))
    assert.equal(result.response.status, user ? 403 : 401)
  }
  const { exports } = authFor(viewer)
  const result = await exports.authenticateReconciliationUser(new Request('https://example.com'))
  assert.equal(result.readOnly, false)
  assert.equal(result.adminProfile.role, 'student')
})

test('finance staff can reconcile only with a valid account-bound finance token', async () => {
  const { exports, credential } = authFor(viewer)
  const token = exports.createFinanceAccessToken(viewer.id, credential).token
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const result = await exports.authenticateFinanceRequest(new Request('https://example.com', { method, headers: { 'x-finance-authorization': token } }))
    assert.equal(result.response, undefined)
  }
  for (const supplied of ['', token + 'tampered', exports.createFinanceAccessToken('someone-else', credential).token]) {
    for (const method of ['GET', 'POST', 'PATCH']) {
      const result = await exports.authenticateFinanceRequest(new Request('https://example.com', { method, headers: { 'x-finance-authorization': supplied } }))
      assert.equal(result.response.status, 403)
    }
  }
  const result = await exports.authenticateFinanceRequest(new Request('https://example.com', { headers: { 'x-finance-authorization': token } }))
  assert.equal(result.readOnly, false)
})

test('existing administrator reconciliation writes still work', async () => {
  const { exports, credential } = authFor({ id: 'user', email: 'owner@example.com' }, true)
  const token = exports.createFinanceAccessToken('user', credential).token
  const result = await exports.authenticateFinanceRequest(new Request('https://example.com', { method: 'PATCH', headers: { 'x-finance-authorization': token } }))
  assert.equal(result.readOnly, false)
})

test('finance staff cannot create or change the shared finance password', async () => {
  const auth = { user: viewer, adminProfile: { id: viewer.id, role: 'student', email: viewer.email }, readOnly: false }
  const routes = {} as { POST: (request: Request) => Promise<Response> }
  const source = readFileSync(new URL('../app/api/admin/reconciliation/access/route.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: routes, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/supabase-server') return { supabaseAdmin: {} }
      if (name === '@/lib/finance-access') return {
        authenticateReconciliationUser: async () => auth,
        authenticateFinanceRequest: async () => auth,
        // Even a permissive manager-email fallback must not grant staff this permission.
        canManageFinancePassword: () => true,
        financeNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
      }
      throw new Error(name)
    },
  })
  for (const action of ['setup', 'change_password']) {
    assert.equal((await routes.POST(new Request('https://test/access', { method: 'POST', body: JSON.stringify({ action }) }))).status, 403)
  }
})
