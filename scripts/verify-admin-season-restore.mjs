import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db=new PGlite()
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
create type app_role as enum('student','coach','admin');
create table profiles(id uuid primary key references auth.users(id),email text,name text,phone text,pb text,role app_role);
create table coach_account_allowlist(profile_id uuid,status text);
create table course_seasons(id uuid primary key,status text,is_current boolean,name text);
create table course_season_sync_sources(id uuid primary key default gen_random_uuid(),season_id uuid references course_seasons(id),active boolean,updated_at timestamptz default now());`)
for(const file of ['20260717095958_admin_role_allowlist.sql','20261008120000_admin_access_management.sql','20261008140000_admin_restore_season.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444']
for(const [index,role] of ['admin','admin','student','coach'].entries()){
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[ids[index],`person${index}@example.com`])
 await db.query('insert into profiles(id,email,role) values($1,$2,$3)',[ids[index],`person${index}@example.com`,role])
}
const seasons=ids.map((id)=>id.replace(/^./,'9'))
for(const id of seasons){
 await db.query("insert into course_seasons values($1,'archived',false,'History')",[id])
 await db.query('insert into course_season_sync_sources(season_id,active) values($1,true)',[id])
}
const call=async(actor=ids[0],season=seasons[0],reason=' Correct historical records ')=>(await db.query('select admin_restore_season($1,$2,$3) result',[actor,season,reason])).rows[0].result
await assert.rejects(call(ids[2]),/admin_required/)
await assert.rejects(call(ids[3]),/admin_required/)
await assert.rejects(call(ids[0],seasons[0],''),/restore_reason_required/)
await assert.rejects(call(ids[0],seasons[0],'x'.repeat(801)),/restore_reason_required/)
for(const [i,admin] of ids.slice(0,2).entries()){
 const restored=await call(admin,seasons[i]);assert.equal(restored.status,'completed');assert.equal(restored.isCurrent,false)
 const audit=(await db.query('select * from admin_season_state_audit where season_id=$1',[seasons[i]])).rows[0]
 assert.equal(audit.actor_id,admin);assert.equal(audit.reason,'Correct historical records')
 assert.equal(audit.previous_data.status,'archived');assert.equal(audit.next_data.status,'completed')
 assert.equal(audit.previous_data.syncSources[0].active,true);assert.equal(audit.next_data.syncSources[0].active,false)
 await assert.rejects(call(admin,seasons[i]),/season_not_archived/)
}
assert.equal((await db.query('select count(*)::int n from admin_season_state_audit')).rows[0].n,2)
await db.query('update course_seasons set is_current=true where id=$1',[seasons[2]])
await assert.rejects(call(ids[0],seasons[2]),/archived_season_is_current/)
await db.exec("create function fail_audit() returns trigger language plpgsql as $$begin raise exception 'forced_failure';end$$;create trigger fail_audit before insert on admin_season_state_audit for each row execute function fail_audit();")
await assert.rejects(call(ids[0],seasons[3]),/forced_failure/)
assert.equal((await db.query('select status from course_seasons where id=$1',[seasons[3]])).rows[0].status,'archived')
assert.equal((await db.query('select active from course_season_sync_sources where season_id=$1',[seasons[3]])).rows[0].active,true)
for(const role of ['anon','authenticated']){
 assert.equal((await db.query("select has_table_privilege($1,'admin_season_state_audit','SELECT') allowed",[role])).rows[0].allowed,false)
 assert.equal((await db.query("select has_function_privilege($1,'admin_restore_season(uuid,uuid,text)','EXECUTE') allowed",[role])).rows[0].allowed,false)
}
console.log('PASS: equivalent admins, denied student/coach, required reason, stale restore rejected, publication remains off, sync disabled, original states audited, atomic rollback, private RPC.')
await db.close()
