import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const q4 = '00000000-0000-4000-8000-000000000004'
const q3 = '00000000-0000-4000-8000-000000000003'
type Row = Record<string, unknown>
function load(relative: string, modules: Record<string, unknown>) {
  const exports: Record<string, unknown> = {}
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, {
    exports, Buffer, Date, TextDecoder, URL, File, console,
    require(name: string) { return name === 'server-only' ? {} : modules[name] ?? require(name) },
  })
  return exports
}
const bank = load('../lib/bank-reconciliation.ts', {}) as typeof import('../lib/bank-reconciliation.ts')
const fixture = readFileSync(new URL('./fixtures/finance-bank-example.xlsx', import.meta.url))

function harness() {
  const tables: Record<string, Row[]> = {
    course_seasons: [{ id: q4, name: '第四季', code: '2026-Q4', status: 'enrolling', is_current: true }, { id: q3, name: '第三季', code: '2026-Q3', status: 'archived', is_current: false }],
    signup_leads: [
      { id: 'order-q4', source: 'course_payment', season_id: q4, name: '測試 A', preferred_course: '第四季', calculated_amount: 3600, transfer_last_five: '01234', status: 'pending_review' },
      { id: 'unpaid-q4', source: 'course_payment', season_id: q4, name: '未回報 B', preferred_course: '第四季', calculated_amount: 4200, transfer_last_five: '', status: 'pending_transfer' },
      { id: 'order-q3', source: 'course_payment', season_id: q3, name: '舊季度同後五碼', calculated_amount: 3600, transfer_last_five: '01234', status: 'approved' },
    ],
    shop_payment_accounts: [], finance_reconciliation_batches: [], finance_bank_transactions: [], finance_reconciliation_candidates: [], finance_reconciliation_audit_log: [],
  }
  let serial = 10
  const actors: string[] = []
  const client = { async rpc(name: string, args: Record<string, string>) {
    assert.equal(name, 'confirm_finance_reconciliation_transaction')
    actors.push(args.p_actor_profile_id)
    const transaction = tables.finance_bank_transactions.find(row => row.id === args.p_transaction_id)!
    const candidate = tables.finance_reconciliation_candidates.find(row => row.transaction_id === transaction.id && row.selected)!
    tables.signup_leads.find(row => row.id === candidate.order_id)!.status = 'approved'
    transaction.match_status = 'confirmed'
    return { data: { changed: true, orderKind: 'course', order: {} }, error: null }
  }, from(table: string) {
    const filters: Array<(row: Row) => boolean> = []
    let start = 0, end = Infinity, insertion: Row[] | null = null, update: Row | null = null
    const get = (row: Row, column: string) => column === 'summary->>seasonId' ? (row.summary as Row)?.seasonId : row[column]
    const query = {
      select() { return query }, order() { return query }, limit(n: number) { end = n - 1; return query },
      eq(column: string, value: unknown) { filters.push(row => get(row, column) === value); return query },
      in(column: string, values: unknown[]) { filters.push(row => values.includes(row[column])); return query },
      range(a: number, b: number) { start = a; end = b; return query },
      insert(rows: Row | Row[]) { insertion = Array.isArray(rows) ? rows : [rows]; return query },
      update(value: Row) { update = value; return query },
      delete() { return query },
      execute() {
        if (insertion) {
          const added = insertion.map(row => ({ id: `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`, ...row }))
          tables[table].push(...added); insertion = null
          return { data: added, error: null }
        }
        const rows = tables[table].filter(row => filters.every(filter => filter(row))).slice(start, end + 1)
        if (update) rows.forEach(row => Object.assign(row, update))
        return { data: rows, error: null }
      },
      async maybeSingle() { const result = query.execute(); return { ...result, data: result.data[0] ?? null } },
      async single() { return query.maybeSingle() },
      then(resolve: (value: { data: Row[]; error: null }) => unknown) { return Promise.resolve(query.execute()).then(resolve) },
    }
    return query
  } }
  const seasonModules = load('../lib/course-seasons.ts', {})
  const server = { supabaseAdmin: client }
  const context = load('../lib/finance-season-context.ts', { '@/lib/supabase-server': server, '@/lib/course-seasons': seasonModules })
  const routes = load('../app/api/admin/reconciliation/route.ts', {
    'next/server': { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    '@/lib/supabase-server': server,
    '@/lib/finance-season-context': context,
    '@/lib/bank-reconciliation': bank,
    '@/lib/finance-access': { authenticateFinanceRequest: async () => ({ adminProfile: { id: 'finance-teacher', role: 'student' } }), financeNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }) },
    '@/lib/admin-payment-notifications': {},
    '@/lib/payment-workflow': { transitionRemittanceStatus: () => 'rejected' },
    '@/lib/season-write-guard': { archivedSeasonResponse: async ({ seasonId }: { seasonId: string }) => seasonId === q3 ? Response.json({ error: 'archived' }, { status: 409 }) : null },
  }) as Record<'GET' | 'POST' | 'PATCH', (request: Request) => Promise<Response>>
  return { tables, routes, actors }
}
async function upload(routes: ReturnType<typeof harness>['routes'], seasonId: string) {
  const { workbook, sheetNames } = await bank.readBankWorkbook(fixture, 'bank.xlsx')
  const preview = bank.buildBankFilePreview({ workbook, sheetNames, fileName: 'bank.xlsx', fileSize: fixture.length, buffer: fixture })
  const form = new FormData()
  form.set('file', new File([fixture], 'bank.xlsx')); form.set('seasonId', seasonId)
  form.set('headerRow', String(preview.headerRow)); form.set('mapping', JSON.stringify(preview.suggestedMapping))
  return routes.POST(new Request('https://test/api/admin/reconciliation', { method: 'POST', body: form }))
}

