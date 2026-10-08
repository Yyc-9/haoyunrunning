import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table profiles(id uuid primary key, role text, name text, email text);
  create table course_seasons(id uuid primary key, status text);
  create table course_season_courses(id uuid primary key, course_data jsonb);
  create table course_session_cancellations(id uuid primary key, course_season_course_id uuid, session_date date);
  create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp(); return new; end$$;
`)
await db.exec(await readFile(new URL('../supabase/migrations/20260722150000_coach_session_duty.sql', import.meta.url), 'utf8'))
// Exercise the transition function included in the release source, independently
// of the separately pending GPS migration.
await db.exec(await readFile(new URL('../supabase/operations/coach-duty-transitions.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/20261008100000_admin_bulk_coach_attendance.sql', import.meta.url), 'utf8'))
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const admin=uuid(1), coach=uuid(2), student=uuid(3), course=uuid(4), season=uuid(5)
await db.query(`insert into profiles values($1,'admin','Admin','admin@example.com'),($2,'coach','Coach','coach@example.com'),($3,'student','Student','student@example.com');`,[admin,coach,student])
await db.query("insert into course_seasons values($1,'active')",[season])
await db.query("insert into course_season_courses(id,course_data,start_time) values($1,'{}','12:00')",[course])
const ids=[uuid(11),uuid(12),uuid(13)]
for (let i=0;i<3;i++) await db.query(`insert into coach_session_assignments(id,season_id,course_season_course_id,course_slug,session_date,scheduled_coach_id,actual_coach_id) values($1,$2,$3,'test',(now() at time zone 'Asia/Taipei')::date + $4::int,$5,$5)`,[ids[i],season,course,i===2?1:-(i+1),coach])
await db.query("insert into coach_session_checkins(assignment_id,actual_coach_id,punctuality) values($1,$2,'late')",[ids[0],coach])
const invoke = async (fingerprint=null, actor=admin, selected=ids, reason='Verified by administrator') => (await db.query('select admin_bulk_coach_attendance($1,$2,$3,$4,$5) as result',[actor,selected,'on_time',reason,fingerprint])).rows[0].result
let preview=await invoke()
assert.equal(preview.rows.filter(x=>!x.skip).length,2)
assert.equal(preview.rows.find(x=>x.assignmentId===ids[2]).skip,'課次尚未開始')
await assert.rejects(invoke(null,student),/只有超級管理員/)
await assert.rejects(invoke(null,admin,[ids[0],ids[0]]),/不重複/)
await assert.rejects(invoke(preview.fingerprint,admin,ids,''),/修正原因/)
await db.query("update coach_session_assignments set leave_reason='concurrent update' where id=$1",[ids[0]])
await assert.rejects(invoke(preview.fingerprint),/考勤已變更/)
preview=await invoke()
// Simulate a failure in the second write: the first write and all audits must roll back.
await db.exec(`create function fail_second_checkin() returns trigger language plpgsql as $$begin if new.assignment_id='${ids[1]}'::uuid then raise exception 'simulated write failure'; end if; return new; end$$; create trigger fail_second before insert on coach_session_checkins for each row execute function fail_second_checkin();`)
await assert.rejects(invoke(preview.fingerprint),/simulated write failure/)
assert.equal((await db.query('select punctuality from coach_session_checkins')).rows[0].punctuality,'late')
assert.equal((await db.query('select count(*)::int as n from coach_session_duty_audit_log')).rows[0].n,0)
await db.exec('drop trigger fail_second on coach_session_checkins')
const result=await invoke(preview.fingerprint)
assert.equal(result.changed,2);assert.equal(result.skipped,1)
assert.equal((await db.query("select count(*)::int as n from coach_session_checkins where punctuality='on_time' and manual_correction=true and corrected_by=$1",[admin])).rows[0].n,2)
assert.equal((await db.query('select count(*)::int as n from coach_session_duty_audit_log')).rows[0].n,2)
assert.equal((await invoke()).rows.filter(x=>!x.skip).length,0)
await db.query("update course_seasons set status='archived' where id=$1",[season])
assert.ok((await invoke()).rows.every(x=>x.skip==='季度已封存'))
await db.query("update course_seasons set status='active' where id=$1",[season])
await db.query("insert into course_session_cancellations select gen_random_uuid(),$1,session_date from coach_session_assignments where session_date < (now() at time zone 'Asia/Taipei')::date",[course])
assert.ok((await invoke()).rows.filter(x=>x.assignmentId!==ids[2]).every(x=>x.skip==='課次已停課'))
console.log('PASS: preview, future/cancelled/archived exclusions, role checks, stale preview, all-or-nothing writes, actor audit, missing and late attendance, repeated submission.')
await db.close()
