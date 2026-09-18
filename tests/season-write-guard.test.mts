import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../lib/season-write-guard.ts', import.meta.url), 'utf8')

function guardFor(status: string, fail = false) {
  const client = { from(table: string) {
    const query = {
      select() { return query }, eq() { return query },
      async maybeSingle() {
        if (fail) return { data: null, error: { message: 'database unavailable' } }
        return { data: table === 'course_seasons' ? { status } : table === 'finance_reconciliation_candidates' ? { order_id: 'enrollment' } : { season_id: 'season' }, error: null }
      },
    }
    return query
  } }
  const exports: Record<string, (target: Record<string, string>) => Promise<Response | null>> = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require(name: string) {
      if (name === 'next/server') return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } }
      if (name === '@/lib/supabase-server') return { supabaseAdmin: client }
      if (name === 'server-only') return {}
      throw new Error(`Unexpected module ${name}`)
    },
  })
  return exports.archivedSeasonResponse
}

test('archived quarter rejects writes through courses, payments, attendance and finance', async () => {
  for (const key of ['seasonId', 'enrollmentId', 'assignmentId', 'attendanceId', 'transactionId']) {
    assert.equal((await guardFor('archived')({ [key]: 'record' }))?.status, 409, key)
    assert.equal(await guardFor('enrolling')({ [key]: 'record' }), null, key)
  }
})

test('quarter status lookup fails closed without blocking unrelated operations', async () => {
  assert.equal((await guardFor('enrolling', true)({ seasonId: 'season' }))?.status, 503)
  assert.equal(await guardFor('archived')({}), null)
})