test('real XLSX import matches only its quarter and includes people absent from the bank file', async () => {
  const { routes, tables } = harness()
  const response = await upload(routes, q4)
  const result = await response.json()
  assert.equal(response.status, 200, JSON.stringify(result))
  assert.equal(result.selectedSeasonId, q4)
  assert.equal(result.roster.length, 2)
  assert.equal(result.roster.find((row: Row) => row.id === 'unpaid-q4').status, 'pending_transfer')
  assert.equal(result.transactions.length, 2)
  assert.equal(result.transactions[0].source_last_five, '01234')
  assert.equal(result.transactions[0].match_status, 'matched')
  assert.equal(result.transactions[1].match_status, 'unmatched')
  assert.deepEqual(result.candidates.map((row: Row) => row.order_id), ['order-q4'])
  assert.equal(tables.signup_leads[0].status, 'pending_review', 'import alone never confirms payment')
  assert.equal(tables.signup_leads[2].status, 'approved', 'archived quarter stays unchanged')
  assert.equal((await upload(routes, q4)).status, 409, 'same file cannot be imported twice')
})

test('archived quarters reject upload without creating transactions', async () => {
  const { routes, tables } = harness()
  assert.equal((await upload(routes, q3)).status, 409)
  assert.equal(tables.finance_reconciliation_batches.length, 0)
  assert.equal(tables.finance_bank_transactions.length, 0)
})

test('unknown quarter and missing quarter cannot silently fall back on import', async () => {
  const { routes } = harness()
  assert.equal((await upload(routes, '')).status, 400)
  assert.equal((await upload(routes, '00000000-0000-4000-8000-000000000099')).status, 400)
})

test('finance confirmation updates the roster, audits the finance actor, and respects subsequent archive', async () => {
  const { routes, tables, actors } = harness()
  const imported = await (await upload(routes, q4)).json()
  const transactionId = imported.transactions[0].id
  const action = () => routes.PATCH(new Request('https://test/api/admin/reconciliation', { method: 'PATCH', body: JSON.stringify({ action: 'confirm', transactionId }) }))
  assert.equal((await action()).status, 200)
  assert.deepEqual(actors, ['finance-teacher'])
  const refreshed = await (await routes.GET(new Request(`https://test/api/admin/reconciliation?seasonId=${q4}`))).json()
  assert.equal(refreshed.roster.find((row: Row) => row.id === 'order-q4').status, 'approved')
  assert.equal(refreshed.roster.find((row: Row) => row.id === 'unpaid-q4').status, 'pending_transfer')
  tables.finance_reconciliation_batches[0].summary = { seasonId: q3 }
  assert.equal((await action()).status, 409)
  assert.equal(actors.length, 1, 'archived batch never reaches write RPC')
})
