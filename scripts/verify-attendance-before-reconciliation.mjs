// Isolated PostgreSQL only: no real registrations, messages, or remote credentials.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
let checks = 0
const test = async (name, fn) => { await fn(); console.log('PASS', name); checks++ }
const query = (sql, args=[]) => db.query(sql,args)
const one = async (sql,args=[]) => (await query(sql,args)).rows[0]
const actor=randomUUID(), outsider=randomUUID(), season=randomUUID(), course=randomUUID(), target=randomUUID()
const lead=randomUUID(), duplicate=randomUUID(), followup=randomUUID()
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table profiles(id uuid primary key,email text);
    create table course_seasons(id uuid primary key,status text);
    create table course_season_courses(id uuid primary key,season_id uuid,course_slug text,capacity integer,start_time time,billing_config jsonb);
    create table signup_leads(id uuid primary key,source text,name text,email text,status text,season_id uuid,course_season_course_id uuid,course_slug text,
      course_capacity integer,billing_start_session_date date,created_at timestamptz default now(),updated_at timestamptz default now(),
      notes text,review_note text,reviewed_at timestamptz,payment_submitted_at timestamptz,transfer_last_five text);
    create table course_attendance_records(id uuid primary key default gen_random_uuid(),enrollment_id uuid,course_season_course_id uuid,session_date date,status text,
      unique(enrollment_id,course_season_course_id,session_date));
    create table student_course_checkins(id uuid primary key default gen_random_uuid(),enrollment_id uuid,course_season_course_id uuid,session_date date,student_id uuid,
      checked_in_at timestamptz default now(),unique(enrollment_id,course_season_course_id,session_date));
    create table course_makeup_requests(id uuid primary key default gen_random_uuid(),enrollment_id uuid,season_id uuid,status text,
      original_course_season_course_id uuid,original_session_date date,target_course_season_course_id uuid,target_session_date date,target_course_slug text,
      updated_by uuid,updated_at timestamptz);
    create table course_session_cancellations(course_season_course_id uuid,session_date date);
    grant usage on schema public to service_role,anon,authenticated;
    grant all on all tables in schema public to service_role;`)
  await query('insert into profiles values ($1,$2),($3,$4)',[actor,'student@example.invalid',outsider,'outsider@example.invalid'])
  await query("insert into course_seasons values ($1,'active')",[season])
  await query(`insert into course_season_courses values ($1,$2,'home',1,(now() at time zone 'Asia/Taipei')::time,
    jsonb_build_object('sessionDates',jsonb_build_array((now() at time zone 'Asia/Taipei')::date::text))),
    ($3,$2,'target',1,(now() at time zone 'Asia/Taipei')::time,jsonb_build_object('sessionDates',jsonb_build_array((now() at time zone 'Asia/Taipei')::date::text)))`,[course,season,target])
  await query(`insert into signup_leads(id,source,name,email,status,season_id,course_season_course_id,course_slug,course_capacity,billing_start_session_date)
    values ($1,'course_payment','Student','student@example.invalid','pending_review',$2,$3,'home',1,(now() at time zone 'Asia/Taipei')::date-14)`,[lead,season,course])
  await query(`insert into signup_leads(id,source,status,season_id,review_note) values ($1,'course_payment','rejected',$2,'Google 表格偵測到同班級、同姓名與同信箱的重複報名，請人工處理。')`,[duplicate,season])
  await db.exec(await readFile(new URL('../supabase/migrations/20260920064910_enrollment_notifications.sql',import.meta.url),'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/20261001120000_attendance_before_reconciliation.sql',import.meta.url),'utf8'))
  const date=(await one("select (now() at time zone 'Asia/Taipei')::date::text as date")).date
  const checkin=(id=lead,user=actor,day=date) => query('select (check_in_student_course($1,$2,$3,$4)).*',[id,course,day,user])
  const mark=(day=date) => query("insert into course_attendance_records(enrollment_id,course_season_course_id,session_date,status) values ($1,$2,$3,'present') on conflict(enrollment_id,course_season_course_id,session_date) do update set status='present' returning *",[lead,course,day])
  await test('legacy duplicates remain excluded; payment review does not define validity',async()=>{
    assert.equal((await one('select registration_status from signup_leads where id=$1',[duplicate])).registration_status,'duplicate')
    assert.equal((await one('select registration_status from signup_leads where id=$1',[lead])).registration_status,'active')
  })
  await test('unreviewed student checks in; repeated clicks keep a single record',async()=>{
    const first=(await checkin()).rows[0];const second=(await checkin()).rows[0];assert.equal(first.id,second.id)
  })
  await test('coach can retain attendance from two lessons before finance confirmation',async()=>{
    await mark(date);await mark((await one("select ((now() at time zone 'Asia/Taipei')::date-7)::text as date")).date)
    assert.equal(Number((await one('select count(*) as n from course_attendance_records')).n),2)
  })
  const original=await one('select * from signup_leads where id=$1',[lead])
  const beforeAttendance=(await query('select id from course_attendance_records order by id')).rows
  const beforeCheckin=(await checkin()).rows[0].id
  await test('supplement request retains seat, enrollment ID, and previous attendance',async()=>{
    await query('select request_enrollment_supplement($1,$2,$3,$4,$5,$6,$7,$8)',[followup,lead,actor,'missing_info','請補充匯款資料','內部核對','pending_review',null])
    const row=await one('select * from signup_leads where id=$1',[lead]);assert.equal(row.status,'rejected');assert.equal(row.registration_status,'active')
    assert.equal(Number((await one("select count(*) as n from signup_leads where registration_status='active'")).n),1)
    assert.equal((await checkin()).rows[0].id,beforeCheckin);await mark()
  })
  await test('student resubmission and late approval preserve dates and attendance IDs',async()=>{
    await query('select submit_enrollment_supplement($1,$2,$3,$4,$5,$6)',[lead,'student@example.invalid','00123',date,'已補齊資料',followup])
    await query("select approve_course_enrollment($1,'已核實銀行款項')",[lead])
    const row=await one('select * from signup_leads where id=$1',[lead]);assert.equal(row.status,'approved')
    assert.deepEqual(row.billing_start_session_date,original.billing_start_session_date);assert.deepEqual(row.created_at,original.created_at)
    assert.deepEqual((await query('select id from course_attendance_records order by id')).rows,beforeAttendance)
    assert.equal((await checkin()).rows[0].id,beforeCheckin)
  })
  await test('awaiting-transfer students also qualify for attendance',async()=>{
    await query("update signup_leads set status='pending_transfer' where id=$1",[lead]);await checkin();await mark()
  })
  await test('another account cannot check in for the student',async()=>{await assert.rejects(checkin(lead,outsider),/本人報名/)})
  await test('archived quarter remains read-only for check-in',async()=>{
    await query("update course_seasons set status='archived' where id=$1",[season]);await assert.rejects(checkin(),/未開放簽到/)
    await query("update course_seasons set status='active' where id=$1",[season])
  })
  await test('session cancellation and enrollment start date still block invalid check-ins',async()=>{
    await query('insert into course_session_cancellations values ($1,$2)',[course,date]);await assert.rejects(checkin(),/已停課/)
    await query('delete from course_session_cancellations');await query("update signup_leads set billing_start_session_date=(now() at time zone 'Asia/Taipei')::date+1 where id=$1",[lead])
    await assert.rejects(checkin(),/早於報名/);await query('update signup_leads set billing_start_session_date=$2 where id=$1',[lead,original.billing_start_session_date])
  })
  await test('cancellation releases the seat but retains history and blocks finance/check-in/new attendance',async()=>{
    await query("update signup_leads set registration_status='cancelled' where id=$1",[lead])
    assert.equal(Number((await one("select count(*) as n from signup_leads where registration_status='active'")).n),0)
    assert.deepEqual((await query('select id from course_attendance_records order by id')).rows,beforeAttendance)
    await assert.rejects(checkin(),/本人報名/);await assert.rejects(mark(),/取消或標記重複/)
    await assert.rejects(query("select approve_course_enrollment($1,'test')",[lead]),/cancelled or duplicate/)
    await assert.rejects(query('select request_enrollment_supplement($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),lead,actor,'missing_info','請補充','', 'pending_transfer',null]),/enrollment_not_found/)
  })
  await test('makeup capacity counts unpaid and returned registrations',async()=>{
    await query("update signup_leads set registration_status='active' where id=$1",[lead])
    const targetLead=randomUUID(),request=randomUUID()
    await query("insert into signup_leads(id,source,status,season_id,course_season_course_id,course_slug) values ($1,'course_payment','rejected',$2,$3,'target')",[targetLead,season,target])
    await query("insert into course_makeup_requests(id,enrollment_id,season_id,status,original_course_season_course_id) values ($1,$2,$3,'leave_requested',$4)",[request,lead,season,course])
    await assert.rejects(query('select schedule_course_makeup($1,$2,$3,$4)',[request,target,date,actor]),/capacity reached/)
  })
  console.log(`${checks} isolated PostgreSQL checks passed`)
} catch (error) { console.error(error.message); process.exitCode=1 } finally { await db.close() }
