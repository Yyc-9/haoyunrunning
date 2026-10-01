import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(path: string, modules: Record<string, unknown> = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require: (name: string) => { if (!(name in modules)) throw Error(name); return modules[name] },
  })
  return exports
}
const { buildCoachRosterCourses, coachRosterSummary } = load('../lib/coach-roster.ts', {
  './coach-registration': load('../lib/coach-registration.ts'), './course-capacity': load('../lib/course-capacity.ts'),
}) as typeof import('../lib/coach-roster')
const courses = [{ id: 'own', slug: 'own-class', name: '任課班' }, { id: 'other', slug: 'other-class', name: '其他班' }]
const enrollment = (id: string, status = 'approved', course = 'own') => ({
  id, name: `學員 ${id}`, source: 'course_payment', season_id: 'q4', course_season_course_id: course,
  course_slug: `${course}-class`, status, email: 'shared@example.invalid', phone: '0900-secret',
  goal: 'private-goal', notes: 'private-note', payload: { lineId: 'private-line', injuryHistory: 'private-medical', invoiceDetail: 'private-invoice' },
})

test('all registrations appear regardless of payment, profile or account binding', () => {
  const rows = [enrollment('a'), enrollment('b', 'pending_review'), enrollment('c', 'pending_transfer')]
  const result = buildCoachRosterCourses({ seasonId: 'q4', courses, ownCourseIds: ['own'], registrations: rows, ownDetails: rows })
  assert.equal(result[0].students.length, 3)
  assert.equal(result[0].registeredCount, 3)
  assert.equal(result[0].paymentCounts?.approved, 1)
  assert.equal(result[0].paymentCounts?.pending_review, 1)
  assert.equal(result[0].paymentCounts?.pending_transfer, 1)
  for (const student of result[0].students) {
    assert.equal(student.visibility, 'own')
    if (student.visibility === 'own') { assert.equal(student.hasFormalAccess, false); assert.equal(student.recentFeedback.length, 0) }
  }
})
test('shared emails do not hide registrations; the same enrollment ID is counted once', () => {
  const a = enrollment('a'), b = enrollment('b'), c = enrollment('c', 'approved', 'other')
  const result = buildCoachRosterCourses({ seasonId: 'q4', courses, ownCourseIds: ['own', 'other'], registrations: [a, b, a, c] })
  assert.equal(result[0].registeredCount, 2)
  assert.equal(result[1].registeredCount, 1)
  assert.equal(coachRosterSummary(result).registeredCount, 3)
})
test('other classes contain names only even when private data and formal profiles are provided', () => {
  const row = enrollment('other-paid', 'approved', 'other')
  const result = buildCoachRosterCourses({ seasonId: 'q4', courses, ownCourseIds: ['own'], registrations: [row], ownDetails: [row], formalProfiles: [{ email: row.email, pb: 'private-pb', recentFeedback: [] }] })[1]
  assert.equal(result.registeredCount, 1)
  assert.deepEqual(Object.keys(result.students[0]).sort(), ['id', 'name', 'visibility'])
  assert.equal(result.paymentCounts, undefined)
  for (const secret of ['private-goal', '0900-secret', 'shared@example.invalid', 'private-line', 'private-medical', 'private-invoice', 'private-note', 'private-pb', 'approved']) {
    assert.ok(!JSON.stringify(result).includes(secret), secret)
  }
})
test('pending registration cannot gain feedback or formal access from an approved profile in another class', () => {
  const pending = enrollment('a', 'pending_review')
  const paid = enrollment('b', 'approved', 'other')
  const result = buildCoachRosterCourses({ seasonId: 'q4', courses, ownCourseIds: ['own', 'other'], registrations: [pending, paid], ownDetails: [pending, paid], formalProfiles: [{ email: pending.email, pb: 'PB', recentFeedback: [] }] })
  const student = result[0].students[0]
  assert.equal(student.visibility, 'own')
  if (student.visibility === 'own') { assert.equal(student.hasFormalAccess, false); assert.equal(student.pb, '') }
})
test('returned duplicate records remain available to their coach but do not inflate counts', () => {
  const result = buildCoachRosterCourses({ seasonId: 'q4', courses, ownCourseIds: ['own'], registrations: [enrollment('a'), enrollment('duplicate', 'rejected'), enrollment('other-duplicate', 'rejected', 'other')] })
  assert.equal(result[0].registeredCount, 1)
  assert.equal(result[0].students.length, 2)
  assert.equal(result[0].paymentCounts?.rejected, 1)
  assert.equal(result[1].students.length, 0)
  assert.equal(result[1].registeredCount, 0)
})
test('quarter, source and offering scope are enforced; legacy null IDs can use a scoped slug', () => {
  const result = buildCoachRosterCourses({ seasonId: 'q4', courses, ownCourseIds: ['own'], registrations: [
    { ...enrollment('old'), season_id: 'q3' }, { ...enrollment('inquiry'), source: 'group_class' },
    { ...enrollment('foreign'), course_season_course_id: 'unknown' },
    { ...enrollment('legacy'), course_season_course_id: null },
  ] })
  assert.equal(result[0].registeredCount, 1)
  assert.equal(result[0].students[0].id, 'legacy')
})
test('historical rosters do not expose current feedback or formal access', () => {
  const row = enrollment('a')
  const result = buildCoachRosterCourses({ seasonId: 'q4', courses, ownCourseIds: ['own'], registrations: [row], ownDetails: [row], allowFormalAccess: false,
    formalProfiles: [{ email: row.email, pb: 'PB', recentFeedback: [] }] })[0].students[0]
  if (result.visibility === 'own') { assert.equal(result.hasFormalAccess, false); assert.equal(result.pb, '') }
})

