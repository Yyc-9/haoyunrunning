import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'node:fs/promises'

const dir='/tmp/haoyun-formal-journey-20260918'
const {accounts}=JSON.parse(await readFile(`${dir}/accounts.json`,'utf8'))
const f=JSON.parse(await readFile(`${dir}/fixtures.json`,'utf8'))
const base=process.env.JOURNEY_BASE_URL || 'http://127.0.0.1:3000'
if(!['http://127.0.0.1:3000','https://nurturerunningteam.com'].includes(base))throw Error('Unexpected test origin')
const clients={}; const tokens={}; const results=[]
for(const account of accounts){
 const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error}=await c.auth.signInWithPassword({email:account.email,password:account.password});if(error)throw error
 clients[account.label]=c;tokens[account.label]=data.session.access_token
}
const call=async(role,path,body)=>{const response=await fetch(base+path,{method:body?'POST':'GET',headers:{authorization:`Bearer ${tokens[role]}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await response.json();return {status:response.status,data}}
const check=async(name,fn)=>{await fn();results.push(name);await writeFile(`${dir}/api-${process.argv[2]}-results.json`,JSON.stringify({base,passed:results}),{mode:0o600});console.log('PASS',name)}
const path=`/api/student/attendance?seasonId=${f.seasonId}`
try {
 if(process.argv[2]==='pending'){
  await check('普通學員不能讀管理員資料',async()=>assert.equal((await call('student','/api/admin')).status,403))
  await check('普通教練不能讀管理員資料',async()=>assert.equal((await call('coach-a','/api/admin')).status,403))
  await check('待入帳學員名冊為空',async()=>{const r=await call('student',path);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.enrollments.length,0)})
  await check('待入帳不能正式簽到',async()=>{const r=await call('student',path,{intent:'check_in',enrollmentId:f.leads[0].id,courseSeasonCourseId:f.courses[0].id,sessionDate:f.date});assert.ok(r.status>=400,JSON.stringify(r))})
  await check('普通學員不能自行綁定教練',async()=>assert.equal((await call('student','/api/student/bind-coach',{})).status,410))
  await check('普通教練不能手動繞過入帳綁定',async()=>assert.equal((await call('coach-a','/api/coach/bind-student',{})).status,410))
 }
 if(process.argv[2]==='paid'){
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
  // Only fixture class schedules are set relative to wall clock; no clock mocking.
  for(const course of f.courses){
   const start=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(Date.now()+(course.label==='b'?12:8)*60000))
   const old=await admin.from('course_season_courses').select('course_data').eq('id',course.id).eq('season_id',f.seasonId).single();if(old.error)throw old.error
   const updated=await admin.from('course_season_courses').update({start_time:start,course_data:{...old.data.course_data,classTime:`${start}－23:59`}}).eq('id',course.id).eq('season_id',f.seasonId);if(updated.error)throw updated.error
  }
  const a=f.courses.find(c=>c.label==='a'),b=f.courses.find(c=>c.label==='b'),c=f.courses.find(c=>c.label==='c')
  const la=f.leads.find(l=>l.label==='a'),lc=f.leads.find(l=>l.label==='c')
  const ok=async(role,p,body)=>{const r=await call(role,p,body);assert.equal(r.status,200,JSON.stringify(r));return r.data}
  await check('入帳後兩班正式資格出現',async()=>assert.equal((await ok('student',path)).enrollments.length,2))
  await check('原班教練正式綁定學員',async()=>assert.equal((await ok('coach-a','/api/coach/students')).students.length,1))
  await check('其他班教練不取得正式綁定',async()=>assert.equal((await ok('coach-b','/api/coach/students')).students.length,0))
  await check('教練僅取得自己負責課程',async()=>{
   const aa=await ok('coach-a','/api/coach/attendance'),bb=await ok('coach-b','/api/coach/attendance')
   assert.deepEqual(new Set(aa.courses.map(x=>x.courseSeasonCourseId)),new Set([a.id,c.id]))
   assert.deepEqual(bb.courses.map(x=>x.courseSeasonCourseId),[b.id])
  })
  await check('跨班直接點名被拒絕',async()=>assert.equal((await call('coach-b','/api/coach/attendance',{courseSeasonCourseId:a.id,sessionDate:f.date,records:[{enrollmentId:la.id,status:'present'}]})).status,400))
  await check('正式學員自行簽到',async()=>await ok('student',path,{intent:'check_in',enrollmentId:la.id,courseSeasonCourseId:a.id,sessionDate:f.date}))
  await check('教練可見學生簽到但尚無點名',async()=>{const r=await ok('coach-a','/api/coach/attendance');assert.ok(r.checkins.some(x=>x.enrollment_id===la.id));assert.ok(!r.attendance.some(x=>x.enrollment_id===la.id))})
  await check('原班教練完成独立點名',async()=>await ok('coach-a','/api/coach/attendance',{courseSeasonCourseId:a.id,sessionDate:f.date,records:[{enrollmentId:la.id,status:'present',note:f.marker}]}))
  await check('學員另一本班請假',async()=>await ok('student',path,{intent:'request_leave',enrollmentId:lc.id,sessionDate:f.date}))
  const afterLeave=await ok('student',path);const request=afterLeave.makeups.find(x=>x.enrollment_id===lc.id);assert.ok(request)
  await check('請假後安排其他班補課',async()=>await ok('student',path,{intent:'schedule_makeup',enrollmentId:lc.id,requestId:request.id,targetCourseSeasonCourseId:b.id,targetSessionDate:f.date}))
  await check('接收教練看到補課學員與原班資訊',async()=>{const r=await ok('coach-b','/api/coach/attendance');assert.ok(r.enrollments.some(x=>x.id===lc.id));assert.ok(r.makeups.some(x=>x.enrollment_id===lc.id&&x.original_course_season_course_id===c.id))})
  await check('接收教練單方點名不算完成補課',async()=>{await ok('coach-b','/api/coach/attendance',{courseSeasonCourseId:b.id,sessionDate:f.date,records:[{enrollmentId:lc.id,status:'present',note:f.marker}]});assert.equal((await ok('student',path)).makeups.find(x=>x.id===request.id).status,'scheduled')})
  await check('學員補課簽到後雙方確認完成',async()=>{await ok('student',path,{intent:'check_in',enrollmentId:lc.id,courseSeasonCourseId:b.id,sessionDate:f.date});assert.equal((await ok('student',path)).makeups.find(x=>x.id===request.id).status,'completed')})
  await check('原班教練也可見補課完成且保留原班請假',async()=>{const r=await ok('coach-a','/api/coach/attendance');assert.equal(r.makeups.find(x=>x.id===request.id).status,'completed');assert.ok(r.attendance.some(x=>x.enrollment_id===lc.id&&x.status==='excused'))})
  await check('補課不擴大接收教練正式綁定',async()=>assert.equal((await ok('coach-b','/api/coach/students')).students.length,0))
 }
 if(process.argv[2]==='makeup'){
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
  const b=f.courses.find(c=>c.label==='b'),c=f.courses.find(c=>c.label==='c'),lc=f.leads.find(l=>l.label==='c')
  const fmt=(date,options)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',...options}).format(date)
  const target=new Date(Date.now()+4*60000);const targetDate=fmt(target,{year:'numeric',month:'2-digit',day:'2-digit'})
  for(const [course,instant] of [[b,target],[c,new Date(Date.now()-60000)]]){
   const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}).format(instant)
   const row=await admin.from('course_season_courses').select('course_data,billing_config').eq('id',course.id).eq('season_id',f.seasonId).single();if(row.error)throw row.error
   const r=await admin.from('course_season_courses').update({start_time:time,course_data:{...row.data.course_data,classTime:time},billing_config:{...row.data.billing_config,sessionDates:[course===b?targetDate:f.date]}}).eq('id',course.id).eq('season_id',f.seasonId);if(r.error)throw r.error
  }
  const end=await admin.from('course_seasons').update({ends_on:targetDate}).eq('id',f.seasonId);if(end.error)throw end.error
  const ok=async(role,p,body)=>{const r=await call(role,p,body);assert.equal(r.status,200,JSON.stringify(r));return r.data}
  const request=(await ok('student',path)).makeups.find(x=>x.enrollment_id===lc.id);assert.ok(request)
  await check('請假後安排其他班補課',async()=>await ok('student',path,{intent:'schedule_makeup',enrollmentId:lc.id,requestId:request.id,targetCourseSeasonCourseId:b.id,targetSessionDate:targetDate}))
  await check('接收教練看到補課學員與原班資訊',async()=>{const r=await ok('coach-b','/api/coach/attendance');assert.ok(r.enrollments.some(x=>x.id===lc.id));assert.ok(r.makeups.some(x=>x.enrollment_id===lc.id&&x.original_course_season_course_id===c.id))})
  await check('接收教練單方點名不算完成補課',async()=>{await ok('coach-b','/api/coach/attendance',{courseSeasonCourseId:b.id,sessionDate:targetDate,records:[{enrollmentId:lc.id,status:'present',note:f.marker}]});assert.equal((await ok('student',path)).makeups.find(x=>x.id===request.id).status,'scheduled')})
  await check('學員補課簽到後雙方確認完成',async()=>{await ok('student',path,{intent:'check_in',enrollmentId:lc.id,courseSeasonCourseId:b.id,sessionDate:targetDate});assert.equal((await ok('student',path)).makeups.find(x=>x.id===request.id).status,'completed')})
  await check('原班教練可見補課完成且保留請假',async()=>{const r=await ok('coach-a','/api/coach/attendance');assert.equal(r.makeups.find(x=>x.id===request.id).status,'completed');assert.ok(r.attendance.some(x=>x.enrollment_id===lc.id&&x.status==='excused'))})
  await check('補課不擴大接收教練正式綁定',async()=>assert.equal((await ok('coach-b','/api/coach/students')).students.length,0))
 }
 if(process.argv[2]==='deployed'){
  const a=f.courses.find(c=>c.label==='a'),b=f.courses.find(c=>c.label==='b'),c=f.courses.find(c=>c.label==='c')
  const ok=async(role,p)=>{const r=await call(role,p);assert.equal(r.status,200,JSON.stringify(r));return r.data}
  await check('正式網址普通身份不能讀管理員資料',async()=>{for(const role of ['student','coach-a','coach-b'])assert.equal((await call(role,'/api/admin')).status,403)})
  await check('正式網址保留兩筆入帳資格與兩筆自主簽到',async()=>{const r=await ok('student',path);assert.equal(r.enrollments.length,2);assert.equal(r.checkins.length,2);assert.equal(r.makeups[0].status,'completed')})
  await check('正式網址原教練只見本班並可見補課完成',async()=>{const r=await ok('coach-a','/api/coach/attendance');assert.deepEqual(new Set(r.courses.map(x=>x.courseSeasonCourseId)),new Set([a.id,c.id]));assert.equal(r.makeups[0].status,'completed')})
  await check('正式網址接收教練只見本班與指定補課學員',async()=>{const r=await ok('coach-b','/api/coach/attendance');assert.deepEqual(r.courses.map(x=>x.courseSeasonCourseId),[b.id]);assert.equal(r.enrollments.length,1);assert.equal(r.checkins.length,1)})
  await check('正式網址新舊綁定規則正確',async()=>{assert.equal((await ok('coach-a','/api/coach/students')).students.length,1);assert.equal((await ok('coach-b','/api/coach/students')).students.length,0);assert.equal((await call('student','/api/student/bind-coach',{})).status,410)})
  await check('公開課程頁不顯示驗收課程',async()=>{const r=await fetch(base+'/courses');assert.equal(r.status,200);assert.ok(!(await r.text()).includes('qa-journey-20260918'))})
 }
 await writeFile(`${dir}/api-${process.argv[2]}-results.json`,JSON.stringify({base,passed:results}),{mode:0o600})
} finally {for(const c of Object.values(clients))await c.auth.signOut()}
