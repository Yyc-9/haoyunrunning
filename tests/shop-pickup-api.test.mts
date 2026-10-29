import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const require=createRequire(import.meta.url)
const ts=require('typescript')
const id='33333333-3333-4333-8333-333333333333'
function harness(file:string,user:Record<string,unknown>|null,admin=false,rpcError:unknown=null) {
  const calls:Array<{name:string;args:Record<string,unknown>}>=[]
  const api:Record<string,(r:Request)=>Promise<Response>>={}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
    exports:api,require(name:string) {
      if(name==='next/server')return{NextResponse:{json:(body:unknown,init:ResponseInit)=>Response.json(body,init)}}
      if(name==='@/lib/admin-auth')return{getAdminProfile:async()=>admin?{id:'actor'}:null}
      if(name==='@/lib/supabase-server')return{getAuthedUser:async()=>user,supabaseAdmin:{rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return{data:name==='shop_pickup_candidates'?[{id,name:'Own class'}]:{id,orderNumber:'HYTEST'},error:rpcError}}}}
      if(name==='@/lib/shop-products')return{getCartProductId:(v:string)=>v}
      if(name==='@/lib/order-access')return{createOrderAccessToken:()=> 'test-only'}
      if(name==='@/lib/product-specifications')return{readSelectedSpecifications:()=>[]}
      throw Error(name)
    },
  })
  return{calls,send:(method:string,body?:unknown)=>api[method](new Request('https://test/api?email=someone-else@example.test',{method,...(body?{body:JSON.stringify(body)}:{})}))}
}
test('public options lookup never accepts caller-supplied email or reveals unverified membership',async()=>{
  for(const user of [null,{id,email:'a@example.test'}]) {
    const h=harness('app/api/shop/pickup-options/route.ts',user)
    assert.deepEqual(await (await h.send('GET')).json(),{options:[]})
    assert.equal(h.calls.length,0)
  }
  const h=harness('app/api/shop/pickup-options/route.ts',{id,email:'verified@example.test',email_confirmed_at:'date'})
  const response=await h.send('GET')
  assert.equal(response.status,200)
  assert.equal(h.calls[0].args.p_email,'verified@example.test')
  assert.match(response.headers.get('Cache-Control')!,/no-store/)
})
test('pickup writes require admin, derive actor server-side and reject conflicts',async()=>{
  const body={orderId:id,courseId:null,status:'pending',updatedAt:'2026-10-29T00:00:00Z',actorId:'forged'}
  for(const user of [null,{id}]) {
    const h=harness('app/api/admin/shop-pickup/route.ts',user)
    assert.equal((await h.send('PATCH',body)).status,user?403:401);assert.equal(h.calls.length,0)
  }
  const h=harness('app/api/admin/shop-pickup/route.ts',{id},true)
  assert.equal((await h.send('PATCH',body)).status,200);assert.equal(h.calls[0].args.p_actor_id,id)
  assert.equal((await h.send('PATCH',{...body,status:'paid'})).status,400)
  const conflict=harness('app/api/admin/shop-pickup/route.ts',{id},true,{message:'order_changed'})
  assert.equal((await conflict.send('PATCH',body)).status,409)
})
test('checkout matches verified account, never trusts caller pickup identity and returns no inferred guest membership',async()=>{
  const body={customerName:'Test',contact:'test',email:'guest@example.test',transferLastFive:'12345',items:[{productId:'shirt',quantity:1}],p_match_email:'forged@example.test'}
  const logged=harness('app/api/shop/orders/route.ts',{id,email:'account@example.test',email_confirmed_at:'date'})
  assert.equal((await logged.send('POST',body)).status,200)
  assert.equal(logged.calls[0].name,'create_shop_order_with_pickup')
  assert.equal(logged.calls[0].args.p_match_email,'account@example.test')
  assert.equal(logged.calls[0].args.p_require_selection,true)
  const guest=harness('app/api/shop/orders/route.ts',null)
  assert.equal((await guest.send('POST',{...body,pickupCourseId:id})).status,400)
  assert.equal(guest.calls.length,0)
  const response=await guest.send('POST',body)
  assert.equal(response.status,200)
  assert.equal(guest.calls[0].args.p_require_selection,false)
  assert.doesNotMatch(await response.text(),/pickup_class_name|pickup_course_id|candidates/)
})