test('server reads all pages and only fetches private fields for assigned enrollments', async () => {
  const registrations = Array.from({ length: 501 }, (_, i) => enrollment(`lead-${i}`, 'pending_transfer', i === 0 ? 'own' : 'other'))
  const calls: { table: string; columns: string; ops: unknown[][] }[] = []
  let syncCount = 0
  const supabaseAdmin = { from(table: string) {
    const call = { table, columns: '', ops: [] as unknown[][] }; calls.push(call)
    const query = {
      select(columns: string) { call.columns = columns; return query },
      eq(...args: unknown[]) { call.ops.push(['eq', ...args]); return query },
      in(...args: unknown[]) { call.ops.push(['in', ...args]); return query },
      order(...args: unknown[]) { call.ops.push(['order', ...args]); return query },
      async range(from: number, to: number) { call.ops.push(['range', from, to]); return { data: registrations.slice(from, to + 1), error: null } },
      then(resolve: (value: unknown) => unknown) {
        const ids = call.ops.find(op => op[0] === 'in' && op[1] === 'id')?.[2] as string[] | undefined
        return Promise.resolve({ data: table === 'course_coach_memberships' ? [{ course_season_course_id: 'own' }] : registrations.filter(row => ids?.includes(row.id)), error: null }).then(resolve)
      },
    }; return query
  } }
  const { getCoachRoster } = load('../lib/coach-roster-server.ts', {
    'server-only': {}, '@/lib/supabase-server': { supabaseAdmin },
    '@/lib/course-seasons-server': { getCourseSeasons: async () => [{ id: 'q4', code: '2026-Q4', name: '第四季', status: 'enrolling', isCurrent: true, courseOfferingIds: { 'own-class': 'own', 'other-class': 'other' }, courseOverrides: {} }] },
    '@/lib/course-seasons': { overviewSeasonId: () => 'q4' }, '@/lib/coach-session-duty': { syncCoachSessionAssignments: async () => { syncCount++ } },
    '@/lib/goodluck-data': { allCourses: [] }, '@/lib/coach-roster': { buildCoachRosterCourses, rosterCourseId: (row: Record<string, unknown>) => row.course_season_course_id },
  }) as typeof import('../lib/coach-roster-server')
  const result = await getCoachRoster('coach-a')
  assert.equal(syncCount, 1)
  assert.equal(result.courses[0].registeredCount, 1)
  assert.equal(result.courses[1].registeredCount, 500)
  const pages = calls.filter(call => call.ops.some(op => op[0] === 'range'))
  assert.equal(pages.length, 2)
  for (const page of pages) { assert.ok(page.ops.some(op => op[0] === 'eq' && op[1] === 'season_id' && op[2] === 'q4')); assert.ok(!page.columns.includes('email')); assert.ok(!page.columns.includes('payload')) }
  const privateRead = calls.find(call => call.columns.includes('payload'))!
  assert.deepEqual(JSON.parse(JSON.stringify(privateRead.ops.find(op => op[0] === 'in' && op[1] === 'id'))), ['in', 'id', ['lead-0']])
  assert.ok(calls[0].ops.some(op => op[0] === 'eq' && op[1] === 'coach_id' && op[2] === 'coach-a'))
})

