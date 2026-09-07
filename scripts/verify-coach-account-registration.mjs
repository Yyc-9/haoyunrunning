import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sqlPath = path.join(root, 'supabase/operations/coach-admin-registration.sql')
const pgliteModule = process.env.PGLITE_MODULE || '/private/tmp/haoyun-season-db-test/node_modules/@electric-sql/pglite/dist/index.js'
const { PGlite } = await import(pgliteModule)

const db = new PGlite()

async function exec(sql) {
  return db.exec(sql)
}

await exec(`
  create schema if not exists auth;
  create role anon;
  create role authenticated;
  create role service_role;
  alter role service_role bypassrls;
  create function public.gen_random_uuid() returns uuid language sql volatile as 'select uuid_in(md5(random()::text || clock_timestamp()::text)::cstring)';
  create type public.app_role as enum ('student', 'coach', 'admin');
  create table auth.users (
    id uuid primary key,
    email text,
    email_confirmed_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role public.app_role not null default 'student',
    name text not null default '',
    email text not null default ''
  );
  create table public.coach_public_profiles (
    coach_key text primary key,
    owner_profile_id uuid unique references public.profiles(id) on delete set null,
    display_name text not null,
    verification_email text
  );
  create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
`)

const operationsSql = await fs.readFile(sqlPath, 'utf8')
await exec(operationsSql)
await exec(operationsSql)

const ids = {
  admin: '00000000-0000-0000-0000-000000000001',
  coachA: '00000000-0000-0000-0000-000000000002',
  studentB: '00000000-0000-0000-0000-000000000003',
  coachC: '00000000-0000-0000-0000-000000000004',
  other: '00000000-0000-0000-0000-000000000005',
}

await exec(`
  insert into auth.users (id, email, email_confirmed_at) values
    ('${ids.admin}', 'admin@example.test', now()),
    ('${ids.coachA}', 'coach-a@example.test', now()),
    ('${ids.studentB}', 'coach-b@example.test', now()),
    ('${ids.coachC}', 'coach-c@example.test', null),
    ('${ids.other}', 'other@example.test', now());
  insert into public.profiles (id, role, name, email) values
    ('${ids.admin}', 'admin', 'Admin', 'admin@example.test'),
    ('${ids.coachA}', 'coach', 'Coach A', 'coach-a@example.test'),
    ('${ids.studentB}', 'student', 'Coach B', 'coach-b@example.test'),
    ('${ids.coachC}', 'student', 'Coach C', 'coach-c@example.test'),
    ('${ids.other}', 'coach', 'Other', 'other@example.test');
  insert into public.coach_public_profiles (coach_key, owner_profile_id, display_name, verification_email) values
    ('coach-a', '${ids.coachA}', 'Coach A', 'coach-a@example.test'),
    ('coach-b', null, 'Coach B', 'coach-b@example.test'),
    ('coach-c', null, 'Coach C', 'coach-c@example.test'),
    ('coach-admin', '${ids.admin}', 'Admin Coach', 'admin@example.test');
`)
await exec(operationsSql)

const scalar = async (sql) => (await db.query(sql)).rows[0]
const jsonResult = async (sql) => (await db.query(sql)).rows[0]?.result

const seeded = await scalar(`select count(*)::int as count from public.coach_account_allowlist`)
assert.equal(seeded.count, 4, 'seed creates only the four non-empty verification-email rows')
const seededRows = (await db.query(`select coach_key, status, profile_id from public.coach_account_allowlist order by coach_key`)).rows
assert.deepEqual(seededRows, [
  { coach_key: 'coach-a', status: 'enabled', profile_id: ids.coachA },
  { coach_key: 'coach-admin', status: 'enabled', profile_id: ids.admin },
  { coach_key: 'coach-b', status: 'pending', profile_id: null },
  { coach_key: 'coach-c', status: 'pending', profile_id: null },
])

const repeatSeeded = await scalar(`select count(*)::int as count from public.coach_account_allowlist`)
assert.equal(repeatSeeded.count, seeded.count, 're-running the operations script is idempotent')

const registerC = await jsonResult(`select public.register_coach_account('${ids.admin}', 'coach-c', 'coach-c@example.test', null, false, 'test') as result`)
const registerCRepeat = await jsonResult(`select public.register_coach_account('${ids.admin}', 'coach-c', 'coach-c@example.test', null, false, 'test-repeat') as result`)
assert.equal(registerC.status, 'pending')
assert.equal(registerCRepeat.status, 'pending')
assert.equal((await scalar(`select count(*)::int as count from public.coach_account_allowlist where coach_key = 'coach-c'`)).count, 1)

const unverified = await jsonResult(`select public.activate_coach_allowlist((select id from public.coach_account_allowlist where coach_key = 'coach-b'), '${ids.studentB}', 'coach-b@example.test', false, '${ids.studentB}', 'test') as result`)
assert.equal(unverified.status, 'pending_email')
assert.equal((await scalar(`select role::text as role from public.profiles where id = '${ids.studentB}'`)).role, 'student')

