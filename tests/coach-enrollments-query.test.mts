import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../lib/coach-enrollments-server.ts', import.meta.url), 'utf8')

test('coach scope is applied in the database on every page and includes orders beyond 500', async () => {
  const calls: Array<{ table: string; operations: unknown[][] }> = []
  let syncCount = 0
  const exports = {} as { getCoachApprovedEnrollments: (id: string) => Promise<unknown[]> }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require(name: string) {
      if (name === 'server-only') return {}
      if (name === '@/lib/coach-session-duty') return { syncCoachSessionAssignments: async () => { syncCount++ } }
      if (name !== '@/lib/supabase-server') throw Error(name)
      return { supabaseAdmin: { from(table: string) {
        const call = { table, operations: [] as unknown[][] }; calls.push(call)
        const query = {
          select(...args: unknown[]) { call.operations.push(['select', ...args]); return query },
          eq(...args: unknown[]) { call.operations.push(['eq', ...args]); return query },
          in(...args: unknown[]) { call.operations.push(['in', ...args]); return query },
          order(...args: unknown[]) { call.operations.push(['order', ...args]); return query },
          async range(from: number, to: number) { call.operations.push(['range', from, to]); return { data: Array.from({ length: from === 0 ? 500 : 1 }, (_, i) => ({ id: from + i })), error: null } },
          then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: table === 'course_seasons' ? [{ id: 'active-season' }] : [{ course_season_course_id: 'own-course' }], error: null }).then(resolve) },
        }
        return query
      } } }
    },
  })
  assert.equal((await exports.getCoachApprovedEnrollments('coach-a')).length, 501)
  assert.equal(syncCount, 1)
  const pages = calls.filter(call => call.table === 'signup_leads')
  assert.equal(pages.length, 2)
  for (const page of pages) {
    const ops = JSON.parse(JSON.stringify(page.operations))
    for (const expected of [['eq', 'source', 'course_payment'], ['eq', 'status', 'approved'], ['in', 'course_season_course_id', ['own-course']], ['in', 'season_id', ['active-season']]]) {
      assert.ok(ops.some((op: unknown) => JSON.stringify(op) === JSON.stringify(expected)))
    }
  }
})
