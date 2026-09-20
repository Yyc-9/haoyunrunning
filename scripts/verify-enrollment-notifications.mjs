// Isolated PostgreSQL verification. No project credentials, remote DB, or emails are used.
// Install @electric-sql/pglite in a temporary directory; pass its module path as PGLITE_MODULE.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
let checks = 0
const check = async (name, fn) => { await fn(); checks++; console.log('PASS', name) }
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0]
const value = async (sql, args = []) => Object.values(await one(sql, args))[0]
const staff = randomUUID(), staff2 = randomUUID(), student = randomUUID(), outsider = randomUUID(), season = randomUUID(), lead = randomUUID(), request = randomUUID()
const email = 'student@example.invalid'
const ask = (id = request, status = 'pending_review', submitted = null, message = '請補充實際金額') => db.query('select public.request_enrollment_supplement($1,$2,$3,$4,$5,$6,$7,$8) as result', [id,lead,staff,'missing_info',message,'INTERNAL-DO-NOT-SEND',status,submitted])
const feed = (id, mail, isStaff) => value('select public.enrollment_notification_feed($1,$2,$3)', [id,mail,isStaff])
const submit = (mail = email, req = request, last = '00123', date = '2026-01-01') => db.query('select public.submit_enrollment_supplement($1,$2,$3,$4,$5,$6)', [lead,mail,last,date,'已補交金額',req])
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.profiles(id uuid primary key);
    create table public.course_seasons(id uuid primary key,status text);
    create table public.signup_leads(id uuid primary key, source text,email text,status text,season_id uuid,notes text,review_note text,reviewed_at timestamptz,payment_submitted_at timestamptz,transfer_last_five text);
    grant usage on schema public to anon,authenticated,service_role;
    grant all on all tables in schema public to service_role;`)
  await db.query('insert into profiles values ($1),($2),($3),($4)',[staff,staff2,student,outsider])
  await db.query('insert into course_seasons values ($1,$2)',[season,'active'])
  await db.query('insert into signup_leads(id,source,email,status,season_id,notes) values ($1,$2,$3,$4,$5,$6)',[lead,'course_payment',email,'pending_review',season,'原始報名備註'])
  await db.exec(await readFile(new URL('../supabase/migrations/20260920064910_enrollment_notifications.sql', import.meta.url),'utf8'))
  await check('existing active unfinished enrollments enter staff queue',async()=> { assert.equal((await feed(staff,'staff@example.invalid',true)).unreadCount,1) })
  await check('browser roles cannot read tables or call privileged RPCs',async()=> {
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(db.query('select * from enrollment_followups'), /permission denied/)
      await assert.rejects(db.query('select public.enrollment_notification_feed($1,$2,true)',[staff,email]), /permission denied/)
      await db.exec('reset role')
    }
  })
  await db.exec('set role service_role')
  await check('atomic request returns JSON, transitions enrollment and creates one student notification',async()=>{ assert.equal((await ask()).rows[0].result.id,request); assert.equal(await value('select status from signup_leads where id=$1',[lead]),'rejected'); assert.equal((await feed(student,email,false)).unreadCount,1) })
  await check('retrying identical request does not duplicate the request or notification',async()=>{ await ask(); assert.equal(await value('select count(*)::int from enrollment_followups'),1); assert.equal((await feed(student,email,false)).unreadCount,1) })
  await check('request id reuse with changed content is rejected',async()=>{ await assert.rejects(ask(request,'pending_review',null,'changed'),/request_id_conflict/) })
  await check('internal notes are absent from notification payload',async()=>{ assert.ok(!JSON.stringify(await feed(student,email,false)).includes('INTERNAL')); assert.ok(!JSON.stringify(await feed(staff,'staff@example.invalid',true)).includes('INTERNAL')) })
  await check('students cannot see other students or staff notifications',async()=>{ assert.equal((await feed(outsider,'other@example.invalid',false)).items.length,0); assert.equal((await feed(student,email,false)).items[0].audience,'student') })
  await check('read state is per account and cannot mutate another audience',async()=>{
    const item = (await feed(staff,'staff@example.invalid',true)).items[0]
    await db.query('select public.read_enrollment_notifications($1,$2,$3,$4)',[outsider,'other@example.invalid',false,[item.id]])
    assert.equal(await value('select count(*)::int from enrollment_notification_reads'),0)
    await db.query('select public.read_enrollment_notifications($1,$2,$3,$4)',[staff,'staff@example.invalid',true,[item.id]])
    assert.equal((await feed(staff,'staff@example.invalid',true)).unreadCount,0); assert.equal((await feed(staff2,'staff2@example.invalid',true)).unreadCount,1)
    assert.equal(await value('select status from signup_leads where id=$1',[lead]),'rejected')
  })
  const mailPayload = {from:'qa@example.invalid',to:email,text:'public student message'}
  await check('email claims reject concurrency and preserve original retry payload',async()=>{
    const claim = (payload = mailPayload) => db.query('select * from public.claim_enrollment_followup_email($1,$2,$3)',[request,email,payload])
    assert.equal((await claim()).rows.length,1); assert.equal((await claim()).rows.length,0)
    await db.query("update enrollment_followups set email_status='failed' where id=$1",[request])
    assert.deepEqual((await claim({text:'changed'})).rows[0].email_payload,mailPayload)
  })
  await check('uncertain mail cannot be retried after idempotency window',async()=>{
    await db.query("update enrollment_followups set email_first_attempt_at=now()-interval '25 hours' where id=$1",[request])
    assert.equal((await db.query('select * from public.claim_enrollment_followup_email($1,$2,$3)',[request,email,mailPayload])).rows.length,0)
    assert.equal(await value('select email_status from enrollment_followups where id=$1',[request]),'expired')
  })
  await check('another student and a stale request cannot submit',async()=>{ await assert.rejects(submit('other@example.invalid'),/enrollment_not_found/); await assert.rejects(submit(email,randomUUID()),/enrollment_changed/) })
  await check('future dates and invalid bank suffixes are rejected',async()=>{ await assert.rejects(submit(email,request,'123'),/invalid_transfer/); await assert.rejects(submit(email,request,'00123','2999-01-01'),/invalid_transfer/) })
  await check('supplement returns original enrollment to review and preserves original notes',async()=>{
    await submit(); assert.equal(await value('select count(*)::int from signup_leads'),1)
    const row = await one('select * from signup_leads where id=$1',[lead]); assert.equal(row.status,'pending_review'); assert.ok(row.notes.includes('原始報名備註'))
    const f = await one('select * from enrollment_followups where id=$1',[request]); assert.ok(f.responded_at); assert.equal(f.student_reply,'已補交金額')
    assert.equal((await feed(staff,'staff@example.invalid',true)).unreadCount,1)
  })
  await check('double submit and stale finance form cannot overwrite the new report',async()=>{ await assert.rejects(submit(),/enrollment_changed/); await assert.rejects(ask(randomUUID()),/enrollment_changed/) })
  await check('approval creates one confirmation and blocks further supplement requests',async()=>{
    await db.query("update signup_leads set status='approved' where id=$1",[lead]); await db.query("update signup_leads set status='approved' where id=$1",[lead])
    assert.equal(await value("select count(*)::int from enrollment_notifications where kind='approved'"),1)
    await assert.rejects(ask(randomUUID(),'approved'),/enrollment_not_writable/)
  })
  await check('archived seasons reject writes and email claims',async()=>{
    await db.query("update signup_leads set status='pending_review',payment_submitted_at=null where id=$1",[lead])
    const next = randomUUID(); await ask(next)
    await db.query("update course_seasons set status='archived' where id=$1",[season])
    await assert.rejects(submit(email,next),/season_not_writable/)
    assert.equal((await db.query('select * from public.claim_enrollment_followup_email($1,$2,$3)',[next,email,mailPayload])).rows.length,0)
    await assert.rejects(ask(randomUUID(),'rejected'),/season_not_writable/)
  })
  await check('event trigger ignores unrelated signup sources',async()=>{
    const before = await value('select count(*)::int from enrollment_notifications')
    await db.query('insert into signup_leads(id,source,email,status,season_id) values ($1,$2,$3,$4,$5)',[randomUUID(),'newsletter',email,'pending_review',season])
    assert.equal(await value('select count(*)::int from enrollment_notifications'),before)
  })
  console.log(`${checks} isolated PostgreSQL checks passed`)
} finally { await db.close() }
