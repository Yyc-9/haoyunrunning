import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import { enabledSocialProviders, socialProviderScopes } from '../lib/auth-providers.ts'
import { normalizeProfileGender } from '../lib/profile-gender.ts'

test('only configured providers appear, Google first; Microsoft requests required email scope', () => {
  assert.deepEqual(enabledSocialProviders({ facebook: true, azure: true, google: true, apple: false }).map(p => p.id), ['google', 'azure'])
  assert.deepEqual(enabledSocialProviders({ azure: 'true', apple: false }), [])
  assert.equal(socialProviderScopes('azure'), 'email')
  assert.equal(socialProviderScopes('google'), undefined)
})

const require = createRequire(import.meta.url)
const ts = require('typescript')
function accountHarness(metadataFails = false) {
  const profile: Record<string, unknown> = { id: 'test-user', name: '測試跑者', email: 'test@example.com', role: 'student', pb: '' }
  const user = { id: 'test-user', email: profile.email, user_metadata: { preserved: 'keep' } as Record<string, unknown> }
  const client = {
    from(table: string) {
      const result = () => ({ data: table === 'profiles' ? profile : null, error: null })
      const query = {
        select() { return query }, eq() { return query }, order() { return query },
        update(value: Record<string, unknown>) { Object.assign(profile, value); return query },
        upsert() { return query },
        async maybeSingle() { return result() }, async single() { return result() },
        then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(resolve) },
      }
      return query
    },
    auth: { admin: { async updateUserById(id: string, input: { user_metadata: Record<string, unknown> }) {
      assert.equal(id, 'test-user')
      if (metadataFails) return { error: { message: 'test failure' } }
      user.user_metadata = input.user_metadata
      return { error: null }
    } } },
  }
  const routes = {} as Record<'GET' | 'PATCH', (request: Request) => Promise<Response>>
  const source = readFileSync(new URL('../app/api/account/me/route.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: routes, console, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/supabase-server') return { supabaseAdmin: client, getAuthedUser: async () => user }
      if (name === '@/lib/admin-auth') return { isAdminAllowlistedEmail: async () => false }
      if (name === '@/lib/test-account') return { getIsolatedTestAccount: async () => null }
      if (name === '@/lib/profile-gender') return { normalizeProfileGender }
      throw new Error(name)
    },
  })
  const save = (input: Record<string, unknown>) => routes.PATCH(new Request('https://test/account', { method: 'PATCH', body: JSON.stringify({ name: '測試跑者', ...input }) }))
  return { user, profile, routes, save }
}

test('gender and PB can be saved after signup and read back, without overwriting unrelated metadata', async () => {
  const { user, routes, save } = accountHarness()
  assert.equal((await save({ gender: 'female', pb: '半馬｜1:45:00' })).status, 200)
  const result = await (await routes.GET(new Request('https://test/account'))).json()
  assert.equal(result.profile.gender, 'female')
  assert.equal(result.profile.pb, '半馬｜1:45:00')
  assert.equal(user.user_metadata.preserved, 'keep')
  await save({ pb: '' })
  assert.equal(user.user_metadata.gender, 'female', 'older clients omitting gender preserve the saved value')
  await save({ gender: '' })
  assert.equal(user.user_metadata.gender, '', 'optional gender can be cleared')
})

test('invalid gender is rejected and failed metadata saving is not reported as success', async () => {
  assert.equal((await accountHarness().save({ gender: 'admin' })).status, 400)
  assert.equal((await accountHarness(true).save({ gender: 'male' })).status, 500)
  assert.equal(normalizeProfileGender(undefined), '')
})
