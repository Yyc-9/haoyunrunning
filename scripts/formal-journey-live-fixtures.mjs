import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const dir = '/tmp/haoyun-formal-journey-20260918'
const accounts = JSON.parse(await readFile(`${dir}/accounts.json`, 'utf8')).accounts
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (new URL(url).hostname !== 'vmnbthmssiizbsvzeahz.supabase.co') throw new Error('Unexpected project')
const db = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const must = async operation => { const result = await operation; if (result.error) throw result.error; return result.data }
let fixture
try { fixture = JSON.parse(await readFile(`${dir}/fixtures.json`, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
if (fixture) throw new Error('Fixture manifest already exists; inspect and reuse rather than duplicate')
const student = accounts.find(a => a.label === 'student')
const now = Date.now()
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(now))
const time = minutes => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(now + minutes * 60000))
fixture = { marker: 'formal-journey-20260918', seasonId: randomUUID(), date, courses: ['a','b','c'].map((label,index)=>({label,id:randomUUID(),slug:`qa-journey-20260918-${label}`,coachLabel: label === 'b' ? 'coach-b' : 'coach-a',startTime:time(index===1?12:8)})), leads: ['a','c'].map(label=>({label,id:randomUUID()})) }
await writeFile(`${dir}/fixtures.json`, JSON.stringify(fixture), { mode: 0o600 })
await must(db.from('course_seasons').insert({ id:fixture.seasonId,code:'2000-Q1',name:'驗收測試專用－非正式課程',status:'active',is_current:false,starts_on:date,ends_on:date }))
for (const label of ['coach-a','coach-b']) {
  const coach = accounts.find(a=>a.label===label)
  await must(db.from('coach_public_profiles').insert({coach_key:`qa-journey-${label}`,owner_profile_id:coach.id,display_name:`驗收測試-${label}`,published:false,profile_initialized:true}))
}
for (const course of fixture.courses) {
  await must(db.from('course_season_courses').insert({ id:course.id,season_id:fixture.seasonId,course_slug:course.slug,capacity:2,start_time:course.startTime,time_zone:'Asia/Taipei',course_data:{name:`驗收測試 ${course.label.toUpperCase()} 班（非正式）`,templateSlug:'zhubei-night-run-monday',active:false,coachKeys:[`qa-journey-${course.coachLabel}`],weekday:'星期五',classTime:`${course.startTime}－23:59`,location:'隔離验收－不實際上課'},billing_config:{scheduleReady:true,sessionDates:[date],returningFullPrice:1,newFullPrice:1,returningLateRate:1,referredLateRate:1,standardLateRate:1,regularUntilSessionNumber:1,priceLockHours:24} }))
}
for (const lead of fixture.leads) {
  const course=fixture.courses.find(c=>c.label===lead.label)
  await must(db.from('signup_leads').insert({id:lead.id,source:'course_payment',name:'驗收測試學員－非正式帳款',email:student.email,status:'pending_review',season_id:fixture.seasonId,course_season_course_id:course.id,course_slug:course.slug,course_capacity:2,calculated_amount:0,amount_text:'驗收測試／無實際收款',notes:fixture.marker,payload:{acceptance_fixture:fixture.marker},billing_start_session_date:date}))
}
console.log(JSON.stringify({seasonId:fixture.seasonId,courses:fixture.courses.map(({label,id})=>({label,id})),leads:fixture.leads,publicSeason:false,noRealPayment:true}))
