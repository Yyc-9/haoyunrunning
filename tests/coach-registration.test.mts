import assert from 'node:assert/strict'
import test from 'node:test'
import { coachRegistrationFields } from '../lib/coach-registration.ts'

test('complete registration preserves explicit form fields without exposing internal payload', () => {
  const fields = coachRegistrationFields({ name: '報名姓名', goal: '舊目標', transfer_last_five: '00123', prior_attendance_claimed: false,
    payload: { lineId: 'runner', injuryHistory: '膝蓋不適', recentGoal: '半馬', invoiceDetail: '/ABC1234', agreements: { finalConsent: true }, secret: 'NEVER_EXPOSE', pricing: { token: 'PRIVATE' } } })
  const values = Object.fromEntries(fields.map(field => [field.label, field.value]))
  assert.equal(values['LINE ID'], 'runner')
  assert.equal(values['病史或運動傷害'], '膝蓋不適')
  assert.equal(values['近期目標'], '半馬')
  assert.equal(values['帳號後五碼'], '00123')
  assert.equal(values['曾提前上課'], '否')
  assert.equal(values['發票寄送資料'], '/ABC1234')
  assert.equal(values['最終確認'], '是')
  assert.ok(!JSON.stringify(fields).includes('NEVER_EXPOSE'))
  assert.ok(!JSON.stringify(fields).includes('PRIVATE'))
})

test('legacy or malformed payload does not invent consent or drop original goals', () => {
  for (const payload of [null, [], 'invalid', { agreements: null }]) {
    const values = Object.fromEntries(coachRegistrationFields({ goal: '完成全馬', payload }).map(field => [field.label, field.value]))
    assert.equal(values['近期目標'], '完成全馬')
    assert.equal(values['最終確認'], '')
  }
})
