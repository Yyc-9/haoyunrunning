import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema private;
    create table profiles(id uuid primary key, role text);
    create table course_seasons(id uuid primary key, status text);
    create table signup_leads(id uuid primary key, source text, registration_status text, status text,
      season_id uuid, name text, preferred_course text, amount_text text, updated_at timestamptz default now());
    insert into profiles values ('11111111-1111-4111-8111-111111111111','admin'),('22222222-2222-4222-8222-222222222222','coach');
    insert into course_seasons values ('33333333-3333-4333-8333-333333333333','active');
    insert into signup_leads(id,source,registration_status,status,season_id,name,preferred_course,amount_text)
      values ('44444444-4444-4444-8444-444444444444','course_payment','active','approved','33333333-3333-4333-8333-333333333333','Test Student','Class A','3600'),
      ('55555555-5555-4555-8555-555555555555','course_payment','active','approved','33333333-3333-4333-8333-333333333333','Test Student','Class B','2400');`)
  await db.exec(await readFile(new URL('../supabase/migrations/20261105090000_admin_enrollment_refund.sql', import.meta.url), 'utf8'))
  const admin = '11111111-1111-4111-8111-111111111111'
  const id = '44444444-4444-4444-8444-444444444444'
  const call = async (actor = admin, fingerprint = null, reason = '') => (await db.query('select admin_refund_enrollment($1,$2,$3,$4) result', [actor,id,reason,fingerprint])).rows[0].result
  const count = async () => Number((await db.query("select count(*) n from signup_leads where registration_status='active'")).rows[0].n)
  await assert.rejects(call('22222222-2222-4222-8222-222222222222'), /超級管理員/)
  assert.equal((await db.query("select has_function_privilege('authenticated','public.admin_refund_enrollment(uuid,uuid,text,text)','execute') ok")).rows[0].ok, false)
  const first = await call()
  assert.equal(first.studentName, 'Test Student')
  assert.equal(await count(), 2)
  assert.equal(Number((await db.query('select count(*) n from admin_enrollment_refund_audit')).rows[0].n), 0)
  await assert.rejects(call(admin, first.fingerprint, ' '), /原因/)
  await db.exec("update signup_leads set amount_text='3500' where preferred_course='Class A'")
  await assert.rejects(call(admin, first.fingerprint, 'Refunded'), /已變更/)
  await db.exec("update course_seasons set status='archived'")
  await assert.rejects(call(), /季度/)
  await db.exec("update course_seasons set status='active'; update signup_leads set status='pending_review' where preferred_course='Class A'")
  await assert.rejects(call(), /已確認入帳/)
  await db.exec("update signup_leads set status='approved' where preferred_course='Class A'")
  const preview = await call()
  const before = (await db.query('select * from signup_leads where id=$1',[id])).rows[0]
  assert.equal((await call(admin, preview.fingerprint, 'Refund completed externally')).releasedSeats, 1)
  assert.equal(await count(), 1)
  const after = (await db.query('select * from signup_leads where id=$1',[id])).rows[0]
  assert.equal(after.registration_status, 'cancelled')
  assert.equal(after.status, 'approved')
  assert.equal(after.amount_text, before.amount_text)
  assert.equal((await db.query("select registration_status from signup_leads where preferred_course='Class B'")).rows[0].registration_status, 'active')
  const audit = (await db.query('select * from admin_enrollment_refund_audit')).rows
  assert.equal(audit.length, 1)
  assert.equal(audit[0].actor_id, admin)
  assert.equal(audit[0].previous_data.registration_status, 'active')
  await assert.rejects(call(admin, preview.fingerprint, 'Retry'), /有效/)
  await assert.rejects(db.exec("update signup_leads set registration_status='active' where preferred_course='Class A'"), /恢復占位/)
  assert.equal(await count(), 1)
  console.log('PASS: authorization, read-only preview, stale preview, archived/unpaid guards, one released seat, retained payment, other class unchanged, audit, duplicate prevention, sync protection')
} finally { await db.close() }
