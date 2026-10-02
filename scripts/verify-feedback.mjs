import assert from 'node:assert/strict'
import { randomUUID, createHash, createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
if (process.env.FEEDBACK_LIVE_CHECK !== '1') throw new Error('Set FEEDBACK_LIVE_CHECK=1 for isolated temporary-account verification.')
const origin=process.env.FEEDBACK_TEST_ORIGIN || 'http://127.0.0.1:3034'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const pub=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
assert(url && key && pub,'Supabase environment missing')
const service=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const anon=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}})
const marker='FEEDBACK-QA-'+randomUUID()
const feedbackIds=[], userIds=[], storagePaths=[], testAdminEmails=[]
const report=[]
let browser
const quotaKey=createHash('sha256').update(marker).digest('hex')
const networkKey=createHmac('sha256',key).update('site-feedback:unknown').digest('hex')
const check=(name,condition)=>{assert(condition,name);report.push(name);console.log('PASS '+name)}
async function account(role) {
  const email=role+'-'+randomUUID()+'@example.com',password=randomUUID()+'Ab9!'
  if(role==='admin') {
    testAdminEmails.push(email)
    const allowed=await service.from('admin_role_allowlist').insert({email,active:true,note:marker})
    assert(!allowed.error,allowed.error?.message)
  }
  const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'回報功能驗證（暫時帳號）'}})
  assert(!created.error,created.error?.message);const id=created.data.user.id;userIds.push(id)
  const profile=await service.from('profiles').upsert({id,email,name:'回報功能驗證（暫時帳號）',role}).select('role').single();assert(!profile.error,profile.error?.message)
  assert.equal(profile.data.role,role)
  const client=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}})
  const login=await client.auth.signInWithPassword({email,password});assert(!login.error,login.error?.message)
  return {client,session:login.data.session}
}
async function api(path,token,body) {
  return fetch(origin+path,{method:body?'PATCH':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
}
try {
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2s8AAAAASUVORK5CYII=','base64')
  const id=randomUUID();feedbackIds.push(id)
  function form(image=png,type='image/png') {
    const f=new FormData();f.set('id',id);f.set('category','網站使用問題');f.set('description',marker+' 測試問題回報，驗證後會刪除。');f.set('related','');f.set('source','/');f.set('device','手機');f.append('files',new Blob([image],{type}),'test.png');return f
  }
  let response=await fetch(origin+'/api/feedback',{method:'POST',headers:{Origin:'https://invalid.example'},body:form()})
  check('cross-origin submission blocked',response.status===403)
  response=await fetch(origin+'/api/feedback',{method:'POST',headers:{Origin:origin},body:form(Buffer.from('<script>alert(1)</script>'))})
  check('fake image rejected',response.status===400)
  response=await fetch(origin+'/api/feedback',{method:'POST',headers:{Origin:origin},body:form()})
  check('anonymous submission with image saved',response.status===201)
  response=await fetch(origin+'/api/feedback',{method:'POST',headers:{Origin:origin},body:form()})
  check('retry is idempotent',response.status===200)
  const row=await service.from('site_feedback').select('*').eq('id',id).single();assert(!row.error,row.error?.message)
  storagePaths.push(...row.data.attachments.map(f=>f.path))
  const direct=await anon.from('site_feedback').select('*').eq('id',id)
  check('anonymous direct database read blocked',!!direct.error)
  const quota=await anon.rpc('consume_feedback_quota',{p_key:quotaKey})
  check('anonymous quota bypass blocked',!!quota.error)
  check('admin API needs login',(await api('/api/admin/feedback')).status===401)
  const coach=await account('coach')
  check('coach cannot read feedback',(await api('/api/admin/feedback',coach.session.access_token)).status===403)
  check('coach cannot modify feedback',(await api('/api/admin/feedback',coach.session.access_token,{id,intent:'read'})).status===403)
  check('signed-in direct database read blocked',!!(await coach.client.from('site_feedback').select('*').eq('id',id)).error)
  const admin=await account('admin'), token=admin.session.access_token
  response=await api('/api/admin/feedback?q='+encodeURIComponent(marker),token)
  const list=await response.json()
  if(response.status!==200 || list.total!==1) console.log('Admin query diagnostic:',JSON.stringify({status:response.status,error:list.error,total:list.total}))
  check('admin search finds exactly one submitted record',response.status===200&&list.total===1&&list.items[0].id===id)
  response=await api('/api/admin/feedback?id='+id,token)
  const detail=await response.json()
  check('admin receives private signed image link',response.status===200&&!!detail.item.attachments[0].url)
  check('signed image is accessible',(await fetch(detail.item.attachments[0].url)).ok)
  const publicUrl=service.storage.from('site-feedback').getPublicUrl(storagePaths[0]).data.publicUrl
  check('image has no public access',!(await fetch(publicUrl)).ok)
  response=await api('/api/admin/feedback',token,{id,intent:'read'})
  check('mark-read succeeds',response.ok)
  response=await api('/api/admin/feedback',token,{id,status:'處理中',note:'只用於驗證，不寄送郵件',updated_at:detail.item.updated_at})
  check('status and internal note persist',response.ok)
  response=await api('/api/admin/feedback',token,{id,status:'已解決',note:'stale write',updated_at:detail.item.updated_at})
  check('concurrent stale save rejected',response.status===409)
  const quotaResults=await Promise.all(Array.from({length:6},()=>service.rpc('consume_feedback_quota',{p_key:quotaKey})))
  check('rate limit atomic under concurrency',quotaResults.filter(r=>r.data===true).length===5&&quotaResults.filter(r=>r.data===false).length===1)
  // Optional browser verification uses the already installed Playwright and Chrome.
  if (process.env.FEEDBACK_PLAYWRIGHT_PATH) {
    const require=createRequire(import.meta.url)
    const {chromium}=require(process.env.FEEDBACK_PLAYWRIGHT_PATH)
    browser=await chromium.launch({channel:'chrome',headless:true})
    const context=await browser.newContext({viewport:{width:1280,height:800}})
    const page=await context.newPage()
    await page.goto(origin)
    const button=page.getByRole('button',{name:'問題回報',exact:true})
    await button.click()
    await page.getByRole('button',{name:'送出回報',exact:true}).click()
    await page.getByRole('alert').filter({hasText:'請先選擇回報類型'}).waitFor()
    await page.getByText('網站使用問題',{exact:true}).click()
    await page.getByRole('textbox',{name:/發生了什麼事/}).fill(marker+' 手機與電腦表單實際操作驗證。')
    await page.locator('input[type=file]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:png})
    const submitted=page.waitForResponse(r=>r.url().endsWith('/api/feedback')&&r.request().method()==='POST')
    await page.getByRole('button',{name:'送出回報',exact:true}).click()
    const result=await submitted
    check('browser screenshot compression and submission succeed',result.ok())
    await page.getByRole('heading',{name:'已收到，謝謝你的回饋'}).waitFor()
    await page.getByRole('button',{name:'完成',exact:true}).click()
    await mkdir('output/feedback-release',{recursive:true})
    await page.screenshot({path:'output/feedback-release/home-desktop.png'})
    await page.setViewportSize({width:390,height:844})
    await button.click()
    await page.screenshot({path:'output/feedback-release/form-mobile.png'})
    await page.keyboard.press('Escape')
    await page.evaluate(({session,storageKey})=>localStorage.setItem(storageKey,JSON.stringify(session)),{session:admin.session,storageKey:'sb-'+new URL(url).hostname.split('.')[0]+'-auth-token'})
    await page.goto(origin+'/admin')
    await page.getByRole('button',{name:'查看回報',exact:true}).click()
    await page.getByRole('textbox',{name:'搜尋回報',exact:true}).fill(marker)
    await page.getByRole('button',{name:'查看回報：'+marker+' 手機與電腦表單實際操作驗證。',exact:true}).click()
    await page.getByRole('textbox',{name:'內部備註',exact:true}).fill('手機驗證內部備註')
    await page.getByRole('combobox',{name:'處理狀態',exact:true}).selectOption('已解決')
    await page.getByRole('button',{name:'儲存變更',exact:true}).click()
    await page.getByRole('status').filter({hasText:'已儲存內部處理紀錄'}).waitFor()
    check('mobile admin opens feedback and saves resolution',true)
    await page.screenshot({path:'output/feedback-release/admin-mobile.png',fullPage:true})
    await page.setViewportSize({width:1440,height:1000})
    await page.getByRole('button',{name:'問題回報',exact:false}).filter({has:page.locator('.admin-sidebar-icon')}).click()
    await page.getByRole('textbox',{name:'搜尋回報',exact:true}).fill(marker)
    await page.getByRole('button',{name:'查看回報：'+marker+' 手機與電腦表單實際操作驗證。',exact:true}).click()
    const desktop=page.locator('.admin-desktop-shell')
    await desktop.getByRole('region',{name:'回報詳情',exact:true}).waitFor()
    assert.equal(await desktop.getByRole('textbox',{name:'內部備註',exact:true}).inputValue(),'手機驗證內部備註')
    await page.screenshot({path:'output/feedback-release/admin-desktop.png',fullPage:true,animations:'disabled'})
    check('desktop admin can reopen saved feedback',true)
  }
} catch(error) {
  const page=browser?.contexts()[0]?.pages()[0]
  if(page) {
    await mkdir('output/feedback-release',{recursive:true})
    await page.screenshot({path:'output/feedback-release/failure.png',fullPage:true}).catch(()=>undefined)
  }
  throw error
} finally {
  await browser?.close()
  const records=await service.from('site_feedback').select('id,attachments').like('description',marker+'%')
  for (const row of records.data||[]) {feedbackIds.push(row.id);storagePaths.push(...row.attachments.map(f=>f.path))}
  if(storagePaths.length) {const removed=await service.storage.from('site-feedback').remove([...new Set(storagePaths)]);assert(!removed.error,removed.error?.message)}
  if(feedbackIds.length) {const removed=await service.from('site_feedback').delete().in('id',[...new Set(feedbackIds)]);assert(!removed.error,removed.error?.message)}
  for(const id of userIds) {const removed=await service.auth.admin.deleteUser(id);assert(!removed.error,removed.error?.message)}
  if(testAdminEmails.length) await service.from('admin_role_allowlist').delete().in('email',testAdminEmails)
  await service.from('site_feedback_limits').delete().in('key',[quotaKey,networkKey])
  await mkdir('output/feedback-release',{recursive:true})
  await writeFile('output/feedback-release/verification.json',JSON.stringify({checks:report,cleaned:true},null,2))
  console.log('Temporary users, feedback and private images removed.')
}
