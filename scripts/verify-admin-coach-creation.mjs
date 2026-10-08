// Runs only in an in-memory PostgreSQL instance; no production credentials required.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql as $$select null::uuid$$;
  create type public.app_role as enum ('student','coach','admin');
  create table public.profiles(id uuid primary key references auth.users(id), email text, role public.app_role);
  create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
`)
await db.exec(await readFile(new URL('../supabase/migrations/20260714013000_coach_public_profiles.sql', import.meta.url), 'utf8'))
await db.exec('alter table coach_public_profiles add column verification_email text;')
await db.exec(await readFile(new URL('../supabase/operations/coach-admin-registration.sql', import.meta.url), 'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/20261008090000_admin_create_coach.sql', import.meta.url), 'utf8'))
const admin = '11111111-1111-4111-8111-111111111111'
const otherAdmin = '22222222-2222-4222-8222-222222222222'
const student = '33333333-3333-4333-8333-333333333333'
const unverified = '44444444-4444-4444-8444-444444444444'
await db.query(`insert into auth.users values($1,'admin@example.com',now()),($2,'other@example.com',now()),($3,'existing@example.com',now()),($4,'unverified@example.com',null)`, [admin, otherAdmin, student, unverified])
await db.exec(`insert into profiles select id,email,case when email in ('admin@example.com','other@example.com') then 'admin'::app_role else 'student'::app_role end from auth.users;`)
assert.equal((await db.query("select has_table_privilege('service_role','auth.users','SELECT') allowed")).rows[0].allowed,false)
const create = async (email, actor = admin, kind = 'assistant', name = '新助教') => {
  await db.exec('set role service_role')
  try { return (await db.query('select public.admin_create_coach($1,$2,$3,$4) as result', [actor, name, kind, email])).rows[0].result }
  finally { await db.exec('reset role') }
}
const fresh = await create(' NEW@example.com ')
assert.equal(fresh.status, 'pending')
const identity = (await db.query('select * from coach_public_profiles where coach_key=$1', [fresh.coach_key])).rows[0]
assert.equal(identity.published, false)
assert.equal(identity.role_title, '助教')
assert.equal(identity.verification_email, 'new@example.com')
assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n, 4)
const existing = await create('existing@example.com', otherAdmin, 'coach')
assert.equal(existing.status, 'enabled')
assert.equal((await db.query('select role from profiles where id=$1', [student])).rows[0].role, 'coach')
assert.equal((await create('unverified@example.com')).status, 'pending')
assert.equal((await db.query('select role from profiles where id=$1', [unverified])).rows[0].role, 'student')
const count = async () => (await db.query('select count(*)::int as n from coach_public_profiles')).rows[0].n
const before = await count()
await assert.rejects(create('new@example.com'), /email_conflict/)
await assert.rejects(create('unauthorized@example.com', student), /admin_required/)
await assert.rejects(create('invalid'), /email_conflict/)
await assert.rejects(create('blank@example.com', admin, 'assistant', ' '), /invalid_coach_identity/)
await assert.rejects(create('role@example.com', admin, 'admin'), /invalid_coach_identity/)
assert.equal(await count(), before)
// A verified auth account without its application profile must roll back the new identity.
await db.exec("insert into auth.users values(gen_random_uuid(),'missing-profile@example.com',now())")
await assert.rejects(create('missing-profile@example.com'), /profile_missing/)
assert.equal(await count(), before)
assert.equal((await db.query("select count(*)::int as n from coach_account_allowlist where email='missing-profile@example.com'")).rows[0].n, 0)
assert.equal((await db.query("select count(*)::int as n from coach_account_audit_log where action='registered'")).rows[0].n, 3)
console.log('PASS: both admins, new and existing accounts, verified activation, pending verification, role boundaries, duplicates, atomic rollback, audit and unpublished biography.')
await db.close()
