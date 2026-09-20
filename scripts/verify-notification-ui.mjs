// Headless checks against an isolated Next build using mocked APIs and synthetic identities.
// Set PLAYWRIGHT_MODULE to a local Playwright module if not installed in this project.
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.NOTIFICATION_QA_BASE || 'http://127.0.0.1:3201'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local isolated preview required')
const output = '/private/tmp/haoyun-notification-ui'
await mkdir(output,{recursive:true})
const exports = {}
const lines=(await readFile(new URL('../lib/site-content.ts',import.meta.url),'utf8')).split('\n')
const source=[...lines.filter(l=>l.startsWith('import ')),...lines.filter(l=>!l.startsWith('import '))].join('\n')
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({GROUP_DESCRIPTION:'合成測試',GROUP_LINE_URL:'#',defaultCoachPublicProfiles:{}})})
const content=exports.defaultSiteContent
const id='1ed770c5-3666-4f30-bae1-1f6e08bcd9d4', nid='2ed770c5-3666-4f30-bae1-1f6e08bcd9d4'
const enrollment={id,name:'測試學員',course_slug:'zhubei-night-run-monday',preferred_course:'竹北週一夜跑班',status:'pending_review',amount_text:'NT$ 3,600',season_id:id,transfer_last_five:'00123',transfer_date:null,student_review_message:null,payment_submitted_at:'2026-09-20T01:00:00Z',created_at:'2026-09-20T01:00:00Z',notes:'原始測試備註',archived:false}
const followups=[]
let writes=0
const browser=await chromium.launch({channel:'chrome',headless:true})
const contexts=[]
async function account(role,width=1440) {
  const ctx=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'})
  contexts.push(ctx)
  const user={id:role==='admin'?nid:id,email:`${role}@example.invalid`,role:'authenticated',aud:'authenticated',email_confirmed_at:'2026-01-01',user_metadata:{name:role==='admin'?'測試管理員':'測試學員'}}
  const expiry=Math.floor(Date.now()/1000)+3600
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,exp:expiry,role:'authenticated'})).toString('base64url')+'.synthetic'
  await ctx.addInitScript(({user,token,expiry})=>localStorage.setItem('sb-notification-qa-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic-only',expires_at:expiry,expires_in:3600,token_type:'bearer',user})),{user,token,expiry})
  let read=false
  await ctx.route('**/*',async route=>{
    const u=new URL(route.request().url()),method=route.request().method()
    const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
    if(u.origin!==base) return route.abort()
    if(u.pathname==='/api/site-content') return reply({content,source:'database'})
    if(u.pathname==='/api/account/me') return reply({profile:{...user,name:user.user_metadata.name,role}})
    if(u.pathname==='/api/course-enrollments/payment-info') {
      assert.equal(route.request().postDataJSON().enrollmentId,id)
      return reply({bankName:'測試銀行',bankCode:'000',accountNumber:'00000000',qrCodeUrl:''})
    }
    if(u.pathname==='/api/notifications') {
      if(method==='PATCH') {read=true;return reply({success:true})}
      const studentNotice=role==='student'
      return reply({staff:!studentNotice,unreadCount:read?0:1,items:[{id:nid,enrollment_id:id,audience:studentNotice?'student':'staff',kind:studentNotice?'supplement_requested':'new_enrollment',title:studentNotice?'你的報名需要補充資料':'有學生完成新報名',message:studentNotice?'請補充實際金額':'新報名已回報匯款，請核對。',created_at:enrollment.created_at,read_at:read?enrollment.created_at:null}]})
    }
    if(u.pathname==='/api/enrollment-followups') {
      if(method==='GET') return reply({staff:role==='admin',enrollments:[{...enrollment}],followups:followups.map(f=>role==='admin'?f:Object.fromEntries(Object.entries(f).filter(([key])=>!['internal_note','email_status','email_error'].includes(key)))),hasMore:false})
      const body=route.request().postDataJSON(); writes++
      if(method==='POST') {
        assert.equal(role,'admin'); assert.ok(body.message.trim())
        Object.assign(enrollment,{status:'rejected',student_review_message:body.message})
        followups.push({id:body.requestId,reason:body.reason,student_message:body.message,internal_note:body.internalNote,student_reply:null,responded_at:null,created_at:enrollment.created_at,email_status:'failed',email_error:'合成測試：郵件失敗'})
        return reply({message:'補件要求與站內通知已保存，請查看下方郵件寄送狀態。'})
      }
      assert.equal(role,'student'); assert.equal(body.enrollmentId,id); assert.equal(body.lastFive,'54321'); assert.equal(body.reply,'實際匯款金額為 3600 元')
      Object.assign(enrollment,{status:'pending_review',transfer_last_five:body.lastFive,transfer_date:body.transferDate})
      Object.assign(followups[0],{responded_at:new Date().toISOString(),student_reply:body.reply})
      return reply({message:'資料已送出，財務會重新核對。'})
    }
    if(u.pathname.startsWith('/api/')) return reply({})
    return route.continue()
  })
  const page=await ctx.newPage()
  const errors=[]; page.on('pageerror',e=>errors.push(e.message))
  return {ctx,page,errors}
}
try {
  const admin=await account('admin')
  await admin.page.goto(base+'/notifications?view=staff')
  await admin.page.getByRole('heading',{name:'報名通知與核對待辦'}).waitFor()
  await admin.page.getByRole('button',{name:'通知，1 則未讀',exact:true}).click()
  await admin.page.getByRole('dialog',{name:'報名通知'}).waitFor()
  await admin.page.getByRole('button',{name:'將目前通知標為已讀'}).click()
  await admin.page.getByRole('button',{name:'通知，0 則未讀',exact:true}).waitFor({state:'attached'})
  await admin.page.keyboard.press('Escape')
  await admin.page.getByRole('link').filter({hasText:'測試學員 · 竹北週一夜跑班'}).click()
  await admin.page.getByRole('button',{name:'帶入常用說明'}).click()
  await admin.page.getByLabel('給學生的說明').fill('請補充實際匯款金額')
  await admin.page.getByLabel('內部備註（選填）').fill('PRIVATE-ONLY-DO-NOT-SEND')
  await admin.page.getByRole('button',{name:'發送通知與郵件',exact:true}).click()
  await admin.page.getByText('已通知學生補充。學生補交後，會重新進入待核對。').waitFor()
  await admin.page.getByRole('button',{name:'重試寄送',exact:true}).waitFor()
  assert.equal(writes,1)
  await admin.page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}))
  await admin.page.screenshot({path:output+'/staff-desktop.png',fullPage:true})
  console.log('PASS staff bell/read/detail/request/mail-failure UI')
  const student=await account('student',375)
  await student.page.goto(base+`/notifications?enrollment=${id}`)
  await student.page.getByRole('heading',{name:'請補充以下資料'}).waitFor()
  assert.ok(!(await student.page.locator('body').innerText()).includes('PRIVATE-ONLY'))
  assert.equal(await student.page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false)
  await student.page.getByRole('button',{name:'通知，1 則未讀',exact:true}).click()
  const modal=student.page.getByRole('dialog',{name:'報名通知'})
  await modal.waitFor(); const box=await modal.boundingBox(); assert.ok(box.x>=0 && box.x+box.width<=375)
  await student.page.screenshot({path:output+'/student-bell-mobile.png',fullPage:true})
  await student.page.getByRole('button',{name:'關閉通知',exact:true}).click()
  await student.page.getByRole('button',{name:'查看收款資訊',exact:true}).click()
  await student.page.getByText('測試銀行',{exact:true}).waitFor()
  await student.page.getByRole('button',{name:'收起收款資訊',exact:true}).click()
  await student.page.getByLabel('匯款帳號後五碼').fill('54321')
  await student.page.getByLabel('匯款日期').fill('2026-09-19')
  await student.page.getByLabel('補充說明',{exact:true}).fill('實際匯款金額為 3600 元')
  await student.page.screenshot({path:output+'/student-form-mobile.png',fullPage:true})
  await student.page.getByRole('button',{name:'送出資料，請財務核對',exact:true}).click()
  await student.page.getByText('資料已送出，等待財務核對。暫時不需要重複提交。').waitFor()
  assert.equal(writes,2)
  await student.page.reload()
  await student.page.getByText('資料已送出，等待財務核對。暫時不需要重複提交。').waitFor()
  assert.equal(await student.page.getByRole('button',{name:'送出資料，請財務核對',exact:true}).count(),0)
  await admin.page.reload()
  await admin.page.getByText('實際匯款金額為 3600 元',{exact:true}).waitFor()
  assert.deepEqual(admin.errors,[]); assert.deepEqual(student.errors,[])
  console.log('PASS mobile private-data exclusion, dialog sizing, supplement, refresh, staff response history; zero page errors')
  console.log('Screenshots:',output)
} finally { for (const ctx of contexts) await ctx.close(); await browser.close() }
