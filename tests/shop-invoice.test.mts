import assert from 'node:assert/strict'
import test from 'node:test'
import { readShopInvoice, shopInvoiceError } from '../lib/shop-invoice.ts'
test('registration invoice choices map to checkout without losing company info',()=>{
  assert.deepEqual(readShopInvoice({invoiceDelivery:'手機條碼載具（請於下方欄位填寫）',invoiceDetail:' /abc+12. ',taxInvoiceInfo:' company '}),{invoiceDelivery:'carrier',invoiceDetail:'/ABC+12.',taxInvoiceInfo:'company'})
  assert.equal(readShopInvoice({invoiceDelivery:'寄至本次的電子信箱或 Gmail 信箱'}).invoiceDelivery,'email')
})
test('invoice validation accepts carrier symbols and email but rejects malformed values',()=>{
  for(const detail of ['/ABC1234','/A+1-.23']) assert.equal(shopInvoiceError({invoiceDelivery:'carrier',invoiceDetail:detail,taxInvoiceInfo:''}),'')
  for(const detail of ['/ABC123','ABC12345','/AB_1234']) assert.ok(shopInvoiceError({invoiceDelivery:'carrier',invoiceDetail:detail,taxInvoiceInfo:''}))
  assert.equal(shopInvoiceError({invoiceDelivery:'email',invoiceDetail:'user+invoice@example.test',taxInvoiceInfo:''}),'')
  assert.ok(shopInvoiceError({invoiceDelivery:'email',invoiceDetail:'user@',taxInvoiceInfo:''}))
})
