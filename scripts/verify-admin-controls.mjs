import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'

const base = process.env.ADMIN_QA_BASE || 'http://localhost:3100'
if (!['http://localhost:3100', 'https://nurturerunningteam.com'].includes(base)) throw Error('Unexpected origin')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const db = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const must = async (query) => { const result = await query; if (result.error) throw result.error; return result.data }
const marker = `admin-controls-${randomUUID()}`
const seasonId = randomUUID(), courseId = randomUUID()
const accounts = [], clients = {}, passed = []
let productId
const dir = '/tmp/haoyun-admin-controls-20260920'
await mkdir(dir, { recursive: true, mode: 0o700 })
const api = async (role, path, body) => {
  const response = await fetch(base + path, { method: body ? 'PATCH' : 'GET', headers: { authorization: `Bearer ${clients[role]?.session.access_token || ''}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return { status: response.status, data: await response.json() }
}
const check = async (name, fn) => { if (process.argv.includes('--browser-only') && !/^(desktop|saving|mobile)/.test(name)) return; await fn(); passed.push(name); console.log('PASS', name) }
try {
  for (const role of ['admin', 'student']) {
    const email = `${marker}-${role}@example.com`, password = randomBytes(24).toString('base64url')
    const result = await db.auth.admin.createUser({ email, password, email_confirm: true }); if (result.error) throw result.error
    accounts.push(result.data.user.id)
    await must(db.from('profiles').upsert({ id: result.data.user.id, email, name: `驗收-${role}`, role }))
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const login = await client.auth.signInWithPassword({ email, password }); if (login.error) throw login.error
    clients[role] = { client, session: login.data.session }
  }
  await must(db.from('course_seasons').insert({ id: seasonId, code: '1999-Q3', name: marker, status: 'draft', is_current: false, starts_on: '2026-09-20', ends_on: '2026-12-31' }))
  await must(db.from('course_season_courses').insert({ id: courseId, season_id: seasonId, course_slug: marker, capacity: 2, course_data: { name: marker, templateSlug: 'zhubei-night-run-monday', active: false }, billing_config: { scheduleReady: false, sessionDates: [] } }))
  const billing = { scheduleReady: true, sessionDates: ['2026-10-05', '2026-10-12', '2026-10-19'], returningFullPrice: 0, newFullPrice: 0, returningLateRate: 0, referredLateRate: 0, standardLateRate: 0, regularUntilSessionNumber: 1, regularCutoffConfigured: true, priceLockHours: 48 }
  const course = { action: 'save_season_course', seasonId, courseSlug: marker, capacity: 3, value: { name: '驗收隔離新名稱', weekday: '週一', startTime: '19:30', classTime: '19:30', templateSlug: 'zhubei-night-run-monday', active: false, enrollmentNote: '', coachKeys: ['peter'] }, billingConfig: billing }
  await check('student and anonymous cannot modify administrator controls', async () => {
    assert.equal((await api('none', '/api/admin', course)).status, 401)
    assert.equal((await api('student', '/api/admin', course)).status, 403)
    assert.equal((await api('student', '/api/admin/payment-info')).status, 403)
    assert.equal((await api('student', '/api/admin/payment-info', {})).status, 403)
  })
  await check('course controls persist name, empty note, zero prices, capacity and billing rule', async () => {
    const result = await api('admin', '/api/admin', course)
    assert.equal(result.status, 200, JSON.stringify(result.data))
    const saved = await must(db.from('course_season_courses').select('course_data,capacity,billing_config').eq('id', courseId).single())
    assert.equal(saved.course_data.name, course.value.name); assert.equal(saved.course_data.enrollmentNote, '')
    assert.equal(saved.capacity, 3); assert.equal(saved.billing_config.newFullPrice, 0)
    assert.equal(saved.billing_config.regularUntilSessionNumber, 1); assert.equal(saved.billing_config.priceLockHours, 48)
  })
  await check('invalid dates and prices are rejected without changing saved configuration', async () => {
    for (const invalid of [{ ...billing, sessionDates: ['2026-02-30'] }, { ...billing, newFullPrice: -1 }]) assert.equal((await api('admin', '/api/admin', { ...course, billingConfig: invalid })).status, 400)
    assert.deepEqual((await must(db.from('course_season_courses').select('billing_config').eq('id', courseId).single())).billing_config, billing)
  })
  await check('dashboard reads saved course while public catalog excludes draft quarter', async () => {
    const dashboard = await api('admin', '/api/admin'); assert.equal(dashboard.status, 200)
    assert.equal(dashboard.data.courseSeasons.find((season) => season.id === seasonId).courseOverrides[marker].name, course.value.name)
    const publicContent = await (await fetch(base + '/api/site-content')).json()
    assert.ok(!JSON.stringify(publicContent).includes(marker))
  })
  await check('official payment preview and shop read the same unchanged account', async () => {
    const preview = await api('admin', '/api/admin/payment-info'); assert.equal(preview.status, 200, JSON.stringify(preview.data))
    const shop = await (await fetch(base + '/api/shop/payment-info?format=json')).json()
    assert.deepEqual(shop, preview.data.info)
    assert.equal((await api('admin', '/api/admin/payment-info', { info: { ...preview.data.config, bankCode: 'invalid' }, version: preview.data.version, confirmed: true })).status, 400)
  })
  await check('hidden product edits persist and remain absent from public catalog', async () => {
    const product = { action: 'create_product', name: marker, category: '驗收', image: '/images/logo.png', price: 0, stockQuantity: 0, active: false, summary: '隔離驗收', sizes: 'S,M', specifications: [{ label: '材質', value: '驗收材質' }] }
    const created = await api('admin', '/api/admin', product); assert.equal(created.status, 200, JSON.stringify(created.data)); productId = created.data.product.id
    const updated = await api('admin', '/api/admin', { ...product, action: 'update_product', productId, summary: '已修改介紹', sizes: 'L', specifications: [{ label: '材質', value: '更新材質' }] }); assert.equal(updated.status, 200, JSON.stringify(updated.data))
    const row = await must(db.from('shop_products').select('summary,sizes,specifications').eq('id', productId).single())
    assert.equal(row.summary, '已修改介紹'); assert.deepEqual(row.sizes, ['L']); assert.equal(row.specifications[0].value, '更新材質')
    assert.ok(!JSON.stringify(await (await fetch(base + '/api/shop/products')).json()).includes(productId))
  })
  await check('archived quarter prevents edits and retains saved values', async () => {
    await must(db.from('course_seasons').update({ status: 'archived' }).eq('id', seasonId))
    assert.equal((await api('admin', '/api/admin', { ...course, capacity: 4 })).status, 409)
    assert.equal((await must(db.from('course_season_courses').select('capacity').eq('id', courseId).single())).capacity, 3)
  })
  if (process.argv.includes('--browser')) {
    const cli = '/Users/yangyichen/.codex/skills/playwright/scripts/playwright_cli.sh'
    const run = (...args) => { const output = execFileSync(cli, ['-s=admin-controls', ...args], { encoding: 'utf8', timeout: 60000 }); if (output.includes('### Error')) throw Error(output); return output }
    const storage = `${dir}/browser-state.json`
    await writeFile(storage, JSON.stringify({ cookies: [], origins: [{ origin: base, localStorage: [{ name: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(clients.admin.session) }] }] }), { mode: 0o600 })
    try {
      run('open', base + '/admin'); run('state-load', storage); run('goto', base + '/admin')
      run('run-code', "async (page) => { await page.setViewportSize({width:1440,height:1000}); await page.getByRole('button', {name:'收款帳戶',exact:true}).waitFor({timeout:30000}); }")
      const snapshot = run('snapshot'); const path = snapshot.match(/\[Snapshot\]\(([^)]+)\)/)?.[1]; const tree = path ? await readFile(path, 'utf8') : snapshot
      const ref = tree.match(/.*button "收款帳戶".*\[ref=([a-z0-9]+)\]/)?.[1]; if (!ref) throw Error('Missing payment settings navigation'); run('click', ref)
      await mkdir('output/playwright/admin-controls-20260920', { recursive: true })
      await check('desktop official payment editor displays current preview without overflow', async () => {
        run('run-code', `async (page) => { await page.getByRole('heading',{name:'對外匯款資料',exact:true}).waitFor(); await page.getByRole('region',{name:'對外匯款資料設定',exact:true}).getByLabel('銀行名稱',{exact:true}).waitFor(); if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Horizontal overflow'); await page.screenshot({path:'output/playwright/admin-controls-20260920/payment-desktop.png',fullPage:true,animations:'disabled'}); }`)
      })
      await check('saving another content panel preserves draft and leaving warns before losing edits', async () => {
        run('run-code', `async (page) => {
          await page.route('**/api/admin', async route => {
            if (route.request().method() !== 'PATCH') return route.fallback();
            const body=route.request().postDataJSON();
            if (!['save_site_content','save_site_contents'].includes(body.action)) return route.abort();
            const response=await page.request.get(route.request().url(),{headers:{authorization:route.request().headers().authorization}});
            const data=await response.json();
            const map={brand_content:'brand',home_content:'home',page_media:'pageMedia'};
            for(const entry of body.entries||[body]) data.siteContent[map[entry.section]]=entry.value;
            await route.fulfill({status:200,json:{siteContent:data.siteContent,courses:data.courses,message:'隔離前端驗收：未寫入正式內容'}});
          });
          await page.getByRole('button',{name:'內容中心',exact:true}).click();
        }`)
        run('snapshot')
        run('run-code', `async(page)=>{await page.getByRole('button',{name:'首頁文案 近期報名與課程預覽',exact:true}).click();}`)
        run('snapshot')
        run('run-code', `async(page)=>{await page.getByRole('textbox',{name:'課程預覽標題',exact:true}).fill('驗收未儲存草稿');await page.getByRole('button',{name:/^品牌與聯絡/}).click();}`)
        run('snapshot')
        run('run-code', `async(page)=>{await page.getByRole('textbox',{name:'品牌標語',exact:true}).fill('隔離預覽標語');await page.getByRole('button',{name:'儲存並發布',exact:true}).click();await page.getByRole('status').filter({hasText:'隔離前端驗收：未寫入正式內容'}).waitFor();await page.getByRole('button',{name:'首頁文案 近期報名與課程預覽',exact:true}).click();}`)
        run('snapshot')
        run('run-code', `async(page)=>{
          const field=page.getByRole('textbox',{name:'課程預覽標題',exact:true});
          if(await field.inputValue()!=='驗收未儲存草稿')throw Error('Unsaved draft was lost');
          let warned=false;page.once('dialog',async dialog=>{warned=true;await dialog.dismiss();});
          await page.getByRole('button',{name:'收款帳戶',exact:true}).click();
          if(!warned || await field.count()!==1)throw Error('Missing leave protection');
          await page.getByRole('button',{name:'還原未儲存變更',exact:true}).click();
          await page.unroute('**/api/admin');
          await page.getByRole('button',{name:'收款帳戶',exact:true}).click();
        }`)
      })
      run('run-code', "async (page) => { await page.setViewportSize({width:390,height:844}); }")
      run('snapshot')
      await check('mobile administrator loads payment controls without overflow', async () => {
        run('run-code', `async (page) => { const more=page.getByRole('button',{name:'更多',exact:true}); if(await more.count()) await more.click(); }`)
        run('snapshot')
        run('run-code', `async (page) => { await page.getByRole('button',{name:/收款帳戶/}).click(); await page.getByRole('heading',{name:'對外匯款資料',exact:true}).waitFor(); await page.getByRole('region',{name:'對外匯款資料設定',exact:true}).getByLabel('銀行名稱',{exact:true}).waitFor(); if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Horizontal overflow'); await page.screenshot({path:'output/playwright/admin-controls-20260920/payment-mobile.png',fullPage:true,animations:'disabled'}); await page.getByRole('button',{name:'儲存並發布匯款資料',exact:true}).scrollIntoViewIfNeeded(); const account=page.getByRole('region',{name:'對外匯款資料設定',exact:true}).locator('.payment-info-value').last(); if(await account.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length;})!==1) throw Error('Account number wraps on mobile'); await page.screenshot({path:'output/playwright/admin-controls-20260920/payment-mobile-preview.png',fullPage:true,animations:'disabled'}); }`)
      })
    } finally { try { run('localstorage-clear'); run('close') } finally { await unlink(storage) } }
  }
} finally {
  for (const { client } of Object.values(clients)) await client.auth.signOut()
  if (productId) await must(db.from('shop_products').delete().eq('id', productId))
  await must(db.from('course_seasons').delete().eq('id', seasonId))
  for (const id of accounts) { const result = await db.auth.admin.deleteUser(id); if (result.error) throw result.error }
  await writeFile(`${dir}/result.json`, JSON.stringify({ base, passed, cleaned: true }), { mode: 0o600 })
  console.log('CLEANUP PASS: isolated course, product, accounts and sessions removed')
}
