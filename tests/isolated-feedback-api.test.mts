import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')

function environment(mode: 'student' | 'coach' | null, access = 'not_enrolled', authenticated = true) {
  let state: Record<string, unknown> = {}
  let accessChecks = 0
  let productionReads = 0
  const account = mode ? { currentMode: mode, sandboxState: state } : null
  const mocks: Record<string, unknown> = {
    'next/server': { NextResponse: Response },
    '@/lib/supabase-server': {
      getAuthedUser: async () => authenticated ? { id: 'own-user', email: 'fixture@invalid.test' } : null,
      supabaseAdmin: { from(table: string) {
        productionReads++
        assert.equal(table, 'training_plans', 'Sandbox must not access production feedback or awards')
        const query = { select() { return query }, eq() { return query }, async maybeSingle() {
          return { data: { id: 'foreign-plan', student_id: 'other-user', coach_id: 'coach' }, error: null }
        } }
        return query
      } },
    },
    '@/lib/student-access': {
      getStudentAccessState: async () => { accessChecks++; return access },
      canAccessTrainingContent: (value: string) => value === 'approved',
    },
    '@/lib/test-account': {
      getIsolatedTestAccount: async () => account,
      updateIsolatedTestState: async (_account: unknown, update: (current: Record<string, unknown>) => Record<string, unknown>) => { state = update(state) },
    },
  }
  const exports: { POST?: (request: Request) => Promise<Response> } = {}
  const source = readFileSync(new URL('../app/api/student/training-feedback/route.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require: (name: string) => { if (!(name in mocks)) throw new Error(name); return mocks[name] },
  })
  return {
    submit: (body: unknown = { rpe: 6, distance_km: 1, feeling: 'UI test' }) => exports.POST!(new Request('https://example.com/api/student/training-feedback', { method: 'POST', body: JSON.stringify(body) })),
    inspect: () => ({ state, accessChecks, productionReads }),
  }
}

test('isolated student feedback writes only sandbox without requiring a paid enrollment', async () => {
  const env = environment('student')
  const response = await env.submit()
  assert.equal(response.status, 200)
  assert.equal((await response.json()).isolatedTest, true)
  assert.equal((env.inspect().state.trainingFeedback as unknown[]).length, 1)
  assert.equal(env.inspect().accessChecks, 0)
  assert.equal(env.inspect().productionReads, 0)
})

test('feedback still requires authentication, student test mode, and valid RPE', async () => {
  assert.equal((await environment('student', 'not_enrolled', false).submit()).status, 401)
  assert.equal((await environment('coach').submit()).status, 403)
  const env = environment('student')
  assert.equal((await env.submit({ rpe: 11 })).status, 400)
  assert.equal(env.inspect().state.trainingFeedback, undefined)
})

test('ordinary accounts retain payment gating and cannot submit another student’s plan', async () => {
  for (const state of ['not_enrolled', 'pending_transfer', 'pending_review', 'rejected']) {
    const env = environment(null, state)
    assert.equal((await env.submit({ rpe: 6, isolatedTest: true })).status, 403)
    assert.equal(env.inspect().accessChecks, 1)
    assert.equal(env.inspect().productionReads, 0)
  }
  assert.equal((await environment(null, 'approved').submit({ training_plan_id: 'foreign-plan', rpe: 6 })).status, 403)
})
