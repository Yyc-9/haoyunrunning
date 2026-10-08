import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const require=createRequire(import.meta.url);const ts=require('typescript')
function harness(role:string|null,error:unknown=null) {
 const calls:Array<Record<string,unknown>>=[]
 const api={} as {GET:(r:Request)=>Promise<Response>;POST:(r:Request)=>Promise<Response>}
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/admin/student-details/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports:api,require(name:string){
   if(name==='next/server')return{NextResponse:{json:(body:unknown,init:ResponseInit)=>Response.json(body,init)}}
   if(name==='@/lib/admin-auth')return{getAdminProfile:async()=>role==='admin'?{id:'actor'}:null}
   if(name==='@/lib/supabase-server')return{getAuthedUser:async()=>role?{id:'actor'}:null,supabaseAdmin:{rpc:async(name:string,args:Record<string,unknown>)=>{assert.equal(name,'admin_student_details');calls.push(args);return{data:{saved:true},error}}}}
   throw Error(name)
  },
 })
 return{calls,get:()=>{const url=new URL('https://test/api?studentId='+id);const r=new Request(url);Object.assign(r,{nextUrl:url});return api.GET(r)},post:(body:unknown)=>api.POST(new Request('https://test/api',{method:'POST',body:JSON.stringify(body)}))}
}
const id='33333333-3333-4333-8333-333333333333'
const base={studentId:id,changes:{name:'Student',phone:'123',pb:'10K',goal:'Finish',adminNote:'Private'},reason:'Requested correction',fingerprint:'a'.repeat(32)}
test('student admin read/write requires admin and derives the actor from authentication',async()=>{
 for(const role of [null,'student','coach']){const h=harness(role);assert.equal((await h.get()).status,role?403:401);assert.equal((await h.post(base)).status,role?403:401);assert.equal(h.calls.length,0)}
 const h=harness('admin');assert.equal((await h.get()).status,200);assert.equal(h.calls[0].p_changes,null)
 assert.equal((await h.post({...base,actorId:'forged'})).status,200);assert.equal(h.calls[1].p_actor_id,'actor')
})
test('student edits reject missing preview/reason, extra privileges and oversized fields',async()=>{
 const h=harness('admin')
 for(const body of [null,{...base,fingerprint:''},{...base,reason:''},{...base,changes:{...base.changes,email:'new@example.com'}},{...base,changes:{...base.changes,role:'admin'}},{...base,changes:{...base.changes,adminNote:'x'.repeat(2001)}},{...base,changes:{...base.changes,name:' '}}])assert.equal((await h.post(body)).status,400)
 assert.equal(h.calls.length,0)
})
test('student edits report conflicts and database failures without false success',async()=>{
 assert.equal((await harness('admin',{message:'student_details_changed'}).post(base)).status,409)
 assert.equal((await harness('admin',{message:'admin_required'}).post(base)).status,403)
 const result=await harness('admin',{code:'PGRST202',message:'raw internals'}).post(base);assert.equal(result.status,503);assert.doesNotMatch(await result.text(),/raw internals/)
})
