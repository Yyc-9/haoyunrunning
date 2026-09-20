import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

registerHooks({ resolve(specifier, context, nextResolve) { return nextResolve(specifier.startsWith('@/') ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href : specifier, context) } })
const require = createRequire(import.meta.url)
const ts = require('typescript')
const content = await import('../lib/site-content.ts')
const managed = await import('../lib/managed-courses.ts')
const coaches = await import('../lib/coach-profiles.ts')
const seasons = await import('../lib/course-seasons.ts')
const data = await import('../lib/goodluck-data.ts')

function environment(fail = false) {
  const rows = new Map<string, unknown>()
  let writes = 0
  const db = { from(table: string) {
    let pending: Array<{ key: string; value: unknown }> | null = null
    const query = {
      upsert(value: Array<{ key: string; value: unknown }>) { pending = value; return query },
      select() { return query }, in() { return query },
      then(resolve: (value: unknown) => void) {
        if (pending) {
          writes++
          if (fail) return resolve({ data: null, error: { message: 'write failed' } })
          pending.forEach((row) => rows.set(row.key, row.value))
        }
        resolve({ data: table === 'site_content' ? [...rows].map(([key, value]) => ({ key, value })) : [], error: null })
      },
    }
    return query
  } }
  const mocks: Record<string, unknown> = {
    'next/server': { NextResponse: { json: Response.json } }, 'next/cache': { revalidateTag() {} },
    '@/lib/admin-auth': { getAdminProfile: async () => ({ id: 'fixture' }) },
    '@/lib/supabase-server': { supabaseAdmin: db, getAuthedUser: async () => ({ id: 'fixture' }) },
    '@/lib/course-seasons-server': { getCourseSeasons: async () => [] }, '@/lib/season-write-guard': { archivedSeasonResponse: async () => null },
    '@/lib/site-content': content, '@/lib/managed-courses': managed, '@/lib/coach-profiles': coaches,
    '@/lib/course-seasons': seasons, '@/lib/goodluck-data': data,
  }
  const exports = {} as { PATCH(request: Request): Promise<Response> }
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/admin/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, process, require: (name: string) => name in mocks ? mocks[name] : name.startsWith('@/') ? {} : require(name),
  })
  return { rows, writes: () => writes, save: (entries: unknown) => exports.PATCH(new Request('https://example.com', { method: 'PATCH', body: JSON.stringify({ action: 'save_site_contents', entries }) })) }
}

test('content text and media publish in one write and read back through the public content mapping', async () => {
  const env = environment()
  const response = await env.save([{ section: 'home_content', value: { ...content.defaultSiteContent.home, coursesTitle: '驗收新標題' } }, { section: 'page_media', value: content.defaultSiteContent.pageMedia }])
  assert.equal(response.status, 200)
  assert.equal(env.writes(), 1)
  assert.equal(env.rows.size, 2)
  assert.equal((await response.json()).siteContent.home.coursesTitle, '驗收新標題')
})
test('invalid second section and duplicate keys fail before writing the first section', async () => {
  for (const entries of [[{ section: 'home_content', value: {} }, { section: 'invalid', value: {} }], [{ section: 'home_content', value: {} }, { section: 'home_content', value: {} }]]) {
    const env = environment()
    assert.equal((await env.save(entries)).status, 400)
    assert.equal(env.writes(), 0)
  }
})
test('failed atomic publish never returns success or partial content', async () => {
  const env = environment(true)
  assert.equal((await env.save([{ section: 'home_content', value: {} }, { section: 'page_media', value: {} }])).status, 500)
  assert.equal(env.rows.size, 0)
})
