import assert from 'node:assert/strict'
import test from 'node:test'
import { legacyPaymentDisplay, validatePaymentDisplay, paymentDisplaySvg } from '../lib/payment-display.ts'

test('payment settings preserve leading zeros and allow removing a QR image', () => {
  assert.equal(validatePaymentDisplay(legacyPaymentDisplay).accountNumber, legacyPaymentDisplay.accountNumber)
  assert.equal(validatePaymentDisplay(legacyPaymentDisplay).qrCodeUrl, '')
})
test('changing the bank account cannot keep the original transfer QR', () => {
  assert.equal(validatePaymentDisplay({ ...legacyPaymentDisplay, useLegacyQr: true }).useLegacyQr, true)
  assert.throws(() => validatePaymentDisplay({ ...legacyPaymentDisplay, accountNumber: '123456789', useLegacyQr: true }))
})
test('invalid payment fields and unsafe QR URLs cannot be published', () => {
  for (const change of [{ bankCode: '82' }, { accountNumber: '1234' }, { qrCodeUrl: 'javascript:alert(1)' }, { qrCodeUrl: 'https://user:password@example.com/qr.png' }]) assert.throws(() => validatePaymentDisplay({ ...legacyPaymentDisplay, ...change }))
})
test('legacy image clients receive escaped current bank information', () => {
  const svg = paymentDisplaySvg({ ...legacyPaymentDisplay, bankName: '<script>銀行&</script>', accountNumber: '111111111' })
  assert.ok(svg.includes('111111111'))
  assert.ok(svg.includes('&lt;script&gt;'))
  assert.ok(!svg.includes('<script>'))
})
