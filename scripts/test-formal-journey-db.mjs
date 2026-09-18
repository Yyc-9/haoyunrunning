import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Optional isolated test dependency, never connects to the production database.
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth; create schema private;
create function auth.uid() returns uuid language sql as 'select null::uuid';
create function private.is_admin(uuid) returns boolean language sql as 'select false';
create table profiles(id uuid primary key, email text, role text default 'coach');
alter table profiles enable row level security;
create policy profiles_select_own_or_coach_or_admin on profiles for select using(false);
create table coach_students(coach_id uuid, student_id uuid);
create table coach_public_profiles(coach_key text,owner_profile_id uuid);
create table course_seasons(id uuid primary key, status text);
create table course_season_courses(id uuid primary key, season_id uuid, start_time time, billing_config jsonb);
create table signup_leads(id uuid primary key, email text, source text, status text, season_id uuid, course_season_course_id uuid, billing_start_session_date date, created_at timestamptz default now());
create table coach_session_assignments(course_season_course_id uuid, scheduled_coach_id uuid);
create table course_session_cancellations(course_season_course_id uuid, session_date date);
create table course_makeup_requests(id uuid primary key, enrollment_id uuid, original_session_date date, target_course_season_course_id uuid, target_session_date date, status text);
create table course_attendance_records(enrollment_id uuid, course_season_course_id uuid, session_date date, status text);
alter table course_season_courses add column course_slug text default 'test-course';
alter table course_season_courses add column course_data jsonb default '{}'::jsonb;
alter table course_session_cancellations add column season_id uuid, add column course_slug text,
  add column reason text, add column cancelled_by uuid, add column cancelled_at timestamptz,
  add column updated_at timestamptz, add unique(course_season_course_id,session_date);
alter table course_makeup_requests add column original_course_season_course_id uuid,
  add column target_course_slug text, add column updated_by uuid, add column updated_at timestamptz;