const activated = await jsonResult(`select public.activate_coach_allowlist((select id from public.coach_account_allowlist where coach_key = 'coach-b'), '${ids.studentB}', 'coach-b@example.test', true, '${ids.studentB}', 'test') as result`)
assert.equal(activated.status, 'enabled')
assert.equal((await scalar(`select role::text as role from public.profiles where id = '${ids.studentB}'`)).role, 'coach')
assert.equal((await scalar(`select owner_profile_id::text as owner from public.coach_public_profiles where coach_key = 'coach-b'`)).owner, ids.studentB)
const auditAfterActivation = await scalar(`select count(*)::int as count from public.coach_account_audit_log where coach_key = 'coach-b' and action = 'activated'`)
assert.equal(auditAfterActivation.count, 1)
const repeatActivation = await jsonResult(`select public.activate_coach_allowlist((select id from public.coach_account_allowlist where coach_key = 'coach-b'), '${ids.studentB}', 'coach-b@example.test', true, '${ids.studentB}', 'heartbeat') as result`)
assert.equal(repeatActivation.idempotent, true)
assert.equal((await scalar(`select count(*)::int as count from public.coach_account_audit_log where coach_key = 'coach-b' and action = 'activated'`)).count, 1)

await assert.rejects(
  () => jsonResult(`select public.activate_coach_allowlist((select id from public.coach_account_allowlist where coach_key = 'coach-c'), '${ids.studentB}', 'coach-c@example.test', true, '${ids.studentB}', 'collision') as result`),
  /identity_collision/,
)
await assert.rejects(
  () => jsonResult(`select public.register_coach_account('${ids.admin}', 'coach-c', 'coach-b@example.test', null, false, 'duplicate') as result`),
  /email_conflict/,
)

const coachBAllowlist = (await scalar(`select id::text as id from public.coach_account_allowlist where coach_key = 'coach-b'`)).id
const disabled = await jsonResult(`select public.set_coach_account_status('${ids.admin}', '${coachBAllowlist}', false, null, null, false, 'test-disable') as result`)
assert.equal(disabled.status, 'disabled')
assert.equal((await scalar(`select role::text as role from public.profiles where id = '${ids.studentB}'`)).role, 'student')
await assert.rejects(
  () => jsonResult(`select public.activate_coach_allowlist('${coachBAllowlist}', '${ids.studentB}', 'coach-b@example.test', true, '${ids.studentB}', 'disabled-login') as result`),
  /allowlist_disabled/,
)
const reenabled = await jsonResult(`select public.set_coach_account_status('${ids.admin}', '${coachBAllowlist}', true, '${ids.studentB}', 'coach-b@example.test', true, 'test-enable') as result`)
assert.equal(reenabled.status, 'enabled')

const adminAllowlist = await jsonResult(`select public.register_coach_account('${ids.admin}', 'coach-admin', 'admin@example.test', '${ids.admin}', true, 'admin-registration') as result`)
assert.equal(adminAllowlist.status, 'enabled', 'admin can own a matching coach account without being demoted')
assert.equal((await scalar(`select role::text as role from public.profiles where id = '${ids.admin}'`)).role, 'admin')
const adminAccountId = (await scalar(`select id::text as id from public.coach_account_allowlist where coach_key = 'coach-admin'`)).id
await assert.rejects(
  () => jsonResult(`select public.set_coach_account_status('${ids.admin}', '${adminAccountId}', false, null, null, false, 'admin-stop') as result`),
  /admin_protected/,
)

await exec(`
  update auth.users set email_confirmed_at = now() where id = '${ids.coachC}';
  grant select, update on public.profiles to service_role;
  grant select, update on public.coach_public_profiles to service_role;
`)
await exec('set role service_role')
const serviceActivated = await jsonResult(`select public.activate_coach_allowlist((select id from public.coach_account_allowlist where coach_key = 'coach-c'), '${ids.coachC}', 'coach-c@example.test', true, '${ids.coachC}', 'service-role-test') as result`)
await exec('reset role')
assert.equal(serviceActivated.status, 'enabled', 'service_role can execute the invoker RPC with explicit table grants')
assert.equal((await scalar(`select role::text as role from public.profiles where id = '${ids.coachC}'`)).role, 'coach')
assert.equal((await scalar(`select owner_profile_id::text as owner from public.coach_public_profiles where coach_key = 'coach-c'`)).owner, ids.coachC)

const privileges = (await db.query(`
  select
    has_table_privilege('anon', 'public.coach_account_allowlist', 'select') as anon_select,
    has_table_privilege('authenticated', 'public.coach_account_allowlist', 'select') as auth_select,
    has_function_privilege('anon', 'public.activate_coach_allowlist(uuid,uuid,text,boolean,uuid,text)', 'execute') as anon_execute,
    has_function_privilege('authenticated', 'public.register_coach_account(uuid,text,text,uuid,boolean,text)', 'execute') as auth_execute,
    has_function_privilege('service_role', 'public.activate_coach_allowlist(uuid,uuid,text,boolean,uuid,text)', 'execute') as service_execute
`)).rows[0]
assert.equal(privileges.anon_select, false)
assert.equal(privileges.auth_select, false)
assert.equal(privileges.anon_execute, false)
assert.equal(privileges.auth_execute, false)
assert.equal(privileges.service_execute, true)

const policy = (await db.query(`select with_check from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own'`)).rows[0]
assert.match(policy.with_check, /student/)

await db.close()
console.log('coach account SQL isolation checks passed')
