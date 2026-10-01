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
function harness(role='coach') {
  const rows: Row[] = ['pending_transfer','pending_review','rejected','approved'].map((status,i)=>({
    id:`enrollment-${i}`,source:'course_payment',status,registration_status:'active',name:`Student ${i}`,email:'shared@example.invalid',
    season_id:'quarter',course_slug:'home',course_season_course_id:'home-id',created_at:'2026-10-01',payload:{},
  }))
  rows.push({...rows[0],id:'cancelled',registration_status:'cancelled'})
  rows.push({...rows[0],id:'other',course_slug:'other',course_season_course_id:'other-id'})
  const writes: Row[]=[]
  const supabaseAdmin={from(table:string) {
    const filters: ((row:Row)=>boolean)[]=[]
    let write: Row[] | null=null
    const data=()=> {
      if(table==='profiles') return [{id:'coach',role}]
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
    '@/lib/admin-auth':{getAdminProfile:async()=>null},
    '@/lib/coach-profiles':{getDefaultCourseCoachKeys:()=>['qa-coach']},
    '@/lib/course-attendance':{attendanceCourseLabel:(name:string)=>name,taipeiDateKey:()=> '2026-10-01'},
    '@/lib/course-seasons-server':{getCourseSeasons:async()=>[{id:'quarter',name:'Q4',isCurrent:true,status:'active',courseOverrides:{home:{coachKeys:['qa-coach']}},courseOfferingIds:{home:'home-id'},courseBillingConfigs:{home:{scheduleReady:true,sessionDates:['2026-10-01']}}}]},
    '@/lib/managed-courses':{applyCourseOverrides:()=>[{slug:'home',name:'Home',weekday:'週四',location:'Test'}]},
    '@/lib/supabase-server':{supabaseAdmin,getAuthedUser:async()=>({id:'coach'})},
    '@/lib/coach-attendance-access':accessHelpers,
    '@/lib/coach-session-duty':{syncCoachSessionAssignments:async()=>{}},
    '@/lib/test-account':{getIsolatedTestAccount:async()=>null},
    '@/lib/season-write-guard':{archivedSeasonResponse:async()=>null},
  }) as Route
  const req=(body:unknown={})=>({headers:new Headers(),nextUrl:new URL('https://example.invalid/api/coach/attendance'),json:async()=>body})
  return {route,writes,req}
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
