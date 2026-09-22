import test from 'node:test'
import assert from 'node:assert/strict'
import { financeRegistrationDetails, validateFinanceReceipt } from '../lib/finance-roster.ts'

test('finance reads only registration-time invoice fields', () => {
  assert.deepEqual(financeRegistrationDetails({ invoiceDelivery: ' 載具 ', invoiceDetail: '/ABC1234', taxInvoiceInfo: '公司', injuryHistory: 'private', secret: 'hidden' }), {
    invoiceDelivery: '載具', invoiceDetail: '/ABC1234', taxInvoiceInfo: '公司',
  })
  assert.deepEqual(financeRegistrationDetails(null), { invoiceDelivery: '', invoiceDetail: '', taxInvoiceInfo: '' })
})

test('manual receipt needs valid enrollment, explicit acknowledgement and a bounded audit note', () => {
  const input = { enrollmentId: '2310948c-28c9-4171-884d-c855bd7637a8', confirmReceipt: true, reason: '銀行記錄已核對' }
  assert.equal(validateFinanceReceipt(input), null)
  for (const patch of [{ enrollmentId: 'bad' }, { confirmReceipt: false }, { confirmReceipt: 'true' }, { reason: '' }, { reason: ' ' }, { reason: 'x'.repeat(1001) }]) {
    assert.ok(validateFinanceReceipt({ ...input, ...patch }))
  }
})
