// Run server modules with synthetic auth/DB/mail adapters. Never contacts external services.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const load = (path, modules, globals = {}) => {
  const exports = {}
  const source = readFileSync(new URL('../' + path, import.meta.url),'utf8')
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,console,URL,AbortSignal,process:{env:{}},require:name=>{ if (name in modules) return modules[name]; throw Error('Unexpected dependency: '+name) },...globals})
  return exports
}
const policy = load('lib/enrollment-notification-policy.ts',{})
const id = '1ed770c5-3666-4f30-bae1-1f6e08bcd9d4'
let actor = null, isolated = false, financeUnlocked = false, mailCalls = 0, requestCount = 0, outcome = 'fail'
let row = {id,enrollment_id:id,student_message:'PUBLIC-MESSAGE',internal_note:'PRIVATE-NOTE',email_status:'pending',responded_at:null}
let lastMail
const db = {
  from(table) {
    let update
    const q = { select:()=>q,eq:()=>q,in:()=>q,
      update(data){update=data; return q},
      async single(){return {data:table==='enrollment_followups' ? row : {email:'student@example.invalid',preferred_course:'合成測試課程',status:'rejected'},error:null}},
      then(resolve){if(update) Object.assign(row,update); return Promise.resolve({error:null}).then(resolve)},
    }
    return q
  },
  async rpc(name,args) {
    if(name==='claim_enrollment_followup_email') {
      row.email_payload ||= args.p_payload
      row.email_attempt_at = new Date().toISOString()
      row.email_status='sending'
      return {data:[{...row}],error:null}
    }
    if(name==='request_enrollment_supplement'){requestCount++; return {data:{id},error:null}}
    return {data:null,error:null}
  },
}
const common = {
  'server-only':{},
  'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
  '@/lib/supabase-server':{supabaseAdmin:db,getAuthedUser:async()=>actor},
  '@/lib/admin-auth':{getAdminProfile:async user=>user.role==='admin'?{id:user.id}:null},
  '@/lib/finance-viewers':{isFinanceViewer:email=>email==='finance@example.invalid'},
  '@/lib/finance-access':{authenticateFinanceRequest:async()=>financeUnlocked?{}:{response:Response.json({error:'locked'},{status:403})}},
  '@/lib/test-account':{getIsolatedTestAccount:async()=>isolated},
  '@/lib/enrollment-notification-policy':policy,
}
const environment = {env:{RESEND_API_KEY:'fake-local-only',RESEND_FROM_EMAIL:'qa@example.invalid'}}
const server = load('lib/enrollment-notifications-server.ts',common,{process:environment,fetch:async(url,options)=>{
  assert.equal(url,'https://api.resend.com/emails'); mailCalls++; lastMail = options
  if(outcome==='throw') throw Error('simulated timeout')
  return {ok:outcome==='ok'}
}})
const api = load('app/api/enrollment-followups/route.ts',{...common,'@/lib/enrollment-notifications-server':server})
const req = (body={})=>new Request('http://localhost/api/enrollment-followups',{method:'POST',body:JSON.stringify(body)})
let checks = 0
const check = async(name,fn)=>{await fn(); checks++; console.log('PASS',name)}
await check('anonymous and unverified accounts cannot access notifications',async()=>{
  assert.equal((await server.notificationAuth(req())).response.status,401)
  actor={id,email:'student@example.invalid'}; assert.equal((await server.notificationAuth(req())).response.status,401)
})
await check('student cannot create or retry staff requests',async()=>{
  actor={id,email:'student@example.invalid',email_confirmed_at:'2026-01-01'}
  assert.equal((await api.POST(req({action:'retry_email',requestId:id}))).status,403); assert.equal(mailCalls,0)
})
await check('finance detail requires second gate; generic bell does not',async()=>{
  actor={...actor,email:'finance@example.invalid'}
  assert.equal((await server.notificationAuth(req())).staff,true)
  assert.equal((await server.notificationAuth(req(),true)).response.status,403)
  financeUnlocked=true; assert.equal((await server.notificationAuth(req(),true)).staff,true)
})
await check('isolated test identities cannot touch formal notifications',async()=>{
  isolated=true; assert.equal((await server.notificationAuth(req())).response.status,403); isolated=false
})
await check('admin rejects blank student message before writing',async()=>{
  actor={...actor,role:'admin'}
  const response=await api.POST(req({requestId:id,enrollmentId:id,reason:'missing_info',message:' ',internalNote:'secret',expectedStatus:'pending_review',expectedSubmittedAt:null}))
  assert.equal(response.status,400); assert.equal(requestCount,0)
})
await check('saved request remains successful when email provider rejects',async()=>{
  const response=await api.POST(req({requestId:id,enrollmentId:id,reason:'missing_info',message:'PUBLIC-MESSAGE',internalNote:'PRIVATE-NOTE',expectedStatus:'pending_review',expectedSubmittedAt:null}))
  assert.equal(response.status,200); assert.equal(requestCount,1); assert.equal(row.email_status,'failed')
  assert.ok(!lastMail.body.includes('PRIVATE-NOTE')); assert.ok(lastMail.body.includes('/notifications?enrollment='))
  assert.equal(lastMail.headers['Idempotency-Key'],`enrollment-followup/${id}`)
})
await check('timeout retry preserves email payload and sent requests are not resent',async()=>{
  const original=lastMail.body; row.student_message='changed later'; outcome='throw'; await server.sendFollowupEmail(id)
  assert.equal(row.email_status,'failed'); assert.equal(lastMail.body,original)
  outcome='ok'; await server.sendFollowupEmail(id); assert.equal(row.email_status,'sent')
  const before=mailCalls; await server.sendFollowupEmail(id); assert.equal(mailCalls,before)
})
await check('unconfigured email is explicitly skipped while station notification remains saved',async()=>{
  environment.env={}; row={...row,email_status:'pending'}; await server.sendFollowupEmail(id); assert.equal(row.email_status,'skipped')
})
const course = load('lib/course-registration.ts',{'@/lib/payment':{isPaymentOrderStatus:()=>true}})
await check('legacy enrollment payload never exposes internal review notes',async()=>{
  const data=course.courseEnrollmentPayload({status:'rejected',review_note:'PRIVATE-NOTE'})
  assert.ok(!JSON.stringify(data).includes('PRIVATE-NOTE')); assert.ok(data.reviewNote)
})
let archived=false
const paymentDb={from(table){
  const filters={}
  const q={select:()=>q,eq:(key,value)=>{filters[key]=value;return q},async maybeSingle(){
    if(table==='signup_leads') return {data:filters.id===id && filters.email===actor.email ? {season_id:id}:null,error:null}
    return {data:{status:archived?'archived':'active'},error:null}
  }}
  return q
}}
const payment=load('app/api/course-enrollments/payment-info/route.ts',{
  ...common,'@/lib/supabase-server':{supabaseAdmin:paymentDb,getAuthedUser:async()=>actor},
  'node:fs/promises':{readFile:async()=>Buffer.from('synthetic-qr')},'node:path':{join:(...parts)=>parts.join('/')},
  '@/lib/course-pricing-token':{verifyCourseQuoteToken:()=>null},
  '@/lib/course-seasons-server':{getCurrentCourseSeason:()=>{throw Error('Exact enrollment must not resolve current season')}},
},{process:{cwd:()=>'/synthetic-only'}})
await check('payment details use the original owned enrollment rather than the current quarter',async()=>{
  assert.equal((await payment.POST(req({enrollmentId:id,format:'json'}))).status,200)
  assert.equal((await payment.POST(req({enrollmentId:'2ed770c5-3666-4f30-bae1-1f6e08bcd9d4',format:'json'}))).status,404)
  archived=true; assert.equal((await payment.POST(req({enrollmentId:id,format:'json'}))).status,409)
})
console.log(`${checks} isolated API/mail checks passed; ${mailCalls} mocked email attempts, zero real sends`)
