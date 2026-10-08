import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db=new PGlite()
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
create type app_role as enum('student','coach','admin');
create table profiles(id uuid primary key references auth.users(id),email text,name text,phone text,pb text,goal text,role app_role,updated_at timestamptz default now());
create table coach_account_allowlist(profile_id uuid,status text);
create function touch_profile() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
create trigger touch_profile before update on profiles for each row execute function touch_profile();`)
for(const file of ['20260717095958_admin_role_allowlist.sql','20261008120000_admin_access_management.sql','20261008130000_admin_student_details.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444']
for(const [index,role] of ['admin','admin','student','coach'].entries()){
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[ids[index],`person${index}@example.com`])
 await db.query("insert into profiles(id,email,name,phone,pb,goal,role) values($1,$2,'Original','123','10K','Goal',$3)",[ids[index],`person${index}@example.com`,role])
}
const [admin,other,student,coach]=ids
const call=async(actor=admin,changes=null,fingerprint=null,reason='',target=student)=>(await db.query('select admin_student_details($1,$2,$3,$4,$5) result',[actor,target,changes,reason,fingerprint])).rows[0].result
const changes={name:'Updated',phone:'456',pb:'Half marathon',goal:'Finish comfortably',adminNote:'Internal follow-up'}
const before=await call()
assert.equal(before.student.name,'Original')
assert.equal(before.audit.length,0)
assert.equal((await db.query('select count(*)::int n from admin_student_notes')).rows[0].n,0,'GET cannot create notes')
await assert.rejects(call(student),/admin_required/)
await assert.rejects(call(coach),/admin_required/)
await assert.rejects(call(admin,null,null,'',coach),/student_not_found/)
await assert.rejects(call(admin,{...changes,email:'other@example.com'},before.fingerprint,'Reason'),/invalid_student_details/)
await assert.rejects(call(admin,{...changes,role:'admin'},before.fingerprint,'Reason'),/invalid_student_details/)
await assert.rejects(call(admin,changes,before.fingerprint,''),/student_reason_required/)
await assert.rejects(call(admin,changes,null,'Reason'),/student_details_changed/)
assert.equal((await call(other,changes,before.fingerprint,'Correct student details')).saved,true)
await assert.rejects(call(admin,{...changes,name:'Stale'},before.fingerprint,'Old form'),/student_details_changed/)
const saved=await call()
assert.equal(saved.student.adminNote,'Internal follow-up')
assert.equal(saved.audit[0].reason,'Correct student details')
assert.equal(saved.student.email,'person2@example.com')
assert.equal((await db.query('select role from profiles where id=$1',[student])).rows[0].role,'student')
const audit=(await db.query('select previous_data,next_data,actor_id from admin_student_details_audit')).rows[0]
assert.equal(audit.previous_data.name,'Original');assert.equal(audit.next_data.name,'Updated');assert.equal(audit.actor_id,other)
await db.query("update profiles set phone='student-edited' where id=$1",[student])
await assert.rejects(call(admin,changes,saved.fingerprint,'Overwrite self edit'),/student_details_changed/)
const latest=await call()
await db.exec("create function fail_audit() returns trigger language plpgsql as $$begin raise exception 'forced_failure';end$$;create trigger fail_audit before insert on admin_student_details_audit for each row execute function fail_audit();")
await assert.rejects(call(admin,{...changes,name:'Rollback',adminNote:'Rollback'},latest.fingerprint,'Reason'),/forced_failure/)
assert.equal((await call()).student.name,'Updated');assert.equal((await call()).student.adminNote,'Internal follow-up')
assert.equal((await call()).audit.length,1)
for(const role of ['anon','authenticated']) {
 assert.equal((await db.query("select has_table_privilege($1,'admin_student_notes','SELECT') allowed",[role])).rows[0].allowed,false)
 assert.equal((await db.query("select has_function_privilege($1,'admin_student_details(uuid,uuid,jsonb,text,text)','EXECUTE') allowed",[role])).rows[0].allowed,false)
}
console.log('PASS: equivalent admins, student/coach denial, private notes, read-only fetch, audited field edits, immutable email/role, stale admin and self-edits rejected, atomic rollback.')
await db.close()
