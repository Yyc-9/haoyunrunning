import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite }=await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
const db=new PGlite()
const migration=async name=>readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')
let checks=0
const pass=name=>{checks++;console.log('PASS '+name)}
try {
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users(id uuid primary key);
create table profiles(id uuid primary key,role text);
create table course_seasons(id uuid primary key,code text,is_current boolean,status text);
create table course_season_courses(id uuid primary key,season_id uuid,course_data jsonb,course_slug text);
create table signup_leads(email text,source text,course_season_course_id uuid,status text,registration_status text);
create table shop_products(id text primary key,name text not null,price integer not null,image text default '',
stock_quantity integer check(stock_quantity>=0),active boolean default true,deleted_at timestamptz,
updated_at timestamptz default now(),specifications jsonb default '[]',sizes jsonb default '[]',variants jsonb default '[]');
create table shop_orders(id uuid primary key default gen_random_uuid(),order_number text unique,user_id uuid,
customer_name text,contact text,email text,fulfillment_note text,item_count integer,status text,
payment_method text check(payment_method in ('bank_transfer','manual_review','card')),payment_reference text,payment_account_id uuid,
payment_account_label text,inventory_reserved boolean,subtotal integer,total_amount integer,stripe_session_id text,
reviewed_at timestamptz,review_note text,transfer_last_five text,payment_submitted_at timestamptz,updated_at timestamptz default now());
create table shop_order_items(id uuid primary key default gen_random_uuid(),order_id uuid references shop_orders(id) on delete cascade,
product_id text,name text,quantity integer,price integer,image text,variant_id text,size text);
create function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end; $$;
create trigger stamp before update on shop_orders for each row execute function set_updated_at();
`)
for(const name of ['20260905001751_shop_selectable_specifications.sql','20261020085639_shop_preorders.sql','20261027035240_shop_checkout_bank_transfer.sql','20261029140003_shop_class_pickup.sql']) await db.exec(await migration(name))
const ids=Array.from({length:7},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'))
const [season,c1,c2,old,admin,student]=ids
await db.query("insert into auth.users values ($1),($2)",[admin,student])
await db.query("insert into profiles values ($1,'admin'),($2,'student')",[admin,student])
await db.query("insert into course_seasons values ($1,'2026-Q4',true,'active'),($2,'2026-Q3',false,'archived')",[season,old])
await db.query("insert into course_season_courses values ($1,$3,'{\"name\":\"週二班\"}','tue'),($2,$3,'{\"name\":\"週四班\"}','thu'),($4,$4,'{\"name\":\"舊班\"}','old')",[c1,c2,season,old])
await db.query("insert into signup_leads values ('one@example.test','course_payment',$1,'pending_transfer','active'),('one@example.test','course_payment',$1,'rejected','active'),('one@example.test','course_payment',$2,'approved','cancelled'),('one@example.test','course_payment',$3,'approved','active'),('multi@example.test','course_payment',$1,'pending_review','active'),('multi@example.test','course_payment',$2,'approved','active')",[c1,c2,old])
const candidates=async email=>(await db.query("select * from shop_pickup_candidates($1)",[email])).rows
assert.deepEqual((await candidates(' ONE@example.test ')).map(x=>x.id),[c1]);pass('single class deduplicated; unpaid and rejected-active eligible; cancellation and historical class excluded')
assert.equal((await candidates('multi@example.test')).length,2)
assert.equal((await candidates('unknown@example.test')).length,0);pass('multiple and unmatched membership cases')
await db.exec("insert into shop_products(id,name,price,stock_quantity) values ('test','測試商品',89000,20)")
let seq=0
const order=async(email,selected=null,requireSelection=false,lastFive='12345')=>(await db.query("select create_shop_order_with_pickup($1,null,'測試','test-only',$2,'自取',$3,$2,$4,$5,$6) as result",['TEST-'+(++seq),email,JSON.stringify([{productId:'test',quantity:2}]),selected,lastFive,requireSelection])).rows[0].result
const snapshot=async()=>(await db.query("select (select count(*) from shop_orders)::int as orders,(select stock_quantity from shop_products where id='test') as stock")).rows[0]
const first=await order('one@example.test')
const row=async id=>(await db.query("select * from shop_orders where id=$1",[id])).rows[0]
assert.equal((await row(first.id)).pickup_course_id,c1);assert.equal((await row(first.id)).status,'pending_review');assert.equal((await row(first.id)).transfer_last_five,'12345');pass('single class and transfer proof saved with order')
let before=await snapshot()
await assert.rejects(order('multi@example.test',null,true),/請選擇取貨班級/)
assert.deepEqual(await snapshot(),before);pass('multiple classes require choice before inventory or order changes')
const multi=await order('multi@example.test',c2,true)
assert.equal((await row(multi.id)).pickup_course_id,c2)
assert.equal((await row(await order('unknown@example.test').then(o=>o.id))).pickup_course_id,null)
assert.equal((await row(await order('multi@example.test').then(o=>o.id))).pickup_course_id,null);pass('selection persisted; anonymous multi and unknown remain unassigned')
before=await snapshot()
await assert.rejects(order('one@example.test',c2,true),/取貨班級已變更/)
await assert.rejects(order('one@example.test',null,false,'invalid'),/匯款後五碼無效/)
assert.deepEqual(await snapshot(),before);pass('forged class and invalid payment proof reject atomically')
const save=async(actor,id,course,status,stamp)=>(await db.query("select admin_set_shop_pickup($1,$2,$3,$4,$5)",[actor,id,course,status,stamp])).rows
let current=await row(first.id)
await assert.rejects(save(student,first.id,c2,'pending',current.updated_at),/admin_required/)
await assert.rejects(save(admin,first.id,null,'packed',current.updated_at),/pickup_requires_class/)
await save(admin,first.id,c2,'pending',current.updated_at)
await assert.rejects(save(admin,first.id,c1,'pending',current.updated_at),/order_changed/);pass('admin only, assigned class required and optimistic concurrency')
await db.query("update shop_orders set status='approved' where id=$1",[first.id])
current=await row(first.id);await save(admin,first.id,c2,'packed',current.updated_at)
current=await row(first.id);await save(admin,first.id,c2,'collected',current.updated_at)
assert.equal((await row(first.id)).status,'approved');assert.equal((await row(first.id)).pickup_status,'collected')
assert.equal((await db.query("select count(*)::int as n from shop_pickup_audit")).rows[0].n,3);pass('packing and collection do not alter payment; changes audited')
await db.query("update course_season_courses set course_data='{\"name\":\"改名\"}' where id=$1",[c2])
assert.ok((await row(first.id)).pickup_class_name.includes('週四班'));pass('existing order class snapshot survives class rename')
const permissions=(await db.query("select has_function_privilege('anon','shop_pickup_candidates(text)','execute') as anon,has_function_privilege('authenticated','shop_pickup_candidates(text)','execute') as member,has_function_privilege('service_role','shop_pickup_candidates(text)','execute') as server")).rows[0]
assert.deepEqual(permissions,{anon:false,member:false,server:true});pass('email membership lookup restricted to server')
const invoiceMigration=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(n=>n.endsWith('_shop_invoice_snapshot.sql'))
assert.ok(invoiceMigration);await db.exec(await migration(invoiceMigration))
const invoiceOrder=async invoice=>(await db.query("select create_shop_order_with_invoice($1,null,'測試','test-only','one@example.test','自取',$2,'one@example.test',null,'12345',true,$3) as result",['TEST-'+(++seq),JSON.stringify([{productId:'test',quantity:1}]),JSON.stringify(invoice)])).rows[0].result
before=await snapshot()
for(const invoice of [{},{invoiceDelivery:'carrier',invoiceDetail:'/ABC123'},{invoiceDelivery:'email',invoiceDetail:'bad'}]) await assert.rejects(invoiceOrder(invoice),/請確認發票/)
assert.deepEqual(await snapshot(),before);pass('invalid invoices cannot create orders or deduct inventory')
const invoiceResult=await invoiceOrder({invoiceDelivery:'carrier',invoiceDetail:'/AB+12.3',taxInvoiceInfo:'12345678 測試公司'})
const invoiced=await row(invoiceResult.id)
assert.equal(invoiced.invoice_detail,'/AB+12.3');assert.equal(invoiced.tax_invoice_info,'12345678 測試公司');assert.equal(invoiced.pickup_course_id,c1);assert.equal(invoiced.transfer_last_five,'12345');assert.equal(invoiced.total_amount,89000)
assert.equal((await row(first.id)).invoice_delivery,null);pass('invoice snapshot, class, transfer and inventory are saved together; old orders stay unfilled')
before=await snapshot()
await db.exec("create function fail_invoice() returns trigger language plpgsql as $$begin if new.invoice_delivery is not null then raise exception 'test_invoice_failure';end if;return new;end;$$;create trigger fail_invoice before update on shop_orders for each row execute function fail_invoice();")
await assert.rejects(invoiceOrder({invoiceDelivery:'email',invoiceDetail:'buyer@example.test'}),/test_invoice_failure/)
assert.deepEqual(await snapshot(),before);pass('invoice-write failure rolls back the complete order and inventory')
console.log(checks+' SQL regression groups passed; isolated database only.')
} finally {await db.close()}

