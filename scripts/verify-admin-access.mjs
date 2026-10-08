// In-memory PostgreSQL only. This script never connects to production.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
create type public.app_role as enum ('student','coach','admin');
create table profiles(id uuid primary key references auth.users(id), email text, name text, phone text, pb text, role app_role);
create table coach_public_profiles(coach_key text primary key, display_name text, owner_profile_id uuid);
create table coach_account_allowlist(coach_key text, email text, status text, profile_id uuid);
create table course_seasons(id uuid primary key, name text, status text);
create table course_season_courses(id uuid primary key, season_id uuid, course_slug text, course_data jsonb);
create table course_coach_memberships(course_season_course_id uuid,coach_id uuid);
create table user_device_sessions(user_id uuid,device_label text,last_seen_at timestamptz,revoked_at timestamptz);
`)
await db.exec(await readFile(new URL('../supabase/migrations/20260717095958_admin_role_allowlist.sql', import.meta.url), 'utf8'))
await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('66666666-6666-4666-8666-666666666666','old-revoked@example.com',now());
insert into profiles(id,email,role) values('66666666-6666-4666-8666-666666666666','old-revoked@example.com','admin');
insert into admin_role_allowlist(email,active) values('old-revoked@example.com',false);`)
await db.exec(await readFile(new URL('../supabase/migrations/20261008120000_admin_access_management.sql', import.meta.url), 'utf8'))
assert.equal((await db.query("select role from profiles where email='old-revoked@example.com'")).rows[0].role,'student','migration reconciles previously inactive admin grants')
await db.exec('create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();')
const admin = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const coach = '33333333-3333-4333-8333-333333333333'
const student = '44444444-4444-4444-8444-444444444444'
const pending = '55555555-5555-4555-8555-555555555555'
await db.query(`insert into auth.users(id,email,email_confirmed_at) values
($1,'admin@example.com',now()),($2,'other@example.com',now()),($3,'coach@example.com',now()),($4,'student@example.com',now())`, [admin, other, coach, student])
await db.exec(`update profiles set role=case when email in ('admin@example.com','other@example.com') then 'admin'::app_role when email='coach@example.com' then 'coach'::app_role else 'student'::app_role end;
insert into coach_account_allowlist values('coach','coach@example.com','enabled','${coach}');
insert into coach_public_profiles values('coach','Test coach','${coach}');`)
// Production service_role cannot SELECT auth.users. Only the server-only RPC
// receives elevated access; direct Auth-table access must remain unavailable.
assert.equal((await db.query("select has_table_privilege('service_role','auth.users','SELECT') allowed")).rows[0].allowed,false)
async function serviceQuery(sql,args){
 await db.exec('set role service_role')
 try{return await db.query(sql,args)}finally{await db.exec('reset role')}
}
const resolve = async (id, emails=[]) => (await serviceQuery('select resolve_account_role($1,$2) as result',[id,emails])).rows[0].result
const change = async (email, active, actor=admin, reason='Admin-requested access change') =>
  (await serviceQuery('select admin_set_access($1,$2,$3,$4) as result',[actor,email,active,reason])).rows[0].result
