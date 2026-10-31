import assert from 'node:assert/strict'
import test from 'node:test'
import { readShopInvoice, shopInvoiceError, shopInvoiceDisplay, shopInvoiceDetails } from '../lib/shop-invoice.ts'
test('registration invoice choices map to checkout without losing company info',()=>{
  assert.deepEqual(readShopInvoice({invoiceDelivery:'手機條碼載具（請於下方欄位填寫）',invoiceDetail:' /abc+12. ',taxInvoiceInfo:' company '}),{invoiceDelivery:'carrier',invoiceDetail:'/ABC+12.',taxInvoiceInfo:'company'})
  assert.equal(readShopInvoice({invoiceDelivery:'寄至本次的電子信箱或 Gmail 信箱'}).invoiceDelivery,'email')
})

test('invoice references exclude other emails, future registrations and cancelled enrollments',()=>{
 const order={email:'buyer@example.test',created_at:'2026-10-15T00:00:00Z'}
 const base={email:order.email,created_at:'2026-10-01T00:00:00Z',source:'course_payment',registration_status:'active',payload:{invoiceDelivery:'carrier',invoiceDetail:'/ABC1234'}}
 const registrations=[base,{...base,created_at:'2026-10-20T00:00:00Z',payload:{invoiceDelivery:'carrier',invoiceDetail:'/FUTURE1'}},{...base,email:'other@example.test',created_at:'2026-10-14T00:00:00Z'},{...base,created_at:'2026-10-13T00:00:00Z',registration_status:'cancelled'}]
 const result=shopInvoiceDisplay(order,registrations)
 assert.equal(result.source,'registration');assert.equal(result.invoiceDetail,'/ABC1234');assert.equal(result.referenceDate,base.created_at)
 assert.match(shopInvoiceDetails(result).find(row=>row.label==='發票資料來源')!.value,/僅供參考/)
 assert.equal(shopInvoiceDisplay({...order,email:''},registrations).source,'missing')
 const saved=shopInvoiceDisplay({...order,invoice_delivery:'email',invoice_detail:'invoice@example.test'},registrations)
 assert.equal(saved.source,'order');assert.equal(saved.invoiceDetail,'invoice@example.test')
 assert.equal(shopInvoiceDisplay({...order,tax_invoice_info:'Order company'},registrations).invoiceDetail,'')
})
test('invoice validation accepts carrier symbols and email but rejects malformed values',()=>{
  for(const detail of ['/ABC1234','/A+1-.23']) assert.equal(shopInvoiceError({invoiceDelivery:'carrier',invoiceDetail:detail,taxInvoiceInfo:''}),'')
  for(const detail of ['/ABC123','ABC12345','/AB_1234']) assert.ok(shopInvoiceError({invoiceDelivery:'carrier',invoiceDetail:detail,taxInvoiceInfo:''}))
  assert.equal(shopInvoiceError({invoiceDelivery:'email',invoiceDetail:'user+invoice@example.test',taxInvoiceInfo:''}),'')
  assert.ok(shopInvoiceError({invoiceDelivery:'email',invoiceDetail:'user@',taxInvoiceInfo:''}))
})
