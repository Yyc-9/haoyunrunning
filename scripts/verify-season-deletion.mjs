import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
try {
await db.exec(`
create role anon; create role authenticated; create role service_role;
create table profiles(id uuid primary key);
create table course_seasons(id uuid primary key, name text, status text, is_current boolean default false);
create table course_season_courses(id uuid primary key, season_id uuid references course_seasons on delete cascade);
create table signup_leads(id uuid primary key, season_id uuid references course_seasons on delete restrict, course_season_course_id uuid references course_season_courses on delete restrict);
create table course_catalog_audit_log(id int generated always as identity, actor_profile_id uuid references profiles, action text constraint course_catalog_audit_log_action_check check(action='delete_empty_course_authorized'), season_id uuid references course_seasons on delete set null, course_slug text, snapshot jsonb);
create table course_season_sync_sources(id uuid primary key,season_id uuid references course_seasons on delete cascade,last_synced_at timestamptz);
`);
for(const table of ['course_attendance_records','course_attendance_deductions','course_session_cancellations','coach_session_assignments']){
 await db.exec(`create table ${table}(id uuid primary key, season_id uuid references course_seasons on delete cascade,course_season_course_id uuid references course_season_courses on delete cascade)`);
}
await db.exec('create table course_makeup_requests(id uuid primary key,season_id uuid references course_seasons on delete cascade,original_course_season_course_id uuid references course_season_courses on delete cascade,target_course_season_course_id uuid references course_season_courses on delete restrict)');
await db.exec(readFileSync(new URL('../supabase/operations/delete-empty-course-season.sql',import.meta.url),'utf8'));
const id='00000000-0000-4000-8000-000000000001', course='00000000-0000-4000-8000-000000000002', actor='00000000-0000-4000-8000-000000000003', row='00000000-0000-4000-8000-000000000004';
await db.query('insert into profiles values ($1)',[actor]);
async function seed(status='draft',current=false){
 await db.query('insert into course_seasons values ($1,$2,$3,$4)',[id,'測試季度',status,current]);
 await db.query('insert into course_season_courses values ($1,$2)',[course,id]);
}
async function remove(){return db.query('select delete_empty_course_season($1,$2)',[id,actor]);}
async function denied(){
 await db.exec('savepoint deletion_attempt');
 await assert.rejects(remove, (error) => error.code === 'P0001');
 await db.exec('rollback to savepoint deletion_attempt');
 await db.exec('release savepoint deletion_attempt');
 assert.equal((await db.query('select id from course_seasons where id=$1',[id])).rows.length,1);
 assert.equal((await db.query('select id from course_catalog_audit_log')).rows.length,0);
}
for(const [status,current] of [['draft',true],['enrolling',false],['active',false]]){
 await db.exec('begin');await seed(status,current);await denied();await db.exec('rollback');
}
for(const table of ['signup_leads','course_attendance_records','course_attendance_deductions','course_session_cancellations','coach_session_assignments']){
 await db.exec('begin');await seed();
 await db.query(`insert into ${table}(id,season_id,course_season_course_id) values ($1,$2,$3)`,[row,id,course]);
 await denied();await db.exec('rollback');
}
await db.exec('begin');await seed();
await db.query('insert into course_makeup_requests values ($1,$2,$3,$3)',[row,id,course]);await denied();await db.exec('rollback');
await db.exec('begin');await seed();
await db.query('insert into course_season_sync_sources values ($1,$2,now())',[row,id]);await denied();await db.exec('rollback');
await seed();await remove();
assert.equal((await db.query('select * from course_seasons')).rows.length,0);
assert.equal((await db.query('select * from course_season_courses')).rows.length,0);
const audit=(await db.query('select * from course_catalog_audit_log')).rows[0];
assert.equal(audit.action,'delete_empty_season_authorized');
assert.equal(audit.snapshot.season.id,id);
assert.equal(audit.snapshot.courses.length,1);
assert.equal(audit.season_id,null);
await assert.rejects(remove);
const acl=(await db.query("select has_function_privilege('anon','delete_empty_course_season(uuid,uuid)','EXECUTE') as anon,has_function_privilege('authenticated','delete_empty_course_season(uuid,uuid)','EXECUTE') as member,has_function_privilege('service_role','delete_empty_course_season(uuid,uuid)','EXECUTE') as server")).rows[0];
assert.deepEqual(acl,{anon:false,member:false,server:true});
console.log('PASS: protected states, 7 dependency groups, empty deletion, audit preservation, repeated deletion, service-only permission');
} finally {await db.close();}
