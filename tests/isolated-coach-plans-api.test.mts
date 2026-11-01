import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
type Options = { mode?: 'coach' | 'student'; authenticated?: boolean; role?: string; bound?: boolean }
type Plan = { student_id: string; week_start: string; week_number: number; target: string }

function environment(options: Options = { mode: 'coach' }) {
  let state: Record<string, unknown> = { auditMarker: 'preserve' }
  const calls: string[] = []
  const account = options.mode ? { currentMode: options.mode, get sandboxState() { return state } } : null
  const mocks: Record<string, unknown> = {
    'next/server': { NextResponse: Response },
    'node:crypto': { randomUUID },
    '@/lib/supabase-server': {
      getAuthedUser: async () => options.authenticated === false ? null : { id: 'own-coach', email: 'fixture@invalid.test' },
      supabaseAdmin: { from(table: string) {
        calls.push(table)
        let operation = 'read'
        let inserted: unknown[] = []
        const result = () => ({ data: operation === 'insert' ? inserted : [], error: null })
        const query = {
          select() { return query }, eq() { return query }, order() { return query }, or() { return query },
          delete() { calls.push('delete'); operation = 'delete'; return query },
          insert(rows: unknown[]) { calls.push('insert'); operation = 'insert'; inserted = rows; return query },
          async single() { return { data: { id: 'own-coach', role: options.role ?? 'coach' }, error: null } },
          async maybeSingle() { return { data: options.bound ? { id: 'binding' } : null, error: null } },
          async limit() { return result() },
          then(resolve: (result: { data: unknown[]; error: null }) => unknown) { return Promise.resolve(result()).then(resolve) },
        }
        return query
      } },
    },
    '@/lib/test-account': {
      getIsolatedTestAccount: async () => account,
      isolatedTestStudentFixtures: () => ['test-student-a', 'test-student-b'].map(id => ({ student: { id } })),
      updateIsolatedTestState: async (_account: unknown, update: (current: Record<string, unknown>) => Record<string, unknown>) => { state = update(state) },
    },
  }
  const exports: { GET?: (request: unknown) => Promise<Response>; POST?: (request: Request) => Promise<Response> } = {}
  const source = readFileSync(new URL('../app/api/coach/training-plans/route.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require: (name: string) => { if (!(name in mocks)) throw new Error(name); return mocks[name] },
  })
  return {
    get: (studentId = 'test-student-a') => exports.GET!({ headers: new Headers(), nextUrl: new URL(`https://example.com/api/coach/training-plans?studentId=${studentId}`) }),
    post: (overrides: Record<string, unknown> = {}) => exports.POST!(new Request('https://example.com/api/coach/training-plans', { method: 'POST', body: JSON.stringify({ studentId: 'test-student-a', weekNumber: 1, weekStart: '2026-11-02', workouts: [{ title: 'UI test', target: 'UI audit only', workoutDate: '2026-11-02' }], ...overrides }) })),
    inspect: () => ({ state, calls, plans: (state.coachTrainingPlans ?? []) as Plan[] }),
  }
}

test('isolated coach saves and reloads plans only in its sandbox', async () => {
  const env = environment()
  assert.deepEqual((await (await env.get()).json()).plans, [])
  const saved = await env.post()
  assert.equal(saved.status, 200)
  assert.equal((await saved.json()).isolatedTest, true)
  const loaded = await (await env.get()).json()
  assert.equal(loaded.plans.length, 1)
  assert.equal(loaded.plans[0].target, 'UI audit only')
  assert.match(loaded.plans[0].id, /^test-plan-/)
  assert.equal(env.inspect().state.auditMarker, 'preserve')
  assert.deepEqual(env.inspect().calls, [])
})

test('sandbox replacement preserves other students and weeks', async () => {
  const env = environment()
  await env.post()
  await env.post({ studentId: 'test-student-b' })
  await env.post({ weekNumber: 2, weekStart: '2026-11-09' })
  const replacement = await (await env.post({ workouts: [{ target: 'replacement' }] })).json()
  assert.equal(replacement.replacedCount, 1)
  assert.equal(env.inspect().plans.length, 3)
  const a = await (await env.get()).json()
  assert.deepEqual(a.plans.map((p: Plan) => p.week_start), ['2026-11-09', '2026-11-02'])
  const b = await (await env.get('test-student-b')).json()
  assert.equal(b.plans.length, 1)
  assert.equal(b.plans[0].target, 'UI audit only')
  assert.deepEqual(env.inspect().calls, [])
})

test('sandbox rejects unauthenticated users, student mode, real IDs, and invalid input', async () => {
  for (const method of ['get', 'post'] as const) {
    assert.equal((await environment({ mode: 'coach', authenticated: false })[method]()).status, 401)
    assert.equal((await environment({ mode: 'student' })[method]()).status, 403)
  }
  const env = environment()
  assert.equal((await env.get('real-student')).status, 403)
  assert.equal((await env.post({ studentId: 'real-student' })).status, 403)
  for (const body of [{ weekNumber: 0 }, { weekStart: 'bad-date' }, { workouts: [] }, { studentId: '' }]) {
    assert.equal((await env.post(body)).status, 400)
  }
  assert.equal(env.inspect().plans.length, 0)
  assert.deepEqual(env.inspect().calls, [])
})

test('ordinary accounts cannot use client flags to bypass role or student binding', async () => {
  for (const role of ['student', 'coach']) {
    const env = environment({ role })
    assert.equal((await env.get()).status, 403)
    assert.equal((await env.post({ isolatedTest: true })).status, 403)
    assert.ok(!env.inspect().calls.includes('training_plans'))
    assert.equal(env.inspect().plans.length, 0)
  }
})

test('ordinary bound coaches and administrators keep the existing production path', async () => {
  for (const options of [{ role: 'coach', bound: true }, { role: 'admin' }]) {
    const env = environment(options)
    assert.equal((await env.get('real-student')).status, 200)
    const result = await env.post({ studentId: 'real-student' })
    assert.equal(result.status, 200)
    assert.equal((await result.json()).isolatedTest, undefined)
    assert.ok(env.inspect().calls.includes('delete'))
    assert.ok(env.inspect().calls.includes('insert'))
    assert.equal(env.inspect().plans.length, 0)
    assert.equal(env.inspect().calls.includes('formal_coach_students'), options.role === 'coach')
  }
})
