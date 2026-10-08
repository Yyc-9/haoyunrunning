import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const require=createRequire(import.meta.url)
const ts=require('typescript')
const source=readFileSync(new URL('../app/api/admin/route.ts',import.meta.url),'utf8')
function harness(role:string|null,actor='real-admin',rpcError:unknown=null){
 const calls:Array<{name:string;args:Record<string,unknown>}>=[];let guards=0
 const route={} as {PATCH:(request:Request)=>Promise<Response>}
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports:route,require(name:string){
   if(name==='next/server')return {NextResponse:{json:Response.json}}
   if(name==='@/lib/admin-auth')return {getAdminProfile:async()=>role==='admin'?{id:actor}:null}
   if(name==='@/lib/supabase-server')return {getAuthedUser:async()=>role?{id:actor}:null,supabaseAdmin:{rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return {error:rpcError}}}}
   if(name==='@/lib/season-write-guard')return {archivedSeasonResponse:async()=>{guards++;return Response.json({error:'archived'},{status:409})}}
   // Other business branches are not invoked by these authorization/restore cases.
   return {}
  },
 })
 return {calls,guards:()=>guards,patch:(body:unknown)=>route.PATCH(new Request('https://example.invalid/api/admin',{method:'PATCH',body:JSON.stringify(body)}))}
}
const restore={action:'restore_course_season',seasonId:'11111111-1111-4111-8111-111111111111',reason:' Correct history '}
test('main admin actions reject every non-admin role before any write or archive bypass',async()=>{
 for(const role of [null,'coach','student'])for(const action of ['restore_course_season','save_season_course','update_course_season_status','save_site_content','save_shop_product','review_order','create_payment_account']){
  const h=harness(role);assert.equal((await h.patch({...restore,action})).status,role?403:401);assert.equal(h.calls.length,0);assert.equal(h.guards(),0)
 }
})
test('both admins can restore with trusted actor and required reason; ordinary edits keep archive guard',async()=>{
 for(const actor of ['admin-one','admin-two']){
  const h=harness('admin',actor)
  assert.equal((await h.patch({...restore,actorId:'forged'})).status,200)
  assert.equal(h.calls[0].name,'admin_restore_season');assert.equal(h.calls[0].args.p_actor_id,actor);assert.equal(h.calls[0].args.p_reason,'Correct history');assert.equal(h.guards(),0)
  assert.equal((await h.patch({...restore,action:'update_course_season_status',status:'active'})).status,409);assert.equal(h.guards(),1);assert.equal(h.calls.length,1)
 }
 const h=harness('admin');for(const body of [{...restore,reason:''},{...restore,seasonId:'bad'},{...restore,reason:'x'.repeat(801)}])assert.equal((await h.patch(body)).status,400)
 assert.equal(h.calls.length,0)
})
test('restore reports stale state, revoked actor and migration failure without false success',async()=>{
 for(const [message,status] of [['season_not_archived',409],['admin_required',403],['private SQL detail',503]] as const){
  const response=await harness('admin','admin',{message}).patch(restore);assert.equal(response.status,status);assert.doesNotMatch(await response.text(),/private SQL detail/)
 }
})
