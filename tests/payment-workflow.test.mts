import assert from 'node:assert/strict'
import test from 'node:test'

import { transitionRemittanceStatus } from '../lib/payment-workflow.ts'

test('學員回報後五碼後只能進入待人工核對', () => {
  assert.equal(
    transitionRemittanceStatus('pending_transfer', 'report_transfer'),
    'pending_review',
  )
  assert.equal(
    transitionRemittanceStatus('rejected', 'report_transfer'),
    'pending_review',
  )
})

test('只有銀行核對結果可以確認入帳或標記需補充', () => {
  assert.equal(
    transitionRemittanceStatus('pending_review', 'confirm_bank_match'),
    'approved',
  )
  assert.equal(
    transitionRemittanceStatus('pending_review', 'flag_exception'),
    'rejected',
  )
  assert.throws(
    () => transitionRemittanceStatus('pending_transfer', 'confirm_bank_match'),
    /不允許/,
  )
  assert.throws(
    () => transitionRemittanceStatus('approved', 'report_transfer'),
    /不允許/,
  )
})
