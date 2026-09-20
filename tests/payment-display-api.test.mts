import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as policy from '../lib/payment-display.ts'

const require = createRequire(import.meta.url)
const ts = require('typescript')
type Row = { value: policy.PaymentDisplay; updated_at: string; updated_by: string }
function environment() {
  let row: Row | null = null
  let role = 'admin'
  let failure = false
  const db = { from() {
    let operation = 'read', record: Row | null = null
    const conditions: Record<string, unknown> = {}
    const query = {
      select() { return query }, eq(key: string, value: unknown) { conditions[key] = value; return query },
      insert(value: Row) { operation = 'insert'; record = value; return query },
      update(value: Row) { operation = 'update'; record = value; return query },
      async maybeSingle() {
        if (failure) return { data: null, error: { code: 'offline' } }
        if (operation === 'insert' && row) return { data: null, error: { code: '23505' } }
        if (operation === 'update' && (!row || conditions.updated_at !== row.updated_at)) return { data: null, error: null }
        if (operation !== 'read') row = record
        return { data: row, error: null }
      },
    }
    return query
  } }
  const mocks: Record<string, unknown> = {
    '@/lib/payment-display': policy,
    '@/lib/supabase-server': { supabaseAdmin: db, getAuthedUser: async () => role === 'none' ? null : { id: role, email: 'fixture@example.com' } },
    '@/lib/admin-auth': { getAdminProfile: async () => role === 'admin' ? { id: 'admin' } : null },
    'next/server': { NextResponse: Object.assign(Response, { json: Response.json }) },
  }
  function load(file: string) {
    // Route signatures are supplied by transpiled production modules.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exports: Record<string, (...args: any[]) => any> = {}
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, process, Uint8Array, require: (name: string) => name in mocks ? mocks[name] : require(name) })
    return exports
  }
  mocks['@/lib/payment-display-server'] = load('lib/payment-display-server.ts')
  const admin = load('app/api/admin/payment-info/route.ts')
  const shop = load('app/api/shop/payment-info/route.ts')
  mocks['@/lib/course-seasons-server'] = { getCurrentCourseSeason: async () => ({ id: 'season', courseOfferingIds: { fixture: true } }) }
  mocks['@/lib/course-pricing-token'] = { verifyCourseQuoteToken: () => ({ email: 'fixture@example.com', courseSlug: 'fixture', seasonId: 'season', quote: { lockedUntil: '2099-01-01' } }) }
  mocks['@/lib/enrollment-notification-policy'] = { isUuid: () => false }
  const course = load('app/api/course-enrollments/payment-info/route.ts')
  const patch = (body: unknown) => admin.PATCH(new Request('https://example.com/api/admin/payment-info', { method: 'PATCH', body: JSON.stringify(body) })) as Promise<Response>
  return { admin, shop, course, patch, setRole: (value: string) => { role = value }, fail: () => { failure = true } }
}

test('only super administrator can read and publish payment settings', async () => {
  const env = environment()
  for (const role of ['none', 'student', 'coach', 'finance']) {
    env.setRole(role)
    assert.equal((await env.admin.GET(new Request('https://example.com'))).status, role === 'none' ? 401 : 403)
    assert.equal((await env.patch({})).status, role === 'none' ? 401 : 403)
  }
  assert.equal((await env.course.POST(new Request('https://example.com', { method: 'POST', body: '{}' }))).status, 404)
})

test('published settings read back and reach shop JSON and legacy image clients; stale saves conflict', async () => {
  const env = environment()
  const info = { bankName: '驗收銀行', bankCode: '001', accountNumber: '000001234567', qrCodeUrl: '' }
  assert.equal((await env.patch({ info, version: null })).status, 400)
  const saved = await env.patch({ info, version: null, confirmed: true })
  assert.equal(saved.status, 200)
  const body = await saved.json()
  const read = await env.admin.GET(new Request('https://example.com'))
  assert.deepEqual((await read.json()).config, body.config)
  const json = await env.shop.GET({ nextUrl: new URL('https://example.com?format=json') })
  assert.equal((await json.json()).accountNumber, info.accountNumber)
  const course = await env.course.POST(new Request('https://example.com', { method: 'POST', body: JSON.stringify({ courseSlug: 'fixture', quoteToken: 'valid', format: 'json' }) }))
  assert.equal(course.status, 200)
  assert.equal((await course.json()).accountNumber, info.accountNumber)
  const image = await env.shop.GET({ nextUrl: new URL('https://example.com') })
  assert.match(await image.text(), /000001234567/)
  assert.equal((await env.patch({ info, version: null, confirmed: true })).status, 409)
  assert.equal((await env.patch({ info, version: 'stale', confirmed: true })).status, 409)
  assert.equal((await env.patch({ info: { ...info, accountNumber: '000009999999' }, version: body.version, confirmed: true })).status, 200)
})

test('payment read failures never fall back to outdated account instructions', async () => {
  const env = environment()
  env.fail()
  assert.equal((await env.admin.GET(new Request('https://example.com'))).status, 503)
  assert.equal((await env.shop.GET({ nextUrl: new URL('https://example.com?format=json') })).status, 500)
})
