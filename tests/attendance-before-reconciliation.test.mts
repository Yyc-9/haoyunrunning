import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
type Row = Record<string, unknown>
type Result = { data: Row[]; error: null }
type Query = {
  select(): Query; order(): Query; or(): Query; eq(key: string, value: unknown): Query; neq(key: string, value: unknown): Query;
  in(key: string, values: unknown[]): Query; single(): Promise<{ data: Row | null; error: null }>; maybeSingle(): Promise<{ data: Row | null; error: null }>;
  upsert(values: Row[]): Query; delete(): Query; then(resolve: (value: Result) => unknown): Promise<unknown>;
}
type RouteResult = { status: number; body: { enrollments: Row[] } }
type Route = { GET(request: unknown): Promise<RouteResult>; POST(request: unknown): Promise<RouteResult> }
const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(path: string, modules: Record<string, unknown> = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require: (name: string) => { if (!(name in modules)) throw Error(name); return modules[name] },
  })
  return exports as Record<string, unknown>
}
const accessHelpers = load('../lib/coach-attendance-access.ts')
function harness(role='coach',actorId='coach', historicalStatus: string | null=null, rpcError: string | null=null) {
  const rows: Row[] = ['pending_transfer','pending_review','rejected','approved'].map((status,i)=>({
    id:`enrollment-${i}`,source:'course_payment',status,registration_status:'active',name:`Student ${i}`,email:'shared@example.invalid',
    season_id:'quarter',course_slug:'home',course_season_course_id:'home-id',created_at:'2026-10-01',payload:{},
  }))
  rows.push({...rows[0],id:'cancelled',registration_status:'cancelled'})
  rows.push({...rows[0],id:'other',course_slug:'other',course_season_course_id:'other-id'})
  const writes: Row[]=[]
  const rpcCalls: Row[]=[]
  const supabaseAdmin={rpc:async(name:string,args:Row)=>{rpcCalls.push({name,...args});return {data:null,error:rpcError ? {message:rpcError} : null}},from(table:string) {
    const filters: ((row:Row)=>boolean)[]=[]
    let write: Row[] | null=null
    const data=()=> {
      if(table==='profiles') return [{id:actorId,role}]
      if(table==='coach_public_profiles') return [{coach_key:'qa-coach'}]
      if(table==='coach_session_assignments') return [{course_season_course_id:'home-id',session_date:'2026-10-01',scheduled_coach_id:'coach',actual_coach_id:'coach',leave_status:'none'}]
      return table==='signup_leads' ? rows.filter(row=>filters.every(fn=>fn(row))) : []
    }
    const q: Query={
      select(){return q}, order(){return q}, or(){return q},
      eq(key:string,val:unknown){filters.push(row=>row[key]===val);return q},
      neq(key:string,val:unknown){filters.push(row=>row[key]!==val);return q},
      in(key:string,values:unknown[]){filters.push(row=>values.includes(row[key]));return q},
      single:async()=>({data:data()[0]??null,error:null}),maybeSingle:async()=>({data:data()[0]??null,error:null}),
      upsert(values:Row[]){write=values;return q},delete(){return q},
      then(resolve:(value: Result)=>unknown){if(write)writes.push(...write);return Promise.resolve({data:data(),error:null}).then(resolve)},
    };return q
  }}
  const route=load('../app/api/coach/attendance/route.ts',{
    'next/server':{NextResponse:{json:(body:unknown,opts:{status?:number}={})=>({body,status:opts.status??200})}},
    '@/lib/admin-auth':{getAdminProfile:async()=>role==='admin'?{id:actorId,role:'admin'}:null},
    '@/lib/coach-profiles':{getDefaultCourseCoachKeys:()=>['qa-coach']},
    '@/lib/course-attendance':{attendanceCourseLabel:(name:string)=>name,taipeiDateKey:()=> '2026-10-01'},
    '@/lib/course-seasons-server':{getCourseSeasons:async()=>[
      ...(historicalStatus?[{id:'current-quarter',name:'Current',isCurrent:true,status:'active',courseOverrides:{},courseOfferingIds:{},courseBillingConfigs:{}}]:[]),
      {id:'quarter',name:'Q4',isCurrent:!historicalStatus,status:historicalStatus??'active',courseOverrides:{home:{coachKeys:['qa-coach']}},courseOfferingIds:{home:'home-id'},courseBillingConfigs:{home:{scheduleReady:true,sessionDates:['2026-10-01']}}},
    ]},
    '@/lib/managed-courses':{applyCourseOverrides:()=>[{slug:'home',name:'Home',weekday:'週四',location:'Test'}]},
    '@/lib/supabase-server':{supabaseAdmin,getAuthedUser:async()=>({id:actorId})},
    '@/lib/coach-attendance-access':accessHelpers,
    '@/lib/coach-session-duty':{syncCoachSessionAssignments:async()=>{}},
    '@/lib/coach-leave-options':{getCoachLeaveOptions:async()=>[]},
    '@/lib/test-account':{getIsolatedTestAccount:async()=>null},
    '@/lib/season-write-guard':{archivedSeasonResponse:async()=>null},
  }) as Route
  const req=(body:unknown={})=>({headers:new Headers(),nextUrl:new URL('https://example.invalid/api/coach/attendance'),json:async()=>body})
  return {route,writes,req,rpcCalls}
}
test('coach attendance GET includes unpaid and supplementary records separately despite shared email',async()=>{
  const {route,req}=harness();const result=await route.GET(req());assert.equal(result.status,200)
  assert.deepEqual(Array.from(result.body.enrollments,(r:Row)=>r.id).sort(),['enrollment-0','enrollment-1','enrollment-2','enrollment-3'])
})
test('assigned coach can mark all valid unpaid students without matched student accounts',async()=>{
  const {route,writes,req}=harness();const result=await route.POST(req({courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',records:[0,1,2].map(i=>({enrollmentId:`enrollment-${i}`,status:'present'}))}))
  assert.equal(result.status,200);assert.equal(writes.length,3)
  assert.deepEqual(writes.map(r=>r.enrollment_id),['enrollment-0','enrollment-1','enrollment-2'])
})
for(const id of ['cancelled','other']) test(`coach cannot mark ${id} registration`,async()=>{
  const {route,writes,req}=harness();const result=await route.POST(req({courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',records:[{enrollmentId:id,status:'present'}]}))
  assert.equal(result.status,400);assert.equal(writes.length,0)
})
test('student role cannot gain coach write access',async()=>{
  const {route,writes,req}=harness('student');assert.equal((await route.POST(req())).status,403);assert.equal(writes.length,0)
})
test('coach cannot mark an unassigned session',async()=>{
  const {route,writes,req}=harness();assert.equal((await route.POST(req({courseSeasonCourseId:'home-id',sessionDate:'2026-10-02'}))).status,400);assert.equal(writes.length,0)
})

for (const mode of ['in_person','self_training']) test(`coach can submit ${mode} for an unpaid own-class enrollee`,async()=>{
  const {route,req,rpcCalls}=harness()
  const result=await route.POST(req({intent:'resolve_leave',courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',enrollmentId:'enrollment-0',leaveMode:mode,targetCourseSeasonCourseId:'target',targetSessionDate:'2026-10-05'}))
  assert.equal(result.status,200);assert.equal(rpcCalls.length,1);assert.equal(rpcCalls[0].name,'resolve_coach_course_leave');assert.equal(rpcCalls[0].p_actor_id,'coach')
  if(mode==='self_training') assert.equal(rpcCalls[0].p_target_course_id,null)
})
for (const id of ['cancelled','other']) test(`coach cannot resolve leave for ${id} enrollment`,async()=>{
  const {route,req,rpcCalls}=harness()
  assert.equal((await route.POST(req({intent:'resolve_leave',courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',enrollmentId:id,leaveMode:'self_training'}))).status,403)
  assert.equal(rpcCalls.length,0)
})
test('database capacity conflict is reported without issuing separate attendance writes',async()=>{
  const {route,req,rpcCalls,writes}=harness('coach','coach',null,'makeup target capacity reached')
  assert.equal((await route.POST(req({intent:'resolve_leave',courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',enrollmentId:'enrollment-1',leaveMode:'in_person',targetCourseSeasonCourseId:'target',targetSessionDate:'2026-10-05'}))).status,409)
  assert.equal(rpcCalls.length,1);assert.equal(writes.length,0)
})
test('legacy bare excused writes require an explicit leave choice',async()=>{
  const {route,req,writes}=harness()
  assert.equal((await route.POST(req({courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',records:[{enrollmentId:'enrollment-1',status:'excused'}]}))).status,409)
  assert.equal(writes.length,0)
})
test('makeup options require teaching access to the original session',async()=>{
  const {route,req}=harness();const request=req();request.nextUrl.search='?leaveOptionsFor=other-id&sessionDate=2026-10-01'
  assert.equal((await route.GET(request)).status,403)
})
for(const actorId of ['admin-one','admin-two'])test(`${actorId} can read and mark a class without a coach assignment`,async()=>{
 const {route,writes,req}=harness('admin',actorId)
 const read=await route.GET(req());assert.equal(read.status,200);assert.equal(read.body.enrollments.length,4)
 const result=await route.POST(req({courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',records:[{enrollmentId:'enrollment-0',status:'present'}]}))
 assert.equal(result.status,200);assert.equal(writes[0].marked_by,actorId)
})
for(const actorId of ['admin-one','admin-two'])test(`${actorId} can correct a completed historical season while another quarter is current`,async()=>{
 const {route,writes,req}=harness('admin',actorId,'completed')
 assert.equal((await route.GET(req())).body.enrollments.length,4)
 assert.equal((await route.POST(req({courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',records:[{enrollmentId:'enrollment-0',status:'present'}]}))).status,200)
 assert.equal(writes[0].marked_by,actorId)
})
test('archived seasons remain inaccessible for admin attendance until explicitly restored',async()=>{
 const {route,writes,req}=harness('admin','admin-one','archived')
 assert.equal((await route.GET(req())).body.enrollments.length,0)
 assert.equal((await route.POST(req({courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',records:[{enrollmentId:'enrollment-0',status:'present'}]}))).status,400)
 assert.equal(writes.length,0)
})
test('coach access does not expand to completed historical seasons',async()=>{
 const {route,writes,req}=harness('coach','coach','completed')
 assert.equal((await route.GET(req())).body.enrollments.length,0)
 assert.equal((await route.POST(req({courseSeasonCourseId:'home-id',sessionDate:'2026-10-01',records:[{enrollmentId:'enrollment-0',status:'present'}]}))).status,400)
 assert.equal(writes.length,0)
})