test('archived classes recover explicit historical teaching permissions without granting unknown classes', async () => {
  const registrations = ['own', 'taught', 'other'].map(id => ({ ...enrollment(id, 'approved', id), season_id: 'q3' }))
  const calls: { table: string; columns: string; ops: unknown[][] }[] = []
  let syncCount = 0
  const supabaseAdmin = { from(table: string) {
    const call = { table, columns: '', ops: [] as unknown[][] }; calls.push(call)
    const query = {
      select(columns: string) { call.columns = columns; return query },
      eq(...args: unknown[]) { call.ops.push(['eq', ...args]); return query },
      in(...args: unknown[]) { call.ops.push(['in', ...args]); return query },
      order() { return query },
      async range() { return { data: registrations, error: null } },
      then(resolve: (value: unknown) => unknown) {
        const ids = call.ops.find(op => op[0] === 'in' && op[1] === 'id')?.[2] as string[] | undefined
        const data = table === 'course_coach_memberships' ? []
          : table === 'coach_public_profiles' ? [{ coach_key: 'saved-coach' }]
          : table === 'coach_session_assignments' ? [{ course_season_course_id: 'taught' }, { course_season_course_id: 'current-quarter-only' }]
          : registrations.filter(row => ids?.includes(row.id))
        return Promise.resolve({ data, error: null }).then(resolve)
      },
    }; return query
  } }
  const { getCoachRoster } = load('../lib/coach-roster-server.ts', {
    'server-only': {}, '@/lib/supabase-server': { supabaseAdmin },
    '@/lib/course-seasons-server': { getCourseSeasons: async () => [{ id: 'q3', code: '2026-Q3', name: '第三季', status: 'archived', isCurrent: false,
      courseOfferingIds: { 'own-class': 'own', 'taught-class': 'taught', 'other-class': 'other' },
      courseOverrides: { 'own-class': { coachKeys: ['saved-coach'] } },
    }] },
    '@/lib/course-seasons': { overviewSeasonId: () => 'q3' }, '@/lib/coach-session-duty': { syncCoachSessionAssignments: async () => { syncCount++ } },
    '@/lib/goodluck-data': { allCourses: [] }, '@/lib/coach-roster': { buildCoachRosterCourses, rosterCourseId: (row: Record<string, unknown>) => row.course_season_course_id },
  }) as typeof import('../lib/coach-roster-server')
  const result = await getCoachRoster('coach-a', 'q3')
  assert.equal(syncCount, 0, 'reading an archived roster must not synchronize or change current assignments')
  assert.deepEqual(Array.from(result.courses, course => course.isOwn), [true, true, false])
  for (const course of result.courses.slice(0, 2)) {
    const student = course.students[0]
    assert.equal(student.visibility, 'own')
    if (student.visibility === 'own') { assert.equal(student.email, 'shared@example.invalid'); assert.equal(student.hasFormalAccess, false) }
  }
  assert.deepEqual(Object.keys(result.courses[2].students[0]).sort(), ['id', 'name', 'visibility'])
  const assignments = calls.find(call => call.table === 'coach_session_assignments')!
  assert.ok(assignments.ops.some(op => op[0] === 'eq' && op[1] === 'scheduled_coach_id' && op[2] === 'coach-a'))
  assert.ok(assignments.ops.some(op => op[0] === 'eq' && op[1] === 'season_id' && op[2] === 'q3'))
  const identities = calls.find(call => call.table === 'coach_public_profiles')!
  assert.ok(identities.ops.some(op => op[0] === 'eq' && op[1] === 'owner_profile_id' && op[2] === 'coach-a'))
  assert.equal(calls.some(call => call.table === 'formal_coach_students' || call.table === 'training_feedback'), false)
})

for (const scenario of [
  { name: 'anonymous', user: null, role: 'coach', status: 401 },
  { name: 'ordinary student', user: { id: 'student' }, role: 'student', status: 403 },
  { name: 'coach', user: { id: 'coach-a' }, role: 'coach', status: 200 },
] as const) test(`roster API ${scenario.name} authorization cannot be overridden with query parameters`, async () => {
  let calledCoach = ''
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { role: scenario.role }, error: null }) }
  const { GET } = load('../app/api/coach/roster/route.ts', {
    'next/server': { NextResponse: { json: (body: unknown, options: { status?: number; headers: unknown }) => ({ body, status: options.status ?? 200, headers: options.headers }) } },
    '@/lib/supabase-server': { supabaseAdmin: { from: () => query }, getAuthedUser: async () => scenario.user },
    '@/lib/test-account': { getIsolatedTestAccount: async () => null },
    '@/lib/coach-roster-preview': { coachRosterPreview: {} },
    '@/lib/coach-roster-server': { getCoachRoster: async (coachId: string) => { calledCoach = coachId; return { courses: [] } } },
  }) as { GET: (request: unknown) => Promise<{ status: number; headers: Record<string, string> }> }
  const result = await GET({ headers: new Headers(), nextUrl: new URL('https://example.invalid/api/coach/roster?coachId=other-coach&ownCourseIds=other') })
  assert.equal(result.status, scenario.status)
  assert.equal(result.headers['Cache-Control'], 'private, no-store')
  assert.equal(calledCoach, scenario.status === 200 ? 'coach-a' : '')
})
