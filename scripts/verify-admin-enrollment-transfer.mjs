import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const migration = async name => readFile(new URL('../supabase/migrations/' + name, import.meta.url),'utf8')
await db.exec(`
  create role anon; create role authenticated; create role service_role; create schema private;
  create table profiles(id uuid primary key,name text,email text,role text);
  create table course_seasons(id uuid primary key,status text);
  create table course_season_courses(id uuid primary key,season_id uuid,course_slug text,course_data jsonb,billing_config jsonb,capacity int,start_time time,time_zone text default 'Asia/Taipei');
  create table signup_leads(id uuid primary key,source text default 'course_payment',name text,email text,
    season_id uuid,course_season_course_id uuid,course_slug text,preferred_course text,course_capacity int,
    status text default 'approved',registration_status text default 'active',billing_start_session_date date,
    prior_attendance_claimed boolean default false,attendance_verification_status text,
    amount_text text,calculated_amount numeric,pricing_snapshot jsonb,review_note text,reviewed_at timestamptz,
    payload jsonb default '{}',created_at timestamptz default now(),updated_at timestamptz default now());
`)
await db.exec(await migration('20260715060000_course_attendance_reconciliation.sql'))
await db.exec(await migration('20260716155756_attendance_deductions_and_cancellations.sql'))
await db.exec(await migration('20260717103000_student_attendance_makeups.sql'))
const journey = await migration('20260918150000_formal_student_journey.sql')
await db.exec(journey.slice(journey.indexOf('create table public.student_course_checkins'),journey.indexOf('create function public.set_course_session_cancellation')))
const active = await migration('20261001120000_attendance_before_reconciliation.sql')
await db.exec(active.slice(active.indexOf('create or replace function public.guard_active_enrollment_attendance'),active.indexOf('create or replace function public.guard_inactive_enrollment_finance')))
await db.exec(await migration('20261008110000_admin_enrollment_transfer.sql'))
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const admin=id(1),coach=id(2),student=id(3),season=id(4),source=id(5),target=id(6),other=id(7),lead=id(8)
await db.query("insert into profiles values($1,'Admin','admin@example.com','admin'),($2,'Coach','coach@example.com','coach'),($3,'Student','student@example.com','student')",[admin,coach,student])
await db.query("insert into course_seasons values($1,'active')",[season])
for (const [course,slug,dates] of [[source,'source',['2026-10-01','2026-10-05']],[target,'target',['2026-10-02','2026-10-06']],[other,'other',['2026-10-07']]]) {
  await db.query("insert into course_season_courses values($1,$2,$3,$4,$5,20,'18:00','Asia/Taipei')",[course,season,slug,JSON.stringify({name:slug}),JSON.stringify({sessionDates:dates})])
}
await db.query("insert into signup_leads(id,name,email,season_id,course_season_course_id,course_slug,preferred_course,course_capacity,billing_start_session_date,amount_text,calculated_amount,pricing_snapshot,review_note) values($1,'Student','student@example.com',$2,$3,'source','source',20,'2026-10-01','NT$6000',6000,'{\"original\":true}','Original receipt verified')",[lead,season,source])
await db.query("insert into course_attendance_records(season_id,course_season_course_id,course_slug,session_date,enrollment_id,status,marked_by) values($1,$2,'source','2026-10-01',$3,'present',$4),($1,$2,'source','2026-10-05',$3,'excused',$4)",[season,source,lead,coach])
await db.query("insert into student_course_checkins(enrollment_id,course_season_course_id,session_date,student_id) values($1,$2,'2026-10-01',$3)",[lead,source,student])
await db.query("insert into course_attendance_deductions(season_id,course_season_course_id,course_slug,session_date,enrollment_id,deducted_by) values($1,$2,'source','2026-10-01',$3,$4)",[season,source,lead,coach])
await db.query("insert into course_makeup_requests(season_id,enrollment_id,original_course_season_course_id,original_course_slug,original_session_date,target_course_season_course_id,target_course_slug,target_session_date,status,requested_by,updated_by) values($1,$2,$3,'source','2026-10-05',$4,'other','2026-10-07','scheduled',$5,$5)",[season,lead,source,other,student])
const mapping={'2026-10-01':'2026-10-02','2026-10-05':'2026-10-06'}
const invoke=async ({actor=admin,fingerprint=null,map=mapping,mode='move_records',destination=target,start='2026-10-02',reason='Verified requested class transfer'}={}) => (await db.query('select admin_transfer_enrollment($1,$2,$3,$4,$5,$6,$7,$8) as result',[actor,lead,destination,start,mode,JSON.stringify(map),reason,fingerprint])).rows[0].result
const original=(await db.query('select * from signup_leads where id=$1',[lead])).rows[0]
let preview=await invoke()
assert.equal(preview.attendanceCount,2);assert.equal(preview.checkinCount,1);assert.equal(preview.makeupCount,1)
await assert.rejects(invoke({actor:coach}),/只有超級管理員/)
await assert.rejects(invoke({map:{}}),/每個既有課次/)
await assert.rejects(invoke({map:{'2026-10-01':'2026-10-02','2026-10-05':'2026-10-02'}}),/不能把兩個/)
await assert.rejects(invoke({start:'2026-10-03'}),/有效起始課次/)
await db.query("update signup_leads set review_note='New review' where id=$1",[lead])
await assert.rejects(invoke({fingerprint:preview.fingerprint}),/已變更/)
await db.query("update signup_leads set review_note=$2 where id=$1",[lead,original.review_note])
await db.query('update course_season_courses set capacity=0 where id=$1',[target])
await assert.rejects(invoke(),/額滿/)
await db.query('update course_season_courses set capacity=20 where id=$1',[target])
preview=await invoke()
await db.exec(`create function fail_transfer() returns trigger language plpgsql as $$begin raise exception 'simulated transfer failure'; end$$;create trigger fail_transfer before update on course_attendance_records for each row execute function fail_transfer();`)
await assert.rejects(invoke({fingerprint:preview.fingerprint}),/simulated transfer failure/)
assert.equal((await db.query('select course_season_course_id from student_course_checkins')).rows[0].course_season_course_id,source)
assert.equal((await db.query('select course_season_course_id from signup_leads where id=$1',[lead])).rows[0].course_season_course_id,source)
assert.equal((await db.query('select count(*)::int as n from admin_enrollment_transfer_audit')).rows[0].n,0)
await db.exec('drop trigger fail_transfer on course_attendance_records')
assert.equal((await invoke({fingerprint:preview.fingerprint})).transferred,true)
const after=(await db.query('select * from signup_leads where id=$1',[lead])).rows[0]
for(const field of ['status','amount_text','calculated_amount','pricing_snapshot','review_note','reviewed_at'])assert.deepEqual(after[field],original[field])
assert.equal(after.course_season_course_id,target);assert.equal(after.admin_course_locked,true)
assert.equal((await db.query('select course_season_course_id from student_course_checkins')).rows[0].course_season_course_id,target)
assert.ok((await db.query('select course_season_course_id from course_attendance_records')).rows.every(row=>row.course_season_course_id===target))
assert.equal((await db.query('select original_course_season_course_id from course_makeup_requests')).rows[0].original_course_season_course_id,target)
assert.equal((await db.query('select course_season_course_id from course_attendance_deductions')).rows[0].course_season_course_id,target)
const audit=(await db.query('select * from admin_enrollment_transfer_audit')).rows[0]
assert.equal(audit.actor_id,admin);assert.equal(audit.previous_data.enrollment.course_season_course_id,source)
assert.equal(audit.previous_data.attendance.length,2)
await assert.rejects(db.query("update signup_leads set course_season_course_id=$1,course_slug='source' where id=$2",[source,lead]),/表格同步不能覆蓋/)
// A subsequent intentional transfer can keep prior attendance in its existing class.
preview=await invoke({mode:'preserve_history',map:{},destination:source,start:'2026-10-01'})
await invoke({mode:'preserve_history',map:{},destination:source,start:'2026-10-01',fingerprint:preview.fingerprint})
assert.ok((await db.query('select course_season_course_id from course_attendance_records')).rows.every(row=>row.course_season_course_id===target))
console.log('PASS: role checks, class capacity, explicit session mapping, attendance/check-in/makeup/deduction transfer, financial preservation, stale preview, atomic rollback, audit, history retention and sync overwrite prevention.')
await db.close()
