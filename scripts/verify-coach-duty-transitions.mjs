import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pgliteModule = process.env.PGLITE_MODULE ?? '/private/tmp/haoyun-season-db-test/node_modules/@electric-sql/pglite/dist/index.js'
const { PGlite } = await import(pgliteModule)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sqlPath = process.argv[2] ?? resolve(repoRoot, 'supabase/operations/coach-duty-transitions.sql')
const transitionSql = await readFile(sqlPath, 'utf8')
const admin = '00000000-0000-0000-0000-000000000001'
const coach = '00000000-0000-0000-0000-000000000002'
const substitute = '00000000-0000-0000-0000-000000000003'
const student = '00000000-0000-0000-0000-000000000004'
const course = '10000000-0000-0000-0000-000000000001'
const today = new Date(Date.now() + 8 * 60 * 60 * 1000)
const startTime = `${today.toISOString().slice(11, 16)}:00`

function schema(startType) {
  const courseValue = startType === 'time' ? `'${startTime}'::time` : `'${startTime}'`
  return `
    create role anon;
    create role authenticated;
    create role service_role;
    create table public.profiles (id uuid primary key, role text);
    create table public.course_season_courses (id uuid primary key, start_time ${startType}, time_zone text);
    create table public.coach_session_assignments (
      id uuid primary key, season_id uuid, course_season_course_id uuid, course_slug text,
      session_date date, scheduled_coach_id uuid, actual_coach_id uuid, coach_role text,
      leave_status text, leave_reason text, leave_requested_at timestamptz,
      recommended_substitute_id uuid, substitute_coach_id uuid, substitute_response text,
      substitute_responded_at timestamptz, admin_status text, admin_reviewed_by uuid,
      admin_reviewed_at timestamptz, admin_reason text
    );
    create table public.coach_session_checkins (
      id uuid primary key default gen_random_uuid(), assignment_id uuid unique,
      actual_coach_id uuid, checked_in_at timestamptz, punctuality text,
      manual_correction boolean, corrected_by uuid, corrected_at timestamptz, correction_reason text
    );
    create table public.course_session_cancellations (id uuid primary key, course_season_course_id uuid, session_date date);
    create table public.coach_session_duty_audit_log (
      id uuid primary key default gen_random_uuid(), assignment_id uuid, actor_profile_id uuid,
      action text, reason text, snapshot jsonb, created_at timestamptz default now()
    );
    insert into public.profiles values
      ('${admin}', 'admin'), ('${coach}', 'coach'), ('${substitute}', 'coach'), ('${student}', 'student');
    insert into public.course_season_courses values ('${course}', ${courseValue}, 'Asia/Taipei');
    insert into public.coach_session_assignments (
      id, season_id, course_season_course_id, course_slug, session_date, scheduled_coach_id,
      actual_coach_id, coach_role, leave_status, leave_reason, substitute_response, admin_status, admin_reason,
      recommended_substitute_id, substitute_coach_id
    ) values
      ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '${course}', 'demo', '2099-01-01', '${coach}', '${coach}', 'coach', 'requested', '', 'pending', 'pending', '', '${substitute}', '${substitute}'),
      ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '${course}', 'demo', '2099-01-02', '${coach}', '${coach}', 'coach', 'none', '', 'none', 'not_required', '', null, null);
  `
}

async function build(startType) {
  const db = new PGlite()
  await db.exec(schema(startType))
  await db.exec(transitionSql)
  return db
}

const db = await build('time')
await db.exec(`select public.apply_coach_duty_transition('20000000-0000-0000-0000-000000000001', 'review_leave', '${admin}'::uuid, '{"decision":"rejected","reason":"已取消代班安排"}'::jsonb)`)
const rejected = (await db.query(`select leave_status, admin_status, recommended_substitute_id, substitute_coach_id, substitute_response from public.coach_session_assignments where id = '20000000-0000-0000-0000-000000000001'`)).rows[0]
assert.deepEqual(rejected, {
  leave_status: 'rejected',
  admin_status: 'rejected',
  recommended_substitute_id: null,
  substitute_coach_id: null,
  substitute_response: 'none',
})
await assert.rejects(
  () => db.exec(`select public.apply_coach_duty_transition('20000000-0000-0000-0000-000000000001', 'respond_substitute', '${substitute}'::uuid, '{"response":"accepted"}'::jsonb)`),
  /substitution invitation is not pending for this actor|substitution invitation is stale/,
)
await assert.rejects(
  () => db.exec(`select public.apply_coach_duty_transition('20000000-0000-0000-0000-000000000001', 'confirm_substitute', '${admin}'::uuid, '{"emergency":true,"reason":"過期邀請"}'::jsonb)`),
  /substitution confirmation is stale|substitute coach is missing/,
)
assert.equal((await db.query(`select has_function_privilege('service_role', 'public.apply_coach_duty_transition(uuid,text,uuid,jsonb)', 'execute') as ok`)).rows[0].ok, true)
await db.close()

const textDb = await build('text')
await textDb.exec(`select public.apply_coach_duty_transition('20000000-0000-0000-0000-000000000002', 'request_leave', '${coach}'::uuid, '{"reason":"text start_time fixture"}'::jsonb)`)
assert.equal((await textDb.query(`select leave_status from public.coach_session_assignments where id = '20000000-0000-0000-0000-000000000002'`)).rows[0].leave_status, 'requested')
await textDb.close()

console.log('coach-duty-transition-fixture-ok: rejected invitation stale, time/text start_time, service_role grant')
