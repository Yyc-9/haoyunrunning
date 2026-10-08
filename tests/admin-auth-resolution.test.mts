import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require('typescript')
test('admin authorization uses current database identity and never falls back to token email or role on failure', async () => {
  const calls: Array<Record<string, unknown>> = []
  let data: unknown = { id: 'real-user', role: 'admin', email: 'current@example.com', name: 'Current' }
  let error: unknown = null
  const api = {} as { getAdminProfile: (user: unknown) => Promise<{ role: string; email: string } | null> }
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/admin-auth.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: api, process: { env: { ADMIN_EMAILS: ' ADMIN@example.com , bootstrap@example.com ' } },
    require(name: string) {
      assert.equal(name, '@/lib/supabase-server')
      return { supabaseAdmin: { async rpc(name: string, args: Record<string, unknown>) { assert.equal(name, 'resolve_account_role'); calls.push(args); return { data, error } } } }
    },
  })
  const staleUser = { id: 'real-user', email: 'admin@example.com', app_metadata: { role: 'admin' } }
  assert.equal((await api.getAdminProfile(staleUser))?.email, 'current@example.com')
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { p_user_id: 'real-user', p_env_emails: ['admin@example.com','bootstrap@example.com'] })
  data = { id: 'real-user', role: 'student' }
  assert.equal(await api.getAdminProfile(staleUser), null)
  data = null
  assert.equal(await api.getAdminProfile(staleUser), null)
  error = new Error('missing migration')
  await assert.rejects(api.getAdminProfile(staleUser), /missing migration/)
})
