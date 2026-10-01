// Read-only verification of the server roster against existing quarter registrations.
// Membership synchronization is skipped here; this script never changes real records.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.loadEnvFile(path.join(root, '.env.local'))
const cache = new Map()
function loadModule(filename) {
  if (cache.has(filename)) return cache.get(filename).exports
  const cachedModule = { exports: {} }
  cache.set(filename, cachedModule)
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true)
  // ES imports are hoisted; preserve this when transpiling existing late imports to CommonJS.
  const ordered = ts.factory.updateSourceFile(source, [
    ...source.statements.filter(ts.isImportDeclaration), ...source.statements.filter(node => !ts.isImportDeclaration(node)),
  ])
  const code = ts.transpileModule(ts.createPrinter().printFile(ordered), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { module: cachedModule, exports: cachedModule.exports, process, Buffer, URL, Date, console, fetch, setTimeout, clearTimeout,
    require(name) {
      if (name === 'server-only') return {}
      if (name === '@/lib/coach-session-duty') return { syncCoachSessionAssignments: async () => {} }
      if (name.startsWith('@/')) return loadModule(path.join(root, `${name.slice(2)}.ts`))
      if (name.startsWith('.')) return loadModule(path.resolve(path.dirname(filename), `${name}.ts`))
      return require(name)
    },
  }, { filename })
  return cachedModule.exports
}
const { supabaseAdmin } = loadModule(path.join(root, 'lib/supabase-server.ts'))
const { getCoachRoster } = loadModule(path.join(root, 'lib/coach-roster-server.ts'))
if (!supabaseAdmin) throw Error('Server configuration is missing')
const { data: seasons, error: seasonError } = await supabaseAdmin.from('course_seasons').select('id, code, status').neq('status', 'draft').order('code', { ascending: false })
if (seasonError) throw Error(`Could not read quarters: ${seasonError.message}`)
const [{ data: identities, error: identityError }, { data: profiles, error: profileError }] = await Promise.all([
  supabaseAdmin.from('coach_public_profiles').select('coach_key, owner_profile_id').not('owner_profile_id', 'is', null),
  supabaseAdmin.from('profiles').select('id, name, role').in('role', ['coach', 'admin']),
])
if (identityError || profileError || !profiles?.length) throw Error('Could not read coach identities')
const coaches = profiles.map(profile => ({ owner_profile_id: profile.id,
  coach_key: identities.find(identity => identity.owner_profile_id === profile.id)?.coach_key ?? profile.name ?? profile.id,
}))
for (const season of seasons ?? []) {
  const registrations = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabaseAdmin.from('signup_leads')
      .select('id, course_season_course_id, course_slug, status').eq('season_id', season.id).eq('source', 'course_payment').order('id').range(from, from + 499)
    if (error) throw Error('Could not read registration totals')
    registrations.push(...(data ?? []))
    if (!data || data.length < 500) break
  }
  for (let index = 0; index < coaches.length; index += 3) await Promise.all(coaches.slice(index, index + 3).map(async coach => {
    const roster = await getCoachRoster(coach.owner_profile_id, season.id)
    assert.equal(roster.selectedSeasonId, season.id)
    let ownCount = 0
    let otherCount = 0
    for (const course of roster.courses) {
      const expected = registrations.filter(row => row.course_season_course_id === course.id || (!row.course_season_course_id && row.course_slug === course.slug))
      const active = expected.filter(row => ['approved', 'pending_review', 'pending_transfer'].includes(row.status))
      assert.equal(course.registeredCount, active.length, `${season.code}: ${course.slug} count`)
      assert.equal(course.students.filter(student => student.visibility !== 'own' || student.status !== 'rejected').length, active.length)
      assert.deepEqual(Array.from(course.students.filter(student => student.visibility !== 'own' || student.status !== 'rejected'), student => student.id).sort(), active.map(row => row.id).sort(), 'every registration ID is present, including pending payments')
      if (course.isOwn) {
        ownCount += course.registeredCount
        for (const status of ['approved', 'pending_review', 'pending_transfer', 'rejected']) assert.equal(course.paymentCounts[status], expected.filter(row => row.status === status).length)
        for (const student of course.students) {
          assert.equal(student.visibility, 'own')
          if (student.status !== 'approved' || !['active', 'enrolling'].includes(season.status)) assert.equal(student.hasFormalAccess, false)
        }
      } else {
        otherCount += course.registeredCount
        assert.equal(course.paymentCounts, undefined)
        for (const student of course.students) assert.deepEqual(Object.keys(student).sort(), ['id', 'name', 'visibility'])
      }
    }
    console.log(`PASS ${season.code} ${coach.coach_key}: ${ownCount} own-class registrations + ${otherCount} names-only registrations; per-class counts match records`)
  }))
}
