import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

// Run against a local server with .env.local loaded. All writes use generated fixture IDs.
const base = process.env.COACH_QA_BASE || 'http://localhost:3100'
if (!['http://localhost:3100', 'http://127.0.0.1:3100', 'https://nurturerunningteam.com'].includes(base)) throw Error('Unexpected acceptance origin')
const dir = '/tmp/haoyun-coach-registration-20260920'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const db = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const must = async operation => { const r = await operation; if (r.error) throw Error(r.error.message); return r.data }
const mode = process.argv[2] || 'verify'
await mkdir(dir, { recursive: true, mode: 0o700 })
const path = `${dir}/state.json`
let state
try { state = JSON.parse(await readFile(path, 'utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e }
const save = () => writeFile(path, JSON.stringify(state), { mode: 0o600 })
const cleanup = async () => {
  if (!state) return
  if (state.batchId) {
    await must(db.from('finance_reconciliation_audit_log').delete().eq('batch_id', state.batchId))
    await must(db.from('finance_reconciliation_batches').delete().eq('id', state.batchId))
  }
  await must(db.from('signup_leads').delete().eq('season_id', state.seasonId))
  await must(db.from('signup_leads').delete().eq('notes', state.marker))
  await must(db.from('course_seasons').delete().eq('id', state.seasonId))
  for (const account of state.accounts) {
    await must(db.from('coach_public_profiles').delete().eq('owner_profile_id', account.id))
    const r = await db.auth.admin.deleteUser(account.id); if (r.error && !/not found/i.test(r.error.message)) throw r.error
  }
  const remaining = await must(db.from('signup_leads').select('id').eq('notes', state.marker))
  assert.equal(remaining.length, 0)
  state.cleaned = true; state.accounts = state.accounts.map(({ label, id }) => ({ label, id })); await save()
  console.log('CLEANUP PASS: fixture enrollments, courses, accounts removed')
}
if (mode === 'cleanup') { await cleanup(); process.exit(0) }
if (state && !state.cleaned) throw Error('An existing fixture requires cleanup first')
state = { marker: `coach-registration-${randomUUID()}`, seasonId: randomUUID(), accounts: [], courses: [randomUUID(), randomUUID()], leads: [randomUUID(), randomUUID()], results: [] }
await save()
const clients = {}
const check = async (name, fn) => { await fn(); state.results.push(name); await save(); console.log('PASS', name) }
const api = async (role, route, body, method = 'POST') => {
  const response = await fetch(base + route, { method: body ? (route === '/api/admin' ? 'PATCH' : method) : 'GET', headers: { authorization: `Bearer ${clients[role]?.token || ''}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  return { status: response.status, data: await response.json() }
}
const ok = async (role, route) => { const r = await api(role, route); assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data }
const setCourse = async (coachLabel, dates = []) => must(db.from('course_season_courses').update({ course_data: { name: '驗收隔離 A 班', templateSlug: 'zhubei-night-run-monday', active: false, coachKeys: [`${state.marker}-${coachLabel}`] }, billing_config: { scheduleReady: false, sessionDates: dates } }).eq('id', state.courses[0]))
try {
  for (const label of ['student', 'coach-a', 'coach-b', 'admin']) {
    const email = `${state.marker}-${label}@example.com`, password = randomBytes(24).toString('base64url')
    const result = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: `驗收-${label}`, acceptance_fixture: state.marker } }); if (result.error) throw result.error
    const account = { label, id: result.data.user.id, email, password }; state.accounts.push(account); await save()
    await must(db.from('profiles').upsert({ id: account.id, email, role: label.startsWith('coach') ? 'coach' : label === 'admin' ? 'admin' : 'student', name: `驗收-${label}` }))
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const login = await client.auth.signInWithPassword({ email, password }); if (login.error) throw login.error
    clients[label] = { client, token: login.data.session.access_token, session: login.data.session }
    if (label.startsWith('coach')) await must(db.from('coach_public_profiles').insert({ coach_key: `${state.marker}-${label}`, owner_profile_id: account.id, display_name: `驗收-${label}`, published: false, profile_initialized: true }))
  }
  await must(db.from('course_seasons').insert({ id: state.seasonId, code: '1999-Q4', name: state.marker, status: 'active', is_current: false, starts_on: '2026-09-20', ends_on: '2026-12-31' }))
  for (let i = 0; i < 2; i++) await must(db.from('course_season_courses').insert({ id: state.courses[i], season_id: state.seasonId, course_slug: `${state.marker}-${i}`, capacity: 2, course_data: { name: `驗收隔離 ${i ? 'B' : 'A'} 班`, templateSlug: 'zhubei-night-run-monday', active: false, coachKeys: [`${state.marker}-coach-${i ? 'b' : 'a'}`] }, billing_config: { scheduleReady: false, sessionDates: [] } }))
  const student = state.accounts.find(a => a.label === 'student')
  for (let i = 0; i < 2; i++) await must(db.from('signup_leads').insert({ id: state.leads[i], source: 'course_payment', name: '驗收報名姓名', email: student.email, phone: '0900000000', preferred_course: `驗收隔離 ${i ? 'B' : 'A'} 班`, status: 'pending_review', season_id: state.seasonId, course_season_course_id: state.courses[i], course_slug: `${state.marker}-${i}`, course_capacity: 2, calculated_amount: 0, amount_text: '0', notes: state.marker, goal: '完成半馬', transfer_last_five: '00123', payload: { lineId: `runner-${i}`, emergencyContactName: '驗收聯絡人', emergencyContactPhone: '0900000001', injuryHistory: `膝蓋紀錄-${i}`, recentGoal: '完成半馬', runningStatus: '每週三次', recentChallenge: '10 公里', invoiceDelivery: '手機條碼載具', invoiceDetail: '/TEST001', taxInvoiceInfo: '測試抬頭', referrer: '測試推薦人', agreements: { coachSubstituteConsent: true, rulesConsent: true, finalConsent: true }, internalSecret: 'MUST_NOT_APPEAR' } }))
  if (mode !== 'visual') {
  await check('unauthenticated and student cannot read coach data', async () => {
    assert.equal((await api('none', '/api/coach/students')).status, 401)
    assert.equal((await api('student', '/api/signup-leads')).status, 403)
  })
  await check('pending enrollment is absent from both coach lists', async () => {
    assert.equal((await ok('coach-a', '/api/signup-leads')).leads.length, 0)
    assert.equal((await ok('coach-a', '/api/coach/students')).students.length, 0)
  })
  const review = id => ({ action: 'review_order', orderId: id, orderKind: 'course', status: 'approved', confirmReceipt: true, reviewNote: `隔離零金額驗收 ${state.marker}` })
  await check('coach cannot approve through either endpoint', async () => {
    assert.equal((await api('coach-a', '/api/admin', review(state.leads[0]))).status, 403)
    assert.equal((await api('coach-a', '/api/signup-leads', { id: state.leads[0], status: 'approved' }, 'PATCH')).status, 403)
  })
  await check('admin approval requires receipt confirmation', async () => {
    assert.equal((await api('admin', '/api/admin', { ...review(state.leads[0]), confirmReceipt: false })).status, 400)
  })
  await check('admin confirms zero-value fixture and approval is repeat-safe', async () => {
    for (let i = 0; i < 2; i++) { const r = await api('admin', '/api/admin', review(state.leads[0])); assert.equal(r.status, 200, JSON.stringify(r.data)) }
  })
  await check('approved enrollment assigned even before session dates are configured', async () => {
    assert.equal((await ok('coach-a', '/api/signup-leads')).leads.length, 1)
    assert.equal((await ok('coach-a', '/api/coach/students')).students.length, 1)
    assert.equal((await ok('coach-b', '/api/signup-leads')).leads.length, 0)
  })
  await check('complete form values survive and internal payload stays private', async () => {
    const r = (await ok('coach-a', '/api/coach/students')).students[0]
    const fields = Object.fromEntries(r.enrollments[0].fields.map(f => [f.label, f.value]))
    assert.equal(fields['LINE ID'], 'runner-0'); assert.equal(fields['病史或運動傷害'], '膝蓋紀錄-0')
    assert.equal(fields['帳號後五碼'], '00123'); assert.equal(fields['發票寄送資料'], '/TEST001')
    assert.equal(fields['最終確認'], '是'); assert.ok(!JSON.stringify(r).includes('MUST_NOT_APPEAR'))
  })
  await check('same student in another class does not disclose that class registration', async () => {
    assert.equal((await api('admin', '/api/admin', review(state.leads[1]))).status, 200)
    const a = (await ok('coach-a', '/api/coach/students')).students[0]
    assert.equal(a.enrollments.length, 1); assert.equal(a.enrollments[0].id, state.leads[0])
  })
  await check('finance reconciliation engine confirms enrollment and is repeat-safe', async () => {
    const actor = state.accounts.find(a => a.label === 'admin')
    const leadId = randomUUID(), transactionId = randomUUID()
    state.batchId = randomUUID(); await save()
    await must(db.from('signup_leads').insert({ id: leadId, source: 'course_payment', name: '隔離財務驗收', email: `finance-${state.marker}@example.com`, status: 'pending_review', season_id: state.seasonId, course_season_course_id: state.courses[0], course_slug: `${state.marker}-0`, course_capacity: 2, calculated_amount: 1, amount_text: '1', transfer_last_five: '00123', notes: state.marker }))
    await must(db.from('finance_reconciliation_batches').insert({ id: state.batchId, file_name: 'SYNTHETIC-QA-NO-REAL-PAYMENT.csv', file_sha256: randomBytes(32).toString('hex'), uploaded_by: actor.id, summary: { seasonId: state.seasonId, acceptance_fixture: state.marker } }))
    await must(db.from('finance_bank_transactions').insert({ id: transactionId, batch_id: state.batchId, row_number: 1, amount: 1, source_last_five: '00123', transaction_fingerprint: randomBytes(32).toString('hex'), match_status: 'matched', note: 'SYNTHETIC TEST ONLY - no actual bank transaction' }))
    await must(db.from('finance_reconciliation_candidates').insert({ transaction_id: transactionId, order_kind: 'course', order_id: leadId, expected_amount: 1, transfer_last_five: '00123', order_status: 'pending_review', match_quality: 'exact', selected: true }))
    await must(db.from('course_season_courses').update({ capacity: 1 }).eq('id', state.courses[0]))
    const full = await db.rpc('confirm_finance_reconciliation_transaction', { p_transaction_id: transactionId, p_actor_profile_id: actor.id })
    assert.match(full.error?.message || '', /course capacity reached/)
    assert.equal((await must(db.from('signup_leads').select('status').eq('id', leadId).single())).status, 'pending_review')
    assert.equal((await must(db.from('finance_bank_transactions').select('match_status').eq('id', transactionId).single())).match_status, 'matched')
    await must(db.from('course_season_courses').update({ capacity: 2 }).eq('id', state.courses[0]))
    for (let i = 0; i < 2; i++) {
      const result = await must(db.rpc('confirm_finance_reconciliation_transaction', { p_transaction_id: transactionId, p_actor_profile_id: actor.id }))
      assert.equal(result.changed, i === 0)
      if (i === 0) assert.equal(result.order.status, 'approved')
    }
    const rows = (await ok('coach-a', '/api/signup-leads')).leads
    assert.equal(rows.filter(row => row.id === leadId).length, 1)
    assert.equal((await ok('coach-a', '/api/coach/students')).students.length, 1)
    await must(db.from('finance_reconciliation_audit_log').delete().eq('batch_id', state.batchId))
    await must(db.from('finance_reconciliation_batches').delete().eq('id', state.batchId))
    await must(db.from('signup_leads').delete().eq('id', leadId))
  })
  await check('unscoped activity registrations and direct database access stay private', async () => {
    await must(db.from('signup_leads').insert({ source: 'group_class', name: '隔離活動', notes: state.marker, status: 'approved' }))
    assert.equal((await ok('coach-a', '/api/signup-leads')).leads.length, 1)
    const r = await clients['coach-a'].client.from('signup_leads').select('id').in('id', state.leads)
    assert.ok(r.error || r.data.length === 0)
  })
  await check('coach replacement revokes old access without session dates', async () => {
    await setCourse('coach-b')
    assert.equal((await ok('coach-a', '/api/signup-leads')).leads.length, 0)
    assert.equal((await ok('coach-a', '/api/coach/students')).students.length, 0)
    assert.equal((await ok('coach-b', '/api/signup-leads')).leads.length, 2)
  })
  await check('archived season revokes both lists and forbids approval', async () => {
    await must(db.from('course_seasons').update({ status: 'archived' }).eq('id', state.seasonId))
    assert.equal((await ok('coach-b', '/api/signup-leads')).leads.length, 0)
    assert.equal((await ok('coach-b', '/api/coach/students')).students.length, 0)
    assert.equal((await api('admin', '/api/admin', review(state.leads[0]))).status, 409)
  })
  } else {
    for (const id of state.leads) {
      const r = await api('admin', '/api/admin', { action: 'review_order', orderId: id, orderKind: 'course', status: 'approved', confirmReceipt: true, reviewNote: state.marker })
      assert.equal(r.status, 200)
    }
  }
  await must(db.from('course_seasons').update({ status: 'active' }).eq('id', state.seasonId)); await setCourse('coach-a')
  if (['browser', 'visual'].includes(mode)) {
    const cli = '/Users/yangyichen/.codex/skills/playwright/scripts/playwright_cli.sh'
    const run = (...args) => {
      let output
      try { output = execFileSync(cli, ['-s=coach-registration', ...args], { encoding: 'utf8', timeout: 60000 }) }
      catch (error) { throw Error(String(error.stdout || error.message)) }
      if (output.includes('### Error')) throw Error(output)
      return output
    }
    const storagePath = `${dir}/browser-state.json`
    const key = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
    await writeFile(storagePath, JSON.stringify({ cookies: [], origins: [{ origin: base, localStorage: [{ name: key, value: JSON.stringify(clients['coach-a'].session) }] }] }), { mode: 0o600 })
    try {
      run('open', base + '/coach/signups')
      run('state-load', storagePath)
      run('goto', base + '/coach/signups')
      run('run-code', `async (page) => { await page.getByRole('heading', { name: '驗收報名姓名', exact: true }).waitFor({ timeout: 30000 }); }`)
      const snapshot = run('snapshot')
      await writeFile(`${dir}/browser-snapshot-output.txt`, snapshot)
      const snapshotPath = snapshot.match(/\[Snapshot\]\(([^)]+)\)/)?.[1]
      const tree = snapshotPath ? await readFile(snapshotPath, 'utf8') : snapshot
      const ref = tree.match(/.*查看完整報名資料.*\[ref=([a-z0-9]+)\]/)?.[1]
      if (!ref) throw Error('Missing complete registration disclosure')
      run('click', ref)
      await mkdir('output/playwright/coach-registration-20260920', { recursive: true })
      await check('desktop and mobile browser show full registration without overflow', async () => {
        run('run-code', `async (page) => {
          for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 900 });
            await page.getByText('runner-0', { exact: true }).waitFor();
            await page.getByText('膝蓋紀錄-0', { exact: true }).waitFor();
            if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Horizontal overflow');
            await page.screenshot({ path: 'output/playwright/coach-registration-20260920/signup-' + width + '.png', fullPage: true });
          }
        }`)
      })
      run('goto', base + '/coach/students')
      run('run-code', `async (page) => { await page.getByText('驗收-student', { exact: true }).waitFor({ timeout: 30000 }); }`)
      const studentSnapshot = run('snapshot')
      const studentPath = studentSnapshot.match(/\[Snapshot\]\(([^)]+)\)/)?.[1]
      const studentTree = studentPath ? await readFile(studentPath, 'utf8') : studentSnapshot
      const studentRef = studentTree.match(/.*查看完整報名資料.*\[ref=([a-z0-9]+)\]/)?.[1]
      if (!studentRef) throw Error('Student list lacks registration details')
      run('click', studentRef)
      await check('student card opens its own course registration in browser', async () => {
        run('run-code', `async (page) => { await page.getByText('runner-0', { exact: true }).waitFor(); await page.screenshot({ path: 'output/playwright/coach-registration-20260920/student-390.png', fullPage: true }); }`)
      })
    } finally {
      run('localstorage-clear'); run('close'); await unlink(storagePath)
    }
  }
  await writeFile(`${dir}/${mode}-result.json`, JSON.stringify({ passed: state.results }), { mode: 0o600 })
  await cleanup()
} catch (error) {
  console.error(error.message)
  await cleanup()
  process.exitCode = 1
} finally {
  for (const { client } of Object.values(clients)) await client.auth.signOut()
}
