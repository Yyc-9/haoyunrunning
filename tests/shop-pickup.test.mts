import assert from 'node:assert/strict'
import test from 'node:test'
import { effectivePickup, packingSummary, type PickupOrder } from '../lib/shop-pickup.ts'
import { rosterCsv } from '../lib/enrollment-export.ts'
const item={product_id:'shirt',name:'上衣',quantity:2,size:'M',variant_id:'black',selected_specifications:[{label:'材質',value:'棉'}],is_preorder:false}
const base:PickupOrder={id:'order',order_number:'HY1',customer_name:'測試',email:'test@example.test',contact:'test',status:'approved',updated_at:'2026-10-29',pickup_course_id:null,pickup_class_name:'',pickup_status:'pending',pickup_match_source:'unmatched',shop_order_items:[item],candidates:[{id:'class-a',name:'週二班'}]}
test('existing single-class orders match; multiple/unknown stay pending and manual choices are respected',()=>{
  assert.equal(effectivePickup(base)?.id,'class-a')
  assert.equal(effectivePickup({...base,candidates:[]}),null)
  assert.equal(effectivePickup({...base,candidates:[...base.candidates,{id:'class-b',name:'週四班'}]}),null)
  assert.equal(effectivePickup({...base,pickup_match_source:'manual'}),null)
  assert.equal(effectivePickup({...base,pickup_course_id:'class-b',pickup_class_name:'舊班名'})?.name,'舊班名')
})
test('packing groups preserve class, size, variant and preorder boundaries and omit unpaid/collected orders',()=>{
  const rows=packingSummary([base,{...base,id:'two'}, {...base,status:'pending_review'}, {...base,pickup_status:'collected'},
    {...base,shop_order_items:[{...item,size:'L'}]}, {...base,shop_order_items:[{...item,variant_id:'white'}]},
    {...base,shop_order_items:[{...item,is_preorder:true}]},{...base,pickup_course_id:'class-b',pickup_class_name:'週四班'}])
  assert.equal(rows.length,5)
  assert.equal(rows.find(r=>r.className==='週二班'&&r.size==='M'&&r.variant==='black'&&!r.preorder)?.quantity,4)
  assert.equal(packingSummary([{...base,candidates:[]}]).length,0)
})
test('CSV escapes spreadsheet formulas in names and specifications',()=>{
  const csv=rosterCsv(['班級','商品'],[['=1+1','"商品"']])
  assert.ok(csv.includes("'=1+1"))
  assert.ok(csv.includes('""商品""'))
})
