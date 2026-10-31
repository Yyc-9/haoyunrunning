import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import * as model from '../lib/finance-shop.ts'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const id = '33333333-3333-4333-8333-333333333333'
const valid = { orderId: id, status: 'approved', reason: '已核實款項', confirmReceipt: true, updatedAt: '2026-10-31T00:00:00Z' }
function harness(deny = 0, rpcError: string | null = null, readOnly = false) {
  const calls: Array<{ name: string; args: unknown[] }> = []
  const result = { data: [], count: 0, error: null }
  const query: Record<string, unknown> = {}
  for (const name of ['select','eq','in','gte','lt','or','order']) query[name] = (...args: unknown[]) => { calls.push({ name, args }); return query }
  query.range = (...args: unknown[]) => { calls.push({ name: 'range', args }); return Promise.resolve(result) }
  const routes: Record<string, (r: Request) => Promise<Response>> = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/finance/shop/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: routes, URL, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/finance-shop') return model
      if (name === '@/lib/finance-access') return { financeNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }), authenticateFinanceRequest: async () => deny ? { response: Response.json({ error: 'denied' }, { status: deny }) } : { user: { id: 'verified-actor' }, readOnly } }
      if (name === '@/lib/supabase-server') return { supabaseAdmin: { from: (...args: unknown[]) => { calls.push({ name: 'from', args }); return query }, rpc: async (...args: unknown[]) => { calls.push({ name: 'rpc', args }); return { data: { id }, error: rpcError ? { message: rpcError } : null } } } }
      throw new Error(name)
    },
  })
  return { calls, send: (method: string, body?: unknown, qs = '') => routes[method](new Request('https://test/api/finance/shop' + qs, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })) }
}
test('finance shop GET/PATCH enforce shared finance authentication before database access', async () => {
  for (const status of [401, 403]) for (const method of ['GET', 'PATCH']) {
    const h = harness(status)
    assert.equal((await h.send(method, method === 'PATCH' ? valid : undefined)).status, status)
    assert.equal(h.calls.length, 0)
  }
  const h = harness(0, null, true)
  assert.equal((await h.send('PATCH', valid)).status, 403); assert.equal(h.calls.length, 0)
})
test('manual confirmation requires a nonempty reason, receipt acknowledgement and version', async () => {
  for (const patch of [{ reason: '' }, { reason: ' '.repeat(4) }, { reason: 'x'.repeat(1001) }, { confirmReceipt: false }, { updatedAt: '' }, { status: 'paid' }, { orderId: 'fake' }]) {
    const h = harness(); assert.equal((await h.send('PATCH', { ...valid, ...patch })).status, 400); assert.equal(h.calls.length, 0)
  }
  const h = harness(); assert.equal((await h.send('PATCH', null)).status, 400)
})
test('review derives actor from session; ignores forged amounts and separates rejection acknowledgement', async () => {
  const h = harness()
  const response = await h.send('PATCH', { ...valid, actorId: 'forged', total_amount: 1 })
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(h.calls[0].name, 'rpc')
  const args = h.calls[0].args[1] as Record<string, unknown>
  assert.equal(args.p_actor_id, 'verified-actor'); assert.equal(args.p_expected_updated_at, valid.updatedAt); assert.equal(args.total_amount, undefined)
  assert.equal((await harness().send('PATCH', { ...valid, status: 'rejected', confirmReceipt: false })).status, 200)
})
test('conflicts and paid/non-bank/unreserved orders are reported without fallback writes', async () => {
  for (const error of ['order_changed','already_approved','not_bank_transfer','inventory_review_required']) {
    const h = harness(0, error); assert.equal((await h.send('PATCH', valid)).status, 409); assert.equal(h.calls.length, 1)
  }
})
test('list uses bank-transfer scope, bounded pagination, Taiwan month and sanitized search', async () => {
  const h = harness()
  const response = await h.send('GET', undefined, '?page=2&month=2026-10&status=pending_review&search=05739%2Cstatus.eq.approved')
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(JSON.stringify(h.calls.find(c => c.name === 'in')?.args), JSON.stringify(['payment_method', ['bank_transfer','manual_review']]))
  assert.equal(JSON.stringify(h.calls.find(c => c.name === 'range')?.args), '[25,49]')
  assert.equal(h.calls.find(c => c.name === 'gte')?.args[1], '2026-09-30T16:00:00.000Z')
  assert.equal(String(h.calls.find(c => c.name === 'or')?.args[0]).split(',').length, 4)
  for (const qs of ['?page=NaN','?page=0','?status=__proto__','?month=2026-13','?orderId=bad']) assert.equal((await harness().send('GET', undefined, qs)).status, 400)
})
test('month bounds handle December rollover and invalid formats', () => {
  assert.deepEqual(model.financeShopMonthRange('2026-12'), { from: '2026-11-30T16:00:00.000Z', to: '2026-12-31T16:00:00.000Z' })
  for (const value of ['2026-00','2026-1','text','']) assert.equal(model.financeShopMonthRange(value), null)
})
