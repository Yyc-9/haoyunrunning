import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire, registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { normalizeRegistrationQuestion, questionConfigError, registrationQuestionAnswer, registrationQuestionVersion } from '../lib/course-registration-question.ts'
import * as questionHelpers from '../lib/course-registration-question.ts'

registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith('@/') ? new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href : specifier, context)
} })
const { normalizeCourseOverrides } = await import('../lib/site-content.ts')
const { applyCourseOverrides } = await import('../lib/managed-courses.ts')

const question = { enabled: true, title: '選擇訓練組別', options: ['A組', 'B組'], required: true }
test('admin configuration accepts valid questions and rejects invalid or duplicated options', () => {
  assert.equal(questionConfigError(question), null)
  for (const q of [{ ...question, title: '' }, { ...question, options: [] }, { ...question, options: ['A', ' A '] }, { ...question, options: [''] }, { ...question, options: ['x'.repeat(121)] }]) assert.ok(questionConfigError(q))
  assert.deepEqual(normalizeRegistrationQuestion({ ...question, title: ' 題目 ', options: [' A ', 'B'] }), { ...question, title: '題目', options: ['A', 'B'] })
})
test('server rejects missing required answers, forged choices and changed configuration', () => {
  const version = registrationQuestionVersion(question)
  assert.throws(() => registrationQuestionAnswer(question, '', version), /請選擇/)
  assert.throws(() => registrationQuestionAnswer(question, 'C組', version), /選項已更新/)
  assert.throws(() => registrationQuestionAnswer(question, ['A組'], version), /有效/)
  assert.throws(() => registrationQuestionAnswer({ ...question, title: '新題目' }, 'A組', version), /題目已更新/)
  assert.throws(() => registrationQuestionAnswer(undefined, 'A組', version), /題目已更新/)
})
test('answers retain the submitted question snapshot independently of future edits', () => {
  const config = { ...question, options: [...question.options] }
  const saved = registrationQuestionAnswer(config, 'B組', registrationQuestionVersion(config))
  config.title = '改名'; config.options[1] = '新組'
  assert.equal(saved?.title, question.title)
  assert.equal(saved?.answer, 'B組')
  assert.deepEqual(saved?.options, ['A組', 'B組'])
})
test('optional or unconfigured courses do not acquire a mandatory field', () => {
  assert.equal(registrationQuestionAnswer(undefined, undefined, undefined), null)
  const optional = { ...question, required: false }
  assert.equal(registrationQuestionAnswer(optional, '', registrationQuestionVersion(optional))?.answer, '')
})

test('published course mapping preserves the question only on the configured course', () => {
  const overrides = normalizeCourseOverrides({ mixed: { name: '混合訓練', registrationQuestion: question }, running: { name: '跑班' } })
  const courses = applyCourseOverrides(overrides, { onlyConfigured: true })
  assert.deepEqual(courses.find(c => c.slug === 'mixed')?.registrationQuestion, question)
  assert.equal(courses.find(c => c.slug === 'running')?.registrationQuestion, undefined)
  const disabled = normalizeCourseOverrides({ mixed: { registrationQuestion: { ...question, enabled: false } } })
  assert.equal(disabled.mixed.registrationQuestion?.enabled, false)
  assert.deepEqual(disabled.mixed.registrationQuestion?.options, question.options)
})

function enrollmentEnvironment(config: typeof question | undefined = question) {
  const inserted: Array<{ payload: { registrationQuestionAnswer: unknown } }> = []
  const db = { from(table: string) {
    const query = {
      select() { return query }, eq() { return query }, in() { return query }, order() { return query }, limit() { return query },
      insert(row: typeof inserted[number]) { inserted.push(row); return query },
      async maybeSingle() { return { data: table === 'legacy_students' ? { name: '測試學員' } : null, error: null } },
      async single() { return { data: { id: 'created' }, error: null } },
      then(resolve: (value: unknown) => void) { resolve({ count: 0, error: null }) },
    }
    return query
  } }
  const quote = { studentType: 'returning', billingStartSessionDate: '2026-11-10', priorAttendanceClaimed: false, lockedUntil: '2099-01-01T00:00:00Z' }
  const mocks: Record<string, unknown> = {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/course-registration-question': questionHelpers,
    '@/lib/course-capacity': { SEAT_HOLDING_STATUSES: ['approved'] },
    '@/lib/course-registration': { COURSE_CAPACITY: 40, courseEnrollmentPayload: (value: unknown) => value },
    '@/lib/course-registration-form': { invoiceDeliveryOptions: ['電子郵件'] },
    '@/lib/managed-courses-server': { getManagedCourses: async () => [{ slug: 'mixed', name: '混合訓練' }] },
    '@/lib/course-seasons-server': { getCurrentCourseSeason: async () => ({ id: 'season', courseCapacities: {}, courseOfferingIds: {}, courseOverrides: { mixed: { registrationQuestion: config } } }) },
    '@/lib/supabase-server': { supabaseAdmin: db, getAuthedUser: async () => ({ id: 'user', email: 'test@example.invalid' }) },
    '@/lib/course-pricing-token': { verifyCourseQuoteToken: () => ({ email: 'test@example.invalid', courseSlug: 'mixed', seasonId: 'season', referrer: '', quote }) },
    '@/lib/payment-workflow': { transitionRemittanceStatus: () => 'pending_review' },
  }
  const require = createRequire(import.meta.url)
  const ts = require('typescript')
  const exports = {} as { POST(request: Request): Promise<Response> }
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/course-enrollments/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, process, require: (name: string) => mocks[name] ?? (name.startsWith('@/') ? {} : require(name)),
  })
  return { inserted, submit: (answer: unknown, version: unknown) => exports.POST(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({
    intent: 'direct_site_registration', courseSlug: 'mixed', registration: { studentName: '測試學員', emergencyContactName: '測試聯絡人', emergencyContactPhone: '0900000000', billingStartSessionDate: quote.billingStartSessionDate, quoteToken: 'fixture', transferLastFive: '12345', invoiceDelivery: '電子郵件', invoiceDetail: 'test@example.invalid', coachSubstituteConsent: true, rulesConsent: true, finalConsent: true, registrationAnswer: answer, registrationQuestionVersion: version },
  }) })) }
}

test('actual registration endpoint stores the validated answer snapshot and rejects bad submissions before insert', async () => {
  for (const [answer, version] of [['', registrationQuestionVersion(question)], ['C組', registrationQuestionVersion(question)], ['A組', 'outdated']]) {
    const env = enrollmentEnvironment()
    assert.equal((await env.submit(answer, version)).status, 400)
    assert.equal(env.inserted.length, 0)
  }
  const env = enrollmentEnvironment()
  assert.equal((await env.submit('B組', registrationQuestionVersion(question))).status, 201)
  assert.deepEqual(env.inserted[0].payload.registrationQuestionAnswer, { title: question.title, answer: 'B組', options: question.options, required: true })
  const disabled = enrollmentEnvironment({ ...question, enabled: false })
  assert.equal((await disabled.submit(undefined, undefined)).status, 201)
  assert.equal(disabled.inserted[0].payload.registrationQuestionAnswer, null)
})
