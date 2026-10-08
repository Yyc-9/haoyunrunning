// Runs real route, authorization, normalization and public-reader code against
// an isolated PGlite database. The query adapter replaces only the HTTP transport.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import vm from 'node:vm'
const require=createRequire(import.meta.url)
const ts=require('typescript')
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite')
const db=new PGlite()
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
create type app_role as enum('student','coach','admin');
create table profiles(id uuid primary key references auth.users(id),email text,name text,phone text,pb text,role app_role);
create table coach_account_allowlist(profile_id uuid,status text);
create table site_content(key text primary key,value jsonb,updated_by uuid references profiles(id),updated_at timestamptz default now());
create table course_seasons(id uuid primary key,code text,name text,status text,is_current boolean,enrollment_starts_on date,enrollment_ends_on date,starts_on date,ends_on date,created_at timestamptz default now(),updated_at timestamptz default now());
create table course_season_courses(id uuid primary key default gen_random_uuid(),season_id uuid references course_seasons(id),course_slug text,course_data jsonb,capacity integer,billing_config jsonb,start_time text,time_zone text,unique(season_id,course_slug));
create table signup_leads(source text,season_id uuid,status text);
create table coach_public_profiles(coach_key text primary key,display_name text,published boolean,profile_initialized boolean);
create table shop_products(id text primary key,name text,category text,price integer,price_label text,image text,video text,rating numeric,reviews integer,tags jsonb,summary text,description text,gallery jsonb,highlights jsonb,specifications jsonb,usage_notes jsonb,external_url text,variants jsonb,sizes jsonb,stock_quantity integer,active boolean,deleted_at timestamptz,sort_order integer default 0);
create table shop_payment_accounts(id uuid primary key default gen_random_uuid(),label text,account_name text,bank_name text,bank_code text,account_number text,weight integer,active boolean);`)
for(const name of ['20260717095958_admin_role_allowlist.sql','20261008120000_admin_access_management.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'))
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444']
for(const [i,role] of ['admin','admin','student','coach'].entries()){
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[ids[i],`person${i}@example.com`])
 await db.query('insert into profiles(id,email,name,role) values($1,$2,$3,$4)',[ids[i],`person${i}@example.com`,`Person ${i}`,role])
}
const quote=name=>{assert.match(name,/^[a-z_][a-z_0-9]*$/);return '"'+name+'"'}
const parameter=value=>value!==null&&typeof value==='object'?JSON.stringify(value):value
const supabaseAdmin={
 rpc:async(name,args)=>{try{const entries=Object.entries(args);const result=await db.query(`select ${quote(name)}(${entries.map(([key],i)=>`${quote(key)}=>$${i+1}`).join(',')}) result`,entries.map(([,value])=>Array.isArray(value)?value:parameter(value)));return {data:result.rows[0].result,error:null}}catch(error){return {data:null,error}}},
 from(table){
  let mode='read',values=null,conflict='',single=false;const filters=[],orders=[]
  const q={select(){return q},eq(key,value){filters.push([key,'=',value]);return q},is(key,value){assert.equal(value,null);filters.push([key,'is null']);return q},in(key,value){filters.push([key,'in',value]);return q},order(key,opts={}){orders.push(quote(key)+(opts.ascending===false?' desc':' asc'));return q},
   update(value){mode='update';values=value;return q},insert(value){mode='insert';values=value;return q},upsert(value,opts){mode='upsert';values=value;conflict=opts.onConflict;return q},single(){single=true;return q},maybeSingle(){single=true;return q},
   then(done,fail){return (async()=>{
    try{
     const parameters=[];const arg=value=>{parameters.push(parameter(value));return '$'+parameters.length}
     const where=()=>filters.length?' where '+filters.map(([key,op,value])=>op==='is null'?quote(key)+' is null':op==='in'?(value.length?`${quote(key)} in (${value.map(arg).join(',')})`:'false'):`${quote(key)}=${arg(value)}`).join(' and '):''
     let sql
     if(mode==='read')sql=`select * from ${quote(table)}`+where()+(orders.length?' order by '+orders.join(','):'')
     else if(mode==='update')sql=`update ${quote(table)} set ${Object.entries(values).map(([key,value])=>quote(key)+'='+arg(value)).join(',')}`+where()+' returning *'
     else {const rows=Array.isArray(values)?values:[values];const keys=Object.keys(rows[0]);sql=`insert into ${quote(table)}(${keys.map(quote).join(',')}) values `+rows.map(row=>'('+keys.map(key=>arg(row[key])).join(',')+')').join(',');if(mode==='upsert')sql+=` on conflict(${conflict.split(',').map(quote).join(',')}) do update set `+keys.filter(key=>!conflict.split(',').includes(key)).map(key=>`${quote(key)}=excluded.${quote(key)}`).join(',');sql+=' returning *'}
     const result=await db.query(sql,parameters);if(single&&result.rows.length>1)throw Error('Expected one row')
     return {data:single?result.rows[0]??null:result.rows,error:null}
    }catch(error){return {data:null,error}}
   })().then(done,fail)},
  };return q
 },
}
const invalidated=[];const modules=new Map()
const transport={supabaseAdmin,getAuthedUser:async header=>{const id=header?.replace(/^Bearer /,'');return (await db.query('select id,email,email_confirmed_at from auth.users where id=$1',[id??null])).rows[0]??null}}
function load(file){
 const path=resolve(process.cwd(),file)
 if(modules.has(path))return modules.get(path)
 const exports={};modules.set(path,exports)
 const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true)
 // Native ESM hoists imports even when a source declaration appears at EOF.
 const hoisted=[...source.statements.filter(ts.isImportDeclaration),...source.statements.filter(statement=>!ts.isImportDeclaration(statement))].map(statement=>statement.getFullText(source)).join('\n')
 vm.runInNewContext(ts.transpileModule(hoisted,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports,URL,Date,Map,Set,console,process:{env:{}},require(name){
   if(name==='server-only')return {}
   if(name==='next/server')return {NextResponse:{json:Response.json}}
   if(name==='next/cache')return {revalidateTag:tag=>invalidated.push(tag)}
   if(name==='react')return {cache:fn=>fn}
   if(name==='@/lib/supabase-server')return transport
   if(name.startsWith('@/'))return load(name.slice(2)+'.ts')
   return require(name)
  },
 },{filename:path})
 return exports
}
const {PATCH}=load('app/api/admin/route.ts')
const {getPublicSiteContent}=load('lib/public-site-content-server.ts')
const {defaultSiteContent}=load('lib/site-content.ts')
const {allCourses}=load('lib/goodluck-data.ts')
const {shopProductFromRow}=load('lib/shop-products.ts')
const season='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',slug=allCourses[0].slug
await db.query("insert into course_seasons(id,code,name,status,is_current) values($1,'2026-Q4','Local quarter','active',true)",[season])
await db.query("insert into course_season_courses(season_id,course_slug,course_data,capacity,billing_config,start_time,time_zone) values($1,$2,'{}',30,'{}','18:00','Asia/Taipei')",[season,slug])
await db.exec("insert into coach_public_profiles values('fixture','Fixture Coach',true,true)")
async function patch(actor,body){const response=await PATCH(new Request('https://local.invalid/api/admin',{method:'PATCH',headers:{authorization:`Bearer ${actor}`},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()}}
const sections={hero_slides:'heroSlides',home_activities:'activities',seasonal_update:'seasonalUpdate',brand_content:'brand',home_content:'home',about_content:'about',courses_page_content:'coursesPage',testimonials_content:'testimonials',team_content:'team',achievements_content:'achievements',anniversary_content:'anniversary',page_media:'pageMedia'}
for(const [index,actor] of ids.slice(0,2).entries()){
 const marker=`Admin ${index+1} edited`
 const entries=Object.entries(sections).map(([section,prop])=>{
  const value=JSON.parse(JSON.stringify(defaultSiteContent[prop]))
  if(section==='hero_slides')return {section,value:[`/fixture-admin-${index}.jpg`]}
  if(section==='home_activities'){value[0].title=marker;return {section,value}}
  if(section==='page_media'){value.shopTitle=marker;return {section,value}}
  const key=Object.keys(value).find(key=>typeof value[key]==='string'&&!/(href|url|image|logo|email|phone|video)/i.test(key));assert.ok(key,section);value[key]=marker
  return {section,value}
 })
 const saved=await patch(actor,{action:'save_site_contents',entries});assert.equal(saved.status,200,JSON.stringify(saved.body))
 const read=await getPublicSiteContent()
 for(const {section} of entries){assert.deepEqual(JSON.parse(JSON.stringify(read.content[sections[section]])),JSON.parse(JSON.stringify(saved.body.siteContent[sections[section]])),section);const row=(await db.query('select updated_by,value from site_content where key=$1',[section])).rows[0];assert.equal(row.updated_by,actor);assert.ok(JSON.stringify(row.value).includes(section==='hero_slides'?`fixture-admin-${index}`:marker),section)}
 assert.ok(invalidated.includes('site-content'));assert.ok(invalidated.includes('home-hero-slides'))
 const course=await patch(actor,{action:'save_season_course',seasonId:season,courseSlug:slug,capacity:40+index,value:{name:marker,active:true,weekday:'週四',period:'10/01-12/31',classTime:'19:00–20:30',startTime:'19:00',location:'New park',meetingPoint:'East gate',coachKeys:['fixture']},billingConfig:{...load('lib/course-pricing.ts').defaultCourseBillingConfig(allCourses[0],'2026-Q4'),scheduleReady:true,sessionDates:['2026-10-08']}})
 assert.equal(course.status,200,JSON.stringify(course.body));const publicCourse=(await getPublicSiteContent()).content.courseOverrides[slug];assert.equal(publicCourse.location,'New park');assert.equal(publicCourse.meetingPoint,'East gate');assert.equal(publicCourse.startTime,'19:00');assert.ok(publicCourse.name.includes(marker.replaceAll(' ','')))
 const productInput={name:marker,category:'Equipment',image:'/fixture.jpg',stockQuantity:20,price:50000,active:true,summary:'Updated description',description:'Details',tags:'running',gallery:['/detail.jpg'],highlights:'Comfortable',specifications:[],usageNotes:'Wash gently',sizes:'S,M',variants:[]}
 const created=await patch(actor,{action:'create_product',...productInput});assert.equal(created.status,200,JSON.stringify(created.body))
 const productId=created.body.product.id
 const updated=await patch(actor,{action:'update_product',...productInput,productId,stockQuantity:9,price:45000,name:marker+' revised'});assert.equal(updated.status,200,JSON.stringify(updated.body))
 const product=shopProductFromRow((await db.query('select * from shop_products where id=$1',[productId])).rows[0]);assert.equal(product.name,marker+' revised');assert.equal(product.stockQuantity,9);assert.equal(product.price,45000)
 const account=await patch(actor,{action:'create_payment_account',label:marker,accountName:'Local fixture',bankName:'Fixture Bank',bankCode:'000',accountNumber:'TEST-ACCOUNT',weight:2});assert.equal(account.status,200,JSON.stringify(account.body))
 assert.equal((await patch(actor,{action:'toggle_payment_account',accountId:account.body.account.id,active:false})).status,200)
 assert.equal((await db.query('select active from shop_payment_accounts where id=$1',[account.body.account.id])).rows[0].active,false)
}
const before=await db.query('select * from site_content order by key')
for(const actor of ids.slice(2))for(const action of ['save_site_content','save_season_course','create_product','create_payment_account'])assert.equal((await patch(actor,{action,section:'home_content',value:{}})).status,403)
assert.equal((await patch(ids[0],{action:'save_site_contents',entries:[{section:'home_content',value:{}},{section:'invalid',value:{}}]})).status,400)
assert.deepEqual((await db.query('select * from site_content order by key')).rows,before.rows)
await db.exec("create function reject_content() returns trigger language plpgsql as $$begin raise exception 'fixture_write_failure';end$$;create trigger reject_content before insert or update on site_content for each row execute function reject_content();")
const failed=await patch(ids[0],{action:'save_site_content',section:'home_content',value:{}});assert.equal(failed.status,500)
assert.deepEqual((await db.query('select * from site_content order by key')).rows,before.rows)
console.log('PASS: two independently resolved admins persist 12 content sections, website readers return saved values, course location/time/name persist, product creation/edit and account enablement persist, non-admins denied, invalid batches and failed writes preserve previous content.')
await db.close()