`)
await db.exec(await readFile(new URL('../supabase/migrations/20260918150000_formal_student_journey.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/20260918160224_formal_journey_trigger_permissions.sql', import.meta.url), 'utf8'))
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`
const scalar = async (sql, args = []) => Object.values((await db.query(sql,args)).rows[0])[0]
const today = await scalar("select (now() at time zone 'Asia/Taipei')::date::text")
await db.query('insert into profiles(id,email) values ($1,$2),($3,$4),($5,$6)', [id(1),'student@test.invalid',id(2),'coach@test.invalid',id(3),'stranger@test.invalid'])
await db.query('insert into course_seasons values ($1,$2)', [id(10),'active'])
for (const courseId of [id(11),id(12)]) await db.query("insert into course_season_courses(id,season_id,start_time,billing_config) values ($1,$2,(now() at time zone 'Asia/Taipei')::time,$3::jsonb)", [courseId,id(10),JSON.stringify({sessionDates:[today]})])
await db.query('insert into coach_session_assignments values ($1,$2),($3,$2)',[id(11),id(2),id(12)])
await db.query('select sync_formal_course_coaches($1,$2::jsonb)',[[id(11),id(12)],JSON.stringify([{course_id:id(11),coach_id:id(2)},{course_id:id(12),coach_id:id(2)}])])
await db.query("insert into signup_leads(id,email,source,status,season_id,course_season_course_id) values ($1,$2,'course_payment','pending_review',$3,$4)",[id(20),'student@test.invalid',id(10),id(11)])
let passed = 0
async function check(name, fn) { await fn(); passed++; console.log('PASS', name) }
const checkin = (course=id(11), actor=id(1)) => db.query('select * from check_in_student_course($1,$2,$3,$4)',[id(20),course,today,actor])
await check('未入帳沒有正式關聯', async()=>assert.equal(await scalar('select count(*)::int from formal_coach_students'),0))
await check('未入帳不能簽到', async()=>assert.rejects(checkin(), /入帳/))
await db.query("update signup_leads set status='approved' where id=$1",[id(20)])
await check('確認入帳立即產生關聯', async()=>assert.equal(await scalar('select count(*)::int from formal_coach_students'),1))
await check('換教練後舊排課不再授權', async()=>{
  await db.query('select sync_formal_course_coaches($1,$2::jsonb)',[[id(11)],JSON.stringify([{course_id:id(11),coach_id:id(3)}])])
  assert.equal(await scalar('select coach_id::text from formal_coach_students'),id(3))
})
await check('停用教練立即失去正式學員資格', async()=>{
  await db.query("update profiles set role='student' where id=$1",[id(3)])
  assert.equal(await scalar('select count(*)::int from formal_coach_students'),0)
  await db.query("update profiles set role='coach' where id=$1",[id(3)])
})
await check('不可替其他學員簽到', async()=>assert.rejects(checkin(id(11),id(3)), /本人/))
await check('未安排補課不能跨班簽到', async()=>assert.rejects(checkin(id(12)), /補課/))
await check('正式簽到與教練點名分開', async()=>{await checkin();assert.equal(await scalar('select count(*)::int from course_attendance_records'),0)})
await check('重複簽到不新增紀錄', async()=>{await checkin();assert.equal(await scalar('select count(*)::int from student_course_checkins'),1)})
await check('已簽到不能再請假', async()=>assert.rejects(db.query("insert into course_makeup_requests(id,enrollment_id,original_session_date,target_course_season_course_id,target_session_date,status) values ($1,$2,$3,null,null,'leave_requested')",[id(31),id(20),today]), /原班已簽到/))
// Only isolated fixture cleanup, never a production correction pathway.
await db.exec('delete from student_course_checkins')
await db.query("insert into course_makeup_requests(id,enrollment_id,original_session_date,target_course_season_course_id,target_session_date,status,original_course_season_course_id) values ($1,$2,$3,$4,$3,'scheduled',$5)",[id(30),id(20),today,id(12),id(11)])
await check('請假後不能在原班簽到', async()=>assert.rejects(checkin(), /請假/))
await db.query("insert into course_attendance_records values($1,$2,$3,'present')",[id(20),id(12),today])
await check('只有教練確認時補課仍待核實', async()=>assert.equal(await scalar('select status from course_makeup_requests'),'scheduled'))
await check('補課雙方確認後完成', async()=>{await checkin(id(12));assert.equal(await scalar('select status from course_makeup_requests'),'completed')})
await check('簽到後不能取消補課', async()=>assert.rejects(db.exec("update course_makeup_requests set target_course_season_course_id=null, status='cancelled'"), /已簽到/))
await check('接收班不改變原班關聯',async()=>assert.equal(await scalar('select course_season_course_id::text from signup_leads'),id(11)))
await check('撤銷教練點名同步撤銷補課完成但保留學員簽到',async()=>{
  await db.exec('delete from course_attendance_records')
  assert.equal(await scalar('select status from course_makeup_requests'),'scheduled')
  assert.equal(await scalar('select count(*)::int from student_course_checkins'),1)
})
await check('補課已簽到時停課可原子退回重新選課',async()=>{
  await db.query('select set_course_session_cancellation($1,$2,true,$3,$4)',[id(12),today,'test cancellation',id(2)])
  assert.equal(await scalar('select status from course_makeup_requests'),'needs_reselection')
  assert.equal(await scalar('select count(*)::int from course_session_cancellations'),1)
  assert.equal(await scalar('select count(*)::int from student_course_checkins'),1)
})
await check('恢復課次不擅自恢復舊補課安排',async()=>{
  await db.query('select set_course_session_cancellation($1,$2,false,$3,$4)',[id(12),today,'',id(2)])
  assert.equal(await scalar('select count(*)::int from course_session_cancellations'),0)
  assert.equal(await scalar('select status from course_makeup_requests'),'needs_reselection')
})
await db.exec('delete from student_course_checkins; delete from course_makeup_requests; delete from course_attendance_records;')
await db.query('insert into course_session_cancellations(course_season_course_id,session_date) values ($1,$2)',[id(11),today])
await check('停課不能簽到',async()=>assert.rejects(checkin(), /停課/))
await db.exec('delete from course_session_cancellations')
await db.exec("update course_seasons set status='archived'")
await check('封存季度不能簽到',async()=>assert.rejects(checkin(), /未開放/))
await check('封存季度不授權舊教練',async()=>assert.equal(await scalar('select count(*)::int from formal_coach_students'),0))
await db.exec("update course_seasons set status='active'")
await db.exec("update signup_leads set status='rejected'")
await check('撤銷付款資格同步撤銷正式關聯', async()=>assert.equal(await scalar('select count(*)::int from formal_coach_students'),0))
await check('一般瀏覽器無法直接寫签到表',async()=>assert.equal(await scalar("select has_table_privilege('authenticated','student_course_checkins','INSERT')"),false))
await check('一般瀏覽器不可調用帶actor參數的內部RPC',async()=>assert.equal(await scalar("select has_function_privilege('authenticated','check_in_student_course(uuid,uuid,date,uuid)','EXECUTE')"),false))
await check('內部觸發器函數不對瀏覽器開放',async()=>{
  for (const role of ['anon','authenticated']) for (const name of ['complete_verified_makeup','guard_checked_in_makeup','guard_leave_after_checkin'])
    assert.equal(await scalar('select has_function_privilege($1,$2,$3)',[role,`${name}()`,'EXECUTE']),false)
})
console.log(`${passed} isolated database checks passed`)
await db.close()
