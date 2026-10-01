// Run in isolated PostgreSQL (PGlite). Never uses production credentials or real student records.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const q = (sql, params=[]) => db.query(sql, params)
const one = async (sql, params=[]) => (await q(sql, params)).rows[0]
let passed=0
const test = async (name, run) => { await run(); passed++; console.log('PASS',name) }
const admin=randomUUID(), coach=randomUUID(), outsider=randomUUID(), season=randomUUID(), home=randomUUID(), target=randomUUID()
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table profiles(id uuid primary key,role text,email text);
    create table course_seasons(id uuid primary key,status text,ends_on date);
    create table course_season_courses(id uuid primary key,season_id uuid references course_seasons(id),course_slug text,
      start_time time,time_zone text default 'Asia/Taipei',capacity int,billing_config jsonb);
    create table signup_leads(id uuid primary key,source text,registration_status text,status text,season_id uuid,
      course_season_course_id uuid,course_slug text,name text,email text,billing_start_session_date date);
    create table course_attendance_records(id uuid primary key default gen_random_uuid(),season_id uuid,course_season_course_id uuid,
      course_slug text,session_date date,enrollment_id uuid,student_email text,student_name text,status text,note text,
      marked_by uuid,marked_at timestamptz,updated_at timestamptz,unique(course_season_course_id,session_date,enrollment_id));
    create table course_session_cancellations(course_season_course_id uuid,session_date date);
    create table coach_session_assignments(course_season_course_id uuid,session_date date,actual_coach_id uuid,scheduled_coach_id uuid,leave_status text);
    create table student_course_checkins(enrollment_id uuid,course_season_course_id uuid,session_date date,student_id uuid);
  `)
  const original=await readFile(new URL('../supabase/migrations/20260717103000_student_attendance_makeups.sql',import.meta.url),'utf8')
  await db.exec(original.slice(original.indexOf('create table if not exists public.course_makeup_requests ('),original.indexOf('create table if not exists public.course_makeup_request_audit_log')))
  await db.exec(original.slice(original.indexOf('create or replace function public.request_course_leave(')))
  const latest=await readFile(new URL('../supabase/migrations/20261001120000_attendance_before_reconciliation.sql',import.meta.url),'utf8')
  await db.exec(latest.slice(latest.indexOf('CREATE OR REPLACE FUNCTION public.check_in_student_course('),latest.indexOf('CREATE OR REPLACE FUNCTION public.approve_course_enrollment(')))
  await db.exec(latest.slice(latest.indexOf('CREATE OR REPLACE FUNCTION public.schedule_course_makeup('),latest.indexOf('-- Serialize eligibility')))
  await db.exec(await readFile(new URL('../supabase/migrations/20261001160113_coach_leave_resolution_options.sql',import.meta.url),'utf8'))
  await q("insert into profiles values ($1,'admin','admin@example.invalid'),($2,'coach','coach@example.invalid'),($3,'student','student@example.invalid')",[admin,coach,outsider])
  await q("insert into course_seasons values ($1,'active',current_date+90)",[season])
  const dates=await one("select (current_date+2)::text as original,(current_date+3)::text as target,(current_date+4)::text as later")
  await q("insert into course_season_courses(id,season_id,course_slug,start_time,capacity,billing_config) values ($1,$2,'home','19:00',30,$4),($3,$2,'target','19:30',5,$4)",[home,season,target,{sessionDates:Object.values(dates),scheduleReady:true}])
  await q("insert into coach_session_assignments values($1,$2,$3,$3,'none')",[home,dates.original,coach])
  const newLead = async (status='pending_review') => { const id=randomUUID(); await q("insert into signup_leads values($1,'course_payment','active',$2,$3,$4,'home','Sample',$5,null)",[id,status,season,home,`${id}@example.invalid`]);return id }
  const resolve=(id,mode='self_training',course=null,date=null,actor=admin,day=dates.original)=>q('select public.resolve_coach_course_leave($1,$2,$3,$4,$5,$6,$7) as result',[id,home,day,actor,mode,course,date])
  const requestFor=async id=>one('select * from course_makeup_requests where enrollment_id=$1',[id])
  const self=await newLead()
  await test('unpaid enrollment can receive self-training for a future session',async()=>{await resolve(self);assert.equal((await requestFor(self)).status,'self_training');assert.equal((await one('select status from course_attendance_records where enrollment_id=$1',[self])).status,'excused')})
  await test('repeat submission is idempotent',async()=>{const first=await requestFor(self);await resolve(self);assert.equal((await requestFor(self)).id,first.id)})
  await test('self-training cannot become an in-person booking',async()=>{await assert.rejects(resolve(self,'in_person',target,dates.target),/不能再/);await assert.rejects(q('select schedule_course_makeup($1,$2,$3,$4)',[(await requestFor(self)).id,target,dates.target,admin]),/cannot be scheduled/)})
  await test('student cancel/re-request cannot restore the credit',async()=>{await assert.rejects(q('select cancel_course_leave($1,$2)',[(await requestFor(self)).id,outsider]),/自主訓練/);await assert.rejects(q("select request_course_leave($1,$2,$3,'home',$4,$5,'student@example.invalid','Sample')",[season,self,home,dates.original,outsider]),/自主訓練/)})
  await test('attendance reset and present marking cannot bypass self-training',async()=>{await assert.rejects(q("update course_attendance_records set status='present' where enrollment_id=$1",[self]),/自主訓練/);await assert.rejects(q('delete from course_attendance_records where enrollment_id=$1',[self]),/自主訓練/)})
  await test('student cannot check in to the original class or another class using self-training leave',async()=>{
    await q('update profiles set email=$1 where id=$2',[`${self}@example.invalid`,outsider])
    await assert.rejects(q('select check_in_student_course($1,$2,$3,$4)',[self,home,dates.original,outsider]),/已請假/)
    await assert.rejects(q('select check_in_student_course($1,$2,$3,$4)',[self,target,dates.target,outsider]),/沒有安排/)
  })
  const inperson=await newLead('pending_transfer')
  await test('assigned coach schedules unpaid student atomically',async()=>{await resolve(inperson,'in_person',target,dates.target,coach);const row=await requestFor(inperson);assert.equal(row.status,'scheduled');assert.equal(row.target_course_season_course_id,target)})
  await test('repeated in-person booking uses one request',async()=>{const first=await requestFor(inperson);await resolve(inperson,'in_person',target,dates.target,coach);assert.equal((await requestFor(inperson)).id,first.id)})
  await test('switching to self-training releases the reserved makeup seat',async()=>{await resolve(inperson,'self_training',null,null,coach);assert.equal((await requestFor(inperson)).target_course_season_course_id,null)})
  await test('ordinary users cannot use coach operation',async()=>{await assert.rejects(resolve(await newLead(),'self_training',null,null,outsider),/沒有這堂課/)})
  await test('coach cannot resolve a session outside their assignment',async()=>{await assert.rejects(resolve(await newLead(),'self_training',null,null,coach,dates.later),/沒有這堂課/)})
  await test('full class rejects atomically, leaving no partial leave',async()=>{const id=await newLead();await q('update course_season_courses set capacity=0 where id=$1',[target]);await assert.rejects(resolve(id,'in_person',target,dates.target),/capacity reached/);assert.equal(await requestFor(id),undefined);assert.equal(await one('select * from course_attendance_records where enrollment_id=$1',[id]),undefined);await q('update course_season_courses set capacity=5 where id=$1',[target])})
  await test('cancelled target rejects booking',async()=>{await q('insert into course_session_cancellations values($1,$2)',[target,dates.target]);await assert.rejects(resolve(await newLead(),'in_person',target,dates.target),/已停課/);await q('delete from course_session_cancellations')})
  await test('invalid, own-class, earlier and past target sessions reject',async()=>{const id=await newLead();await assert.rejects(resolve(id,'in_person',target,'2000-01-01'),/課表/);await assert.rejects(resolve(id,'in_person',home,dates.target),/其他班級/);await assert.rejects(resolve(id,'in_person',target,dates.original,admin,dates.later),/原請假課次之後/)})
  await test('cancelled registration and before-billing sessions reject',async()=>{const id=await newLead();await q("update signup_leads set registration_status='cancelled' where id=$1",[id]);await assert.rejects(resolve(id),/有效報名/);await q("update signup_leads set registration_status='active',billing_start_session_date=$2 where id=$1",[id,dates.later]);await assert.rejects(resolve(id),/計費起點/)})
  await test('archived quarter remains read-only',async()=>{const id=await newLead();await q("update course_seasons set status='archived'");await assert.rejects(resolve(id),/封存/);await q("update course_seasons set status='active'")})
  await test('new RPC is not executable by anonymous or authenticated API clients',async()=>{const row=await one("select has_function_privilege('anon','public.resolve_coach_course_leave(uuid,uuid,date,uuid,text,uuid,date)','execute') as anon,has_function_privilege('authenticated','public.resolve_coach_course_leave(uuid,uuid,date,uuid,text,uuid,date)','execute') as authenticated");assert.deepEqual(row,{anon:false,authenticated:false})})
  console.log(`${passed} isolated PostgreSQL checks passed`)
} finally { await db.close() }