const overview = async (email=null, actor=admin) => (await serviceQuery('select admin_account_overview($1,$2,$3) as result',[actor,email,['other@example.com']])).rows[0].result
const role = async id => (await db.query('select role from profiles where id=$1',[id])).rows[0].role
assert.equal((await resolve(admin)).role,'admin','existing admin retained')
assert.equal((await change(' COACH@example.com ',true,other)).role,'admin','any admin may grant')
assert.equal((await change('coach@example.com',false)).role,'coach','revoke retains enabled coach access')
assert.equal((await change('student@example.com',true)).role,'admin')
assert.equal((await change('student@example.com',false)).role,'student')
assert.equal((await resolve(student,['student@example.com'])).role,'student','environment cannot override revoke')
await db.query("update auth.users set email='new@example.com' where id=$1",[student])
await assert.rejects(db.query("update profiles set role='admin' where id=$1",[student]),/admin_access_revoked_or_unverified/,'older servers cannot directly resurrect a revoked role')
assert.equal((await resolve(student,['new@example.com'])).role,'student','email change and stale profile cannot resurrect access')
assert.equal((await change('new@example.com',true)).role,'admin','explicit grant restores access')
await change('new@example.com',false)
await assert.rejects(change('admin@example.com',false),/admin_cannot_revoke_self/)
await assert.rejects(change('nobody@example.com',true,student),/admin_required/)
await assert.rejects(change('nobody@example.com',true,coach),/admin_required/)
await assert.rejects(change('invalid',true),/invalid_admin_email/)
await assert.rejects(change('valid@example.com',true,admin,''),/admin_reason_required/)
assert.equal((await change('pending@example.com',true)).registered,false)
await db.query("insert into auth.users(id,email) values($1,'pending@example.com')",[pending])
assert.equal(await role(pending),'student','unverified signup trigger cannot grant admin')
assert.equal((await resolve(pending,['pending@example.com'])).role,'student')
await db.query('update auth.users set email_confirmed_at=now() where id=$1',[pending])
assert.equal((await resolve(pending)).role,'admin','verified pending grant activates')
await change('pending@example.com',false)
// A still-valid session identifies the same user; every new admin request checks the current role.
await change('other@example.com',false)
assert.equal((await resolve(other,['other@example.com'])).role,'student')
await assert.rejects(change('next@example.com',true,other),/admin_required/)
await assert.rejects(overview(null,other),/admin_required/)
const before = (await db.query('select count(*)::int n from admin_access_audit')).rows[0].n
await db.exec(`create function reject_admin_audit() returns trigger language plpgsql as $$begin raise exception 'forced_audit_failure'; end$$;
create trigger fail_audit before insert on admin_access_audit for each row execute function reject_admin_audit();`)
await assert.rejects(change('other@example.com',true),/forced_audit_failure/)
assert.equal(await role(other),'student','failed audit rolls back role mutation')
assert.equal((await db.query("select active from admin_role_allowlist where email='other@example.com'")).rows[0].active,false)
assert.equal((await db.query('select count(*)::int n from admin_access_audit')).rows[0].n,before)
await db.exec('drop trigger fail_audit on admin_access_audit;')
const snapshot = await overview('coach@example.com')
assert.equal(snapshot.diagnostic.accounts[0].role,'coach')
assert.equal(snapshot.diagnostic.coachAccounts[0].status,'enabled')
assert.equal(snapshot.diagnostic.coachAccounts[0].ownerId,coach)
assert.equal((await db.query('select count(*)::int n from admin_access_audit')).rows[0].n,before,'diagnostics cannot mutate access')
assert.equal(await role(coach),'coach')
assert.equal((await overview('unknown@example.com')).diagnostic.accounts.length,0)
await db.exec("insert into auth.users(id,email,email_confirmed_at) values(gen_random_uuid(),'coach@example.com',now());")
await assert.rejects(change('coach@example.com',true),/admin_email_conflict/)
assert.equal((await overview('coach@example.com')).diagnostic.accounts.length,2,'diagnostics exposes conflicting identities instead of choosing one')
await db.exec("insert into auth.users(id,email,email_confirmed_at) values(gen_random_uuid(),'missing-profile@example.com',now()); delete from profiles where email='missing-profile@example.com';")
await assert.rejects(change('missing-profile@example.com',true),/admin_profile_missing/)
assert.equal((await db.query("select count(*)::int n from admin_role_allowlist where email='missing-profile@example.com'")).rows[0].n,0,'missing profile rolls back pending grant')
for (const signature of ['resolve_account_role(uuid,text[])','admin_set_access(uuid,text,boolean,text)','admin_account_overview(uuid,text,text[])']) {
  for (const user of ['anon','authenticated']) assert.equal((await db.query('select has_function_privilege($1,$2,\'EXECUTE\') allowed',[user,signature])).rows[0].allowed,false)
  assert.equal((await db.query('select has_function_privilege(\'service_role\',$1,\'EXECUTE\') allowed',[signature])).rows[0].allowed,true)
}
console.log('PASS: equivalent admins, grant/revoke, coach fallback, verified activation, self-revoke protection, environment/email/stale-session bypass rejection, atomic audit rollback, read-only diagnosis, RPC browser denial.')
await db.close()
