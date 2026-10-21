// Isolated PostgreSQL regression: no Supabase URL, keys, or production connection.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
const db = new PGlite()
const migration = await readFile(new URL('../supabase/migrations/20260905001751_shop_selectable_specifications.sql', import.meta.url), 'utf8')
const preorderMigration = await readFile(new URL('../supabase/migrations/20261020085639_shop_preorders.sql', import.meta.url), 'utf8')
const sizeMigration = await readFile(new URL('../supabase/migrations/20261021063037_shop_size_inventory.sql', import.meta.url), 'utf8')
let checks = 0
const check = (message) => { checks += 1; console.log(`PASS ${message}`) }
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table shop_products (
      id text primary key, name text not null, price integer not null, image text not null default '',
      stock_quantity integer not null check (stock_quantity >= 0), active boolean default true,
      deleted_at timestamptz, updated_at timestamptz default now(),
      specifications jsonb default '[]', sizes jsonb default '[]', variants jsonb default '[]'
    );
    create table shop_orders (
      id uuid primary key default gen_random_uuid(), order_number text not null unique, user_id uuid,
      customer_name text, contact text, email text, fulfillment_note text, item_count integer,
      status text, payment_method text, payment_reference text, payment_account_id uuid,
      payment_account_label text, inventory_reserved boolean, subtotal integer, total_amount integer,
      stripe_session_id text, reviewed_at timestamptz, review_note text
    );
    create table shop_order_items (
      id uuid primary key default gen_random_uuid(), order_id uuid references shop_orders(id) on delete cascade,
      product_id text, name text, quantity integer, price integer, image text, variant_id text, size text
    );
  `)
  await db.exec(migration)
  await db.exec(migration)
  await db.exec(preorderMigration)
  await db.exec(preorderMigration)
  await db.exec(sizeMigration)
  await db.exec(sizeMigration)
  check('additive migration can be reapplied')
  const specs = [{ label: '顏色', value: '黑色、白色' }, { label: '包裝', value: '單件\n套裝' }, { label: '尺寸', value: 'M、S' }]
  await db.query('insert into shop_products (id, name, price, stock_quantity, specifications, sizes) values ($1, $2, $3, $4, $5, $6)', ['shirt', '測試上衣', 98000, 10, JSON.stringify(specs), JSON.stringify(['S', 'M'])])
  await db.query('insert into shop_products (id, name, price, stock_quantity) values ($1, $2, $3, $4)', ['plain', '測試毛巾', 35000, 10])
  const black = [{ label: '顏色', value: '黑色' }, { label: '包裝', value: '單件' }]
  const white = [{ label: '包裝', value: '套裝' }, { label: '顏色', value: '白色' }]
  const item = (selectedSpecifications = black, quantity = 1) => ({ productId: 'shirt', size: 'M', quantity, selectedSpecifications, price: 1 })
  let number = 0
  const order = async (items) => (await db.query('select create_shop_order_with_specs($1, null, $2, $3, $4, $5, $6) as result', [`TEST-${++number}`, '測試', 'local-only', '', '', JSON.stringify(items)])).rows[0].result
  const snapshot = async () => ({
    stock: (await db.query('select id, stock_quantity, stock_by_size from shop_products order by id')).rows,
    orders: (await db.query('select count(*)::integer as count from shop_orders')).rows[0].count,
    lines: (await db.query('select count(*)::integer as count from shop_order_items')).rows[0].count,
  })
  const rejectWithoutMutation = async (items, pattern) => {
    const before = await snapshot()
    await assert.rejects(order(items), pattern)
    assert.deepEqual(await snapshot(), before)
  }

  const result = await order([item(black, 2), item(white)])
  assert.equal(result.subtotal, 294000)
  assert.equal(result.itemCount, 3)
  const lines = (await db.query('select price, selected_specifications from shop_order_items where order_id = $1 order by quantity desc', [result.id])).rows
  assert.deepEqual(lines, [{ price: 98000, selected_specifications: black }, { price: 98000, selected_specifications: white }])
  assert.equal((await snapshot()).stock.find((row) => row.id === 'shirt').stock_quantity, 7)
  check('different specifications share authoritative price and total stock; both snapshots persist')

  await rejectWithoutMutation([item([])], /規格已更新或尚未選齊/)
  await rejectWithoutMutation([item([{ label: '顏色', value: '紅色' }, black[1]])], /規格已更新或尚未選齊/)
  await rejectWithoutMutation([item([...black, black[0]])], /只能選擇一項/)
  await rejectWithoutMutation([item({ label: '顏色', value: '黑色' })], /規格格式無效/)
  await rejectWithoutMutation([item([...black, { label: '未知', value: '其他' }])], /規格已更新或尚未選齊/)
  check('missing, invalid, duplicate, malformed and extra choices reject without stock/order changes')

  await rejectWithoutMutation([item(black, 8)], /庫存不足/)
  await rejectWithoutMutation([item(black, 4), item(white, 4)], /庫存不足/)
  await rejectWithoutMutation([{ productId: 'plain', quantity: 1 }, item([])], /規格已更新或尚未選齊/)
  check('shared stock cannot be oversold; a later invalid line rolls back the whole order')

  await rejectWithoutMutation([{ ...item(), size: 'XL' }], /尺碼已更新/)
  await rejectWithoutMutation([{ ...item(), variantId: 'fake' }], /款式已更新/)
  check('stale size and style choices reject')

  await order([{ productId: 'plain', quantity: 1 }])
  assert.deepEqual((await db.query("select selected_specifications from shop_order_items where product_id = 'plain'")).rows[0].selected_specifications, [])
  check('products without specifications remain compatible')

  const groupingCases = [
    { specs: [{ label: '規格', value: 'S/M、L/XL\nS/M' }], sizes: [], variants: [], expected: [{ label: '規格', options: ['S/M', 'L/XL'] }] },
    { specs: [{ label: '材質', value: ' 純棉,混紡 ' }, { label: '材質', value: '混紡、羊毛' }], sizes: [], variants: [], expected: [{ label: '材質', options: ['純棉', '混紡', '羊毛'] }] },
    { specs: [{ label: '款式', value: '黑色、白色' }], sizes: [], variants: [{ name: '白色' }, { name: '黑色' }], expected: [] },
    { specs: [{ label: '__proto__', value: '正常' }], sizes: [], variants: [], expected: [{ label: '__proto__', options: ['正常'] }] },
  ]
  for (const fixture of groupingCases) {
    const actual = (await db.query('select shop_specification_groups($1, $2, $3) as result', [JSON.stringify(fixture.specs), JSON.stringify(fixture.sizes), JSON.stringify(fixture.variants)])).rows[0].result
    assert.deepEqual(actual, fixture.expected)
  }
  check('SQL option grouping matches browser delimiters and legacy de-duplication')

  await db.query('update shop_products set specifications = $1 where id = $2', [JSON.stringify([{ label: '顏色', value: '灰色' }]), 'shirt'])
  await rejectWithoutMutation([item(black)], /規格已更新或尚未選齊/)
  assert.deepEqual((await db.query('select selected_specifications from shop_order_items where order_id = $1 and quantity = 2', [result.id])).rows[0].selected_specifications, black)
  check('catalog changes reject stale carts without rewriting historical order snapshots')

  const permissions = (await db.query("select has_function_privilege('anon', 'create_shop_order_with_specs(text,uuid,text,text,text,text,jsonb)', 'execute') as anon, has_function_privilege('authenticated', 'create_shop_order_with_specs(text,uuid,text,text,text,text,jsonb)', 'execute') as authenticated, has_function_privilege('service_role', 'create_shop_order_with_specs(text,uuid,text,text,text,text,jsonb)', 'execute') as service_role")).rows[0]
  assert.deepEqual(permissions, { anon: false, authenticated: false, service_role: true })
  check('RPC execution restricted to the server role')

  await db.query("insert into shop_products (id, name, price, stock_quantity, is_preorder) values ('preorder', '預購上衣', 10000, 0, true)")
  const stock = async (id) => (await db.query('select stock_quantity from shop_products where id = $1', [id])).rows[0].stock_quantity
  const plainBefore = await stock('plain')
  const mixed = await order([{ productId: 'preorder', quantity: 3 }, { productId: 'plain', quantity: 2 }])
  assert.equal(await stock('preorder'), 0)
  assert.equal(await stock('plain'), plainBefore - 2)
  const preorderLine = (await db.query("select name, is_preorder from shop_order_items where order_id = $1 and product_id = 'preorder'", [mixed.id])).rows[0]
  assert.deepEqual(preorderLine, { name: '預購上衣（預購）', is_preorder: true })
  check('zero-stock preorders succeed; mixed orders only reserve physical stock and retain preorder labels')

  // Changing the current product mode must not change how old orders restore stock.
  await db.exec("update shop_products set is_preorder = not is_preorder where id in ('preorder', 'plain')")
  await db.query('select delete_shop_order_with_inventory($1)', [mixed.id])
  assert.equal(await stock('preorder'), 0)
  assert.equal(await stock('plain'), plainBefore)
  assert.equal((await db.query('select delete_shop_order_with_inventory($1) as result', [mixed.id])).rows[0].result, false)
  await rejectWithoutMutation([{ productId: 'preorder', quantity: 1, isPreorder: true }], /庫存不足/)
  check('deletion restores only reserved stock after product-mode changes; forged preorder flags cannot bypass stock checks')

  await db.exec("update shop_products set is_preorder = not is_preorder where id in ('preorder', 'plain')")
  const expiring = await order([{ productId: 'preorder', quantity: 2 }, { productId: 'plain', quantity: 1 }])
  await db.query("update shop_orders set stripe_session_id = 'test-session' where id = $1", [expiring.id])
  await db.query("select release_shop_order_inventory($1, 'test-session')", [expiring.id])
  await db.query("select release_shop_order_inventory($1, 'test-session')", [expiring.id])
  await db.query('select delete_shop_order_with_inventory($1)', [expiring.id])
  assert.equal(await stock('preorder'), 0)
  assert.equal(await stock('plain'), plainBefore)
  check('expiry is idempotent and deleting an expired order does not double-restore stock')

  await db.exec("update shop_products set active = false where id = 'preorder'")
  await rejectWithoutMutation([{ productId: 'preorder', quantity: 1 }], /庫存不足/)
  await db.exec("update shop_products set active = true, price = 0 where id = 'preorder'")
  await rejectWithoutMutation([{ productId: 'preorder', quantity: 1 }], /尚未設定售價/)
  check('preorders still require an active product and an authoritative positive price')

  await db.exec(`insert into shop_products (id, name, price, stock_quantity, sizes, stock_by_size)
    values ('sized', '尺寸上衣', 10000, 999, '["XS","M","3XL"]', '{"XS":0,"M":3,"3XL":5}')`)
  const sizeStock = async () => (await db.query("select stock_by_size from shop_products where id = 'sized'")).rows[0].stock_by_size
  assert.equal(await stock('sized'), 8)
  const sized = (size, quantity = 1) => ({ productId: 'sized', size, quantity })
  await rejectWithoutMutation([sized('XS')], /庫存不足/)
  await rejectWithoutMutation([sized('M', 2), sized('M', 2)], /庫存不足/)
  const sizeOrder = await order([sized('M', 3), sized('3XL', 2)])
  assert.deepEqual(await sizeStock(), { XS: 0, M: 0, '3XL': 3 })
  assert.equal(await stock('sized'), 3)
  await rejectWithoutMutation([sized('M')], /庫存不足/)
  await db.query('select delete_shop_order_with_inventory($1)', [sizeOrder.id])
  assert.deepEqual(await sizeStock(), { XS: 0, M: 3, '3XL': 5 })
  check('sizes have independent stock; duplicate lines cannot oversell; deletion restores each exact size')

  for (const value of ['[]', '{"XS":0,"M":-1,"3XL":1}', '{"XS":0,"M":0.5,"3XL":1}', '{"XS":0,"M":"1","3XL":1}', '{"XS":0,"M":1000001,"3XL":0}', '{"M":1}']) {
    await assert.rejects(db.query("update shop_products set stock_by_size = $1 where id = 'sized'", [value]), /庫存/)
  }
  check('database validates size maps independently of the browser and recomputes totals')

  await db.exec("update shop_products set is_preorder = true where id = 'sized'")
  const sizePreorder = await order([sized('XS', 20)])
  assert.deepEqual(await sizeStock(), { XS: 0, M: 3, '3XL': 5 })
  await db.exec(`update shop_products set is_preorder = false, stock_by_size = '{"XS":2,"M":3,"3XL":5}' where id = 'sized'`)
  const restocked = await order([sized('XS')])
  await db.query('select delete_shop_order_with_inventory($1)', [sizePreorder.id])
  assert.deepEqual(await sizeStock(), { XS: 1, M: 3, '3XL': 5 })
  check('preorders preserve physical size stock; restocking sells on the same listing and old preorders never restore stock')

  await db.query("update shop_orders set stripe_session_id = 'size-session' where id = $1", [restocked.id])
  await db.query("select release_shop_order_inventory($1, 'size-session')", [restocked.id])
  await db.query("select release_shop_order_inventory($1, 'size-session')", [restocked.id])
  await db.query('select delete_shop_order_with_inventory($1)', [restocked.id])
  assert.deepEqual(await sizeStock(), { XS: 2, M: 3, '3XL': 5 })
  check('size-stock expiry and subsequent deletion restore only once')

  const reservedSize = await order([sized('XS', 2)])
  await assert.rejects(db.exec(`update shop_products set sizes = '["M","3XL"]', stock_by_size = '{"M":3,"3XL":5}' where id = 'sized'`), /未完成訂單/)
  await db.exec("update shop_products set stock_by_size = null where id = 'sized'")
  await db.query('select delete_shop_order_with_inventory($1)', [reservedSize.id])
  assert.equal(await stock('sized'), 10)
  const legacySize = await order([sized('M', 2)])
  await db.exec(`update shop_products set stock_by_size = '{"XS":2,"M":1,"3XL":5}' where id = 'sized'`)
  await db.query('select delete_shop_order_with_inventory($1)', [legacySize.id])
  assert.deepEqual(await sizeStock(), { XS: 2, M: 3, '3XL': 5 })
  check('inventory-mode changes preserve cancellation accounting and reserved sizes cannot be removed')

  const legacyResult = (await db.query(`select create_shop_order_with_stock('LEGACY', null, '測試', 'local', '', '', $1) as result`, [JSON.stringify([{ product_id: 'sized', size: 'XS', quantity: 2 }])])).rows[0].result
  assert.equal((await sizeStock()).XS, 0)
  await assert.rejects(db.query(`select create_shop_order_with_stock('LEGACY2', null, '測試', 'local', '', '', $1)`, [JSON.stringify([{ product_id: 'sized', size: 'XS', quantity: 1 }])]), /庫存不足/)
  await db.query('select delete_shop_order_with_inventory($1)', [legacyResult.id])
  check('legacy checkout RPC cannot bypass size inventory')
  console.log(`${checks} isolated SQL checks passed.`)
} finally {
  await db.close()
}
