import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
const db = new PGlite()
let checks = 0
const pass = message => { checks++; console.log('PASS ' + message) }
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table profiles(id uuid primary key,role text);
    create table shop_orders(id uuid primary key,status text,payment_method text,inventory_reserved boolean,total_amount integer,
      review_note text,reviewed_at timestamptz,updated_at timestamptz default clock_timestamp(),pickup_status text default 'packed',transfer_last_five text default '00123');
    create table shop_products(id text primary key,stock_quantity integer); insert into shop_products values('fixture',10);
    create function set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end;$$;
    create trigger stamp before update on shop_orders for each row execute function set_updated_at();`)
  const names = (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(n => n.endsWith('_finance_shop_review.sql'))
  assert.equal(names.length, 1)
  await db.exec(await readFile(new URL('../supabase/migrations/' + names[0], import.meta.url), 'utf8'))
  const ids = Array.from({length:5},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'))
  const [admin,finance,student,unverified,order] = ids
  await db.query("insert into auth.users values($1,'owner@example.test',now()),($2,'yuanma0525@gmail.com',now()),($3,'student@example.test',now()),($4,'yuanma0525@gmail.com',null)", [admin,finance,student,unverified])
  await db.query("insert into profiles values($1,'admin'),($2,'student'),($3,'student'),($4,'student')",[admin,finance,student,unverified])
  const reset = async (method='bank_transfer',reserved=true,status='pending_review') => db.query("insert into shop_orders(id,status,payment_method,inventory_reserved,total_amount) values($1,$2,$3,$4,178000) on conflict(id) do update set status=$2,payment_method=$3,inventory_reserved=$4",[order,status,method,reserved])
  const row = async () => (await db.query('select * from shop_orders where id=$1',[order])).rows[0]
  const auditCount = async () => (await db.query('select count(*)::int as n from finance_shop_review_audit')).rows[0].n
  const review = async (actor,status='approved',reason='已核對銀行款項',receipt=true,stamp) => db.query('select finance_review_shop_order($1,$2,$3,$4,$5,$6)',[actor,order,status,reason,receipt,stamp === undefined ? (await row()).updated_at : stamp])
  await reset()
  for (const actor of [student,unverified]) await assert.rejects(review(actor),/finance_required/)
  assert.equal(await auditCount(),0);pass('ordinary and unverified accounts denied')
  for (const args of [[finance,'approved','',true],[finance,'approved','valid',false],[finance,'invalid','valid',true]]) await assert.rejects(review(...args),/reason_required|receipt_required|invalid_status/)
  assert.equal((await row()).status,'pending_review');pass('reason, acknowledgement and status validation leave order untouched')
  const before = await row(); await review(finance)
  let after = await row(); assert.equal(after.status,'approved');assert.equal(after.total_amount,178000);assert.equal(after.pickup_status,'packed');assert.equal(after.inventory_reserved,true);assert.equal(after.transfer_last_five,'00123');assert.equal(await auditCount(),1)
  assert.equal((await db.query('select stock_quantity from shop_products')).rows[0].stock_quantity,10);pass('finance can approve; money, stock, pickup and transfer proof remain unchanged')
  await assert.rejects(review(finance,'rejected','again',false,before.updated_at),/order_changed/)
  await assert.rejects(review(admin,'rejected'),/already_approved/);assert.equal(await auditCount(),1);pass('stale requests and repeat review of paid order rejected')
  await reset();await review(admin,'rejected','請核對後五碼',false);after=await row();assert.equal(after.status,'rejected');assert.equal(after.inventory_reserved,true);pass('administrator can flag missing data without releasing inventory')
  await review(finance);assert.equal((await row()).status,'approved');pass('resubmitted or clarified order can be approved')
  await reset('card');await assert.rejects(review(finance),/not_bank_transfer/);pass('card orders excluded')
  await reset('bank_transfer',false);await assert.rejects(review(finance),/inventory_review_required/);pass('unreserved inventory cannot be manually approved')
  await reset();const count=await auditCount()
  await db.exec("create function fail_audit() returns trigger language plpgsql as $$begin raise exception 'test_audit_failure';end;$$; create trigger fail before insert on finance_shop_review_audit for each row execute function fail_audit();")
  await assert.rejects(review(finance),/test_audit_failure/);assert.equal((await row()).status,'pending_review');assert.equal(await auditCount(),count);pass('audit failure rolls back payment update atomically')
  const privilege=(await db.query("select has_function_privilege('anon','finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz)','execute') as anon,has_function_privilege('authenticated','finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz)','execute') as member,has_function_privilege('service_role','finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz)','execute') as server,has_table_privilege('authenticated','finance_shop_review_audit','select') as audit_read")).rows[0]
  assert.deepEqual(privilege,{anon:false,member:false,server:true,audit_read:false});pass('RPC and audit access restricted to server')
  console.log(checks+' SQL regression groups passed; isolated database only.')
} finally { await db.close() }
