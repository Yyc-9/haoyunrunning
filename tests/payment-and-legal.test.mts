import assert from 'node:assert/strict'
import test from 'node:test'
import {
  paymentOrderStatusDescriptions,
  paymentOrderStatusLabels,
  paymentOrderStatuses,
} from '../lib/payment.ts'
import { isShopCardPaymentEnabled } from '../lib/payment-features.ts'
import {
  COURSE_TERMS_VERSION,
  INVOICE_NOTICE_VERSION,
  PRIVACY_POLICY_VERSION,
  REFUND_POLICY_VERSION,
} from '../lib/legal-content.ts'

test('匯款狀態使用同一組正式繁體文案', () => {
  assert.deepEqual(paymentOrderStatuses, [
    'pending_transfer',
    'pending_review',
    'approved',
    'rejected',
  ])
  assert.deepEqual(paymentOrderStatusLabels['zh-TW'], {
    pending_transfer: '待完成匯款',
    pending_review: '已回報，待人工核對',
    approved: '已確認入帳',
    rejected: '匯款資料需補充',
  })
  assert.match(paymentOrderStatusDescriptions.pending_review, /等待財務人工核對/)
  assert.match(paymentOrderStatusDescriptions.approved, /財務確認入帳/)
})

test('信用卡付款必須同時有明確開關與必要密鑰', () => {
  assert.equal(isShopCardPaymentEnabled({}), false)
  assert.equal(isShopCardPaymentEnabled({
    SHOP_CARD_PAYMENTS_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'secret',
  }), false)
  assert.equal(isShopCardPaymentEnabled({
    SHOP_CARD_PAYMENTS_ENABLED: 'false',
    STRIPE_SECRET_KEY: 'secret',
    STRIPE_WEBHOOK_SECRET: 'webhook',
  }), false)
  assert.equal(isShopCardPaymentEnabled({
    SHOP_CARD_PAYMENTS_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'secret',
    STRIPE_WEBHOOK_SECRET: 'webhook',
  }), true)
})

test('報名同意記錄的政策版本皆已設定', () => {
  for (const version of [
    COURSE_TERMS_VERSION,
    REFUND_POLICY_VERSION,
    PRIVACY_POLICY_VERSION,
    INVOICE_NOTICE_VERSION,
  ]) {
    assert.match(version, /^\d{4}-\d{2}-\d{2}$/)
  }
})
