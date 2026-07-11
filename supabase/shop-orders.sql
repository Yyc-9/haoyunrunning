create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  contact text not null,
  email text default '',
  fulfillment_note text default '',
  item_count integer not null default 0,
  status text not null default 'pending_transfer',
  transfer_last_five text default '',
  payment_submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_orders
add column if not exists transfer_last_five text default '';

alter table public.shop_orders
add column if not exists payment_submitted_at timestamptz;

alter table public.shop_orders
add column if not exists reviewed_at timestamptz;

alter table public.shop_orders
add column if not exists review_note text default '';

alter table public.shop_orders
alter column status set default 'pending_transfer';

update public.shop_orders
set status = case
  when status in ('approved') then 'approved'
  when status in ('rejected', 'closed', 'cancelled', 'canceled') then 'rejected'
  when status in ('pending_review', 'paid', 'submitted') then 'pending_review'
  else 'pending_transfer'
end
where status is null
  or status not in ('pending_transfer', 'pending_review', 'approved', 'rejected');

alter table public.shop_orders
drop constraint if exists shop_orders_status_check;

alter table public.shop_orders
add constraint shop_orders_status_check
check (status in ('pending_transfer', 'pending_review', 'approved', 'rejected'));

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  price integer not null default 0,
  image text default '',
  created_at timestamptz not null default now()
);

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

create index if not exists shop_orders_user_created_idx on public.shop_orders (user_id, created_at desc);
create index if not exists shop_order_items_order_idx on public.shop_order_items (order_id);

drop trigger if exists shop_orders_set_updated_at on public.shop_orders;
create trigger shop_orders_set_updated_at
before update on public.shop_orders
for each row execute function public.set_updated_at();

drop policy if exists "shop_orders_select_own_or_admin" on public.shop_orders;
create policy "shop_orders_select_own_or_admin"
on public.shop_orders for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "shop_orders_insert_own" on public.shop_orders;
create policy "shop_orders_insert_own"
on public.shop_orders for insert
with check (user_id = auth.uid() or user_id is null);

drop policy if exists "shop_order_items_select_related" on public.shop_order_items;
create policy "shop_order_items_select_related"
on public.shop_order_items for select
using (
  exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.order_id
      and (
        shop_orders.user_id = auth.uid()
        or exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
  )
);

drop policy if exists "shop_order_items_insert_related" on public.shop_order_items;
create policy "shop_order_items_insert_related"
on public.shop_order_items for insert
with check (
  exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.order_id
      and (shop_orders.user_id = auth.uid() or shop_orders.user_id is null)
  )
);

create table if not exists public.shop_products (
  id text primary key,
  name text not null,
  category text not null default '',
  price integer not null default 0 check (price >= 0),
  price_label text not null default '私訊諮詢',
  image text not null default '',
  video text not null default '',
  rating numeric(3, 2) not null default 5,
  reviews integer not null default 0 check (reviews >= 0),
  tags jsonb not null default '[]'::jsonb,
  summary text not null default '',
  description text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '[]'::jsonb,
  usage_notes jsonb not null default '[]'::jsonb,
  external_url text not null default '',
  variants jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  account_name text not null,
  bank_name text not null,
  bank_code text not null default '',
  account_number text not null,
  active boolean not null default true,
  weight integer not null default 1 check (weight > 0),
  last_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_orders
add column if not exists subtotal integer not null default 0;

alter table public.shop_orders
add column if not exists shipping_fee integer not null default 0;

alter table public.shop_orders
add column if not exists total_amount integer not null default 0;

alter table public.shop_orders
add column if not exists payment_method text not null default 'bank_transfer';

alter table public.shop_orders
add column if not exists payment_reference text not null default '';

alter table public.shop_orders
add column if not exists payment_account_id uuid references public.shop_payment_accounts(id) on delete set null;

alter table public.shop_orders
add column if not exists payment_account_label text not null default '';

alter table public.shop_orders
add column if not exists inventory_reserved boolean not null default true;

alter table public.shop_orders
drop constraint if exists shop_orders_payment_method_check;

alter table public.shop_orders
add constraint shop_orders_payment_method_check
check (payment_method in ('bank_transfer', 'manual_review'));

alter table public.shop_order_items
add column if not exists variant_id text not null default '';

alter table public.shop_order_items
add column if not exists size text not null default '';

alter table public.shop_products
add column if not exists video text not null default '';

alter table public.shop_products
  add column if not exists summary text not null default '',
  add column if not exists description text not null default '',
  add column if not exists gallery jsonb not null default '[]'::jsonb,
  add column if not exists highlights jsonb not null default '[]'::jsonb,
  add column if not exists specifications jsonb not null default '[]'::jsonb,
  add column if not exists usage_notes jsonb not null default '[]'::jsonb,
  add column if not exists external_url text not null default '';

insert into public.shop_products (
  id, name, category, price, price_label, image, video, rating, reviews, tags, variants, sizes, stock_quantity, active
) values
  (
    '1',
    '好運競速跑步背心',
    '跑者服飾',
    0,
    '私訊諮詢',
    '/goodluck-running-vest.jpg',
    '',
    5,
    0,
    '["團隊裝備"]'::jsonb,
    '[{"id":"purple-white","name":"紫電白","image":"/goodluck-running-vest.jpg"},{"id":"black-blue","name":"曜黑藍","image":"/goodluck-running-vest-black.jpg"}]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    20,
    true
  ),
  (
    '2',
    '好運跑步 T 恤',
    '跑者服飾',
    0,
    '私訊諮詢',
    '/goodluck-running-tee.jpg',
    '',
    5,
    0,
    '["團隊裝備"]'::jsonb,
    '[]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    20,
    true
  ),
  (
    '3',
    '好運跑步帽',
    '跑者配件',
    0,
    '私訊諮詢',
    '/products/goodluck-cap/cap-front.jpeg',
    '',
    5,
    0,
    '["日常訓練"]'::jsonb,
    '[]'::jsonb,
    '["S/M","L/XL"]'::jsonb,
    20,
    true
  ),
  (
    '4',
    '好運運動毛巾',
    '跑者配件',
    0,
    '私訊諮詢',
    '/products/goodluck-towel/goodluck-towel.jpeg',
    '',
    5,
    0,
    '["33 × 70 cm","訓練必備"]'::jsonb,
    '[]'::jsonb,
    '["33 × 70 cm"]'::jsonb,
    20,
    true
  ),
  (
    '5',
    'CALBOMB 蜂蜜檸檬能量膠',
    '運動補給',
    0,
    '私訊諮詢',
    '/calbomb-energy-gel.png',
    '',
    5,
    0,
    '["訓練補給","無添加認證"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    30,
    true
  )
on conflict (id) do nothing;

drop trigger if exists shop_products_set_updated_at on public.shop_products;
create trigger shop_products_set_updated_at
before update on public.shop_products
for each row execute function public.set_updated_at();

drop trigger if exists shop_payment_accounts_set_updated_at on public.shop_payment_accounts;
create trigger shop_payment_accounts_set_updated_at
before update on public.shop_payment_accounts
for each row execute function public.set_updated_at();

alter table public.shop_products enable row level security;
alter table public.shop_payment_accounts enable row level security;

drop policy if exists "shop_products_select_active" on public.shop_products;
create policy "shop_products_select_active"
on public.shop_products for select
to anon, authenticated
using (active = true);

drop policy if exists "shop_products_admin_all" on public.shop_products;
create policy "shop_products_admin_all"
on public.shop_products for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "shop_payment_accounts_admin_all" on public.shop_payment_accounts;
create policy "shop_payment_accounts_admin_all"
on public.shop_payment_accounts for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create index if not exists shop_products_active_category_idx
on public.shop_products (active, category);

create index if not exists shop_payment_accounts_active_idx
on public.shop_payment_accounts (active, last_assigned_at);

create index if not exists shop_orders_payment_account_idx
on public.shop_orders (payment_account_id, created_at desc);

grant select on table public.shop_products to anon, authenticated;
grant select, insert, update, delete on table public.shop_products to service_role;
grant select, insert, update, delete on table public.shop_payment_accounts to service_role;
grant select, insert, update, delete on table public.shop_orders to service_role;
grant select, insert, update, delete on table public.shop_order_items to service_role;

create or replace function public.create_shop_order_with_stock(
  p_order_number text,
  p_user_id uuid,
  p_customer_name text,
  p_contact text,
  p_email text,
  p_fulfillment_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_order public.shop_orders%rowtype;
  v_account public.shop_payment_accounts%rowtype;
  v_product public.shop_products%rowtype;
  v_item jsonb;
  v_product_id text;
  v_variant_id text;
  v_size text;
  v_quantity integer;
  v_item_count integer := 0;
  v_subtotal integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception '購物車資料格式無效。';
  end if;

  select *
  into v_account
  from public.shop_payment_accounts
  where active = true
  order by random() * greatest(weight, 1) desc
  limit 1;

  insert into public.shop_orders (
    order_number,
    user_id,
    customer_name,
    contact,
    email,
    fulfillment_note,
    item_count,
    status,
    payment_method,
    payment_reference,
    payment_account_id,
    payment_account_label,
    inventory_reserved
  ) values (
    p_order_number,
    p_user_id,
    p_customer_name,
    p_contact,
    p_email,
    p_fulfillment_note,
    0,
    'pending_transfer',
    'bank_transfer',
    p_order_number,
    v_account.id,
    coalesce(v_account.label, ''),
    true
  )
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) as item(value)
  loop
    v_product_id := nullif(trim(coalesce(v_item->>'productId', v_item->>'product_id', '')), '');
    v_variant_id := nullif(trim(coalesce(v_item->>'variantId', v_item->>'variant_id', '')), '');
    v_size := nullif(trim(coalesce(v_item->>'size', '')), '');

    begin
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      v_quantity := 0;
    end;

    if v_product_id is null or v_quantity <= 0 then
      raise exception '購物車包含無效商品。';
    end if;

    update public.shop_products
    set stock_quantity = stock_quantity - v_quantity,
        updated_at = now()
    where id = v_product_id
      and active = true
      and price > 0
      and stock_quantity >= v_quantity
    returning * into v_product;

    if not found then
      if exists (select 1 from public.shop_products where id = v_product_id and active = true and price <= 0) then
        raise exception '商品尚未設定售價：%', v_product_id;
      end if;
      raise exception '庫存不足：%', v_product_id;
    end if;

    insert into public.shop_order_items (
      order_id,
      product_id,
      name,
      quantity,
      price,
      image,
      variant_id,
      size
    ) values (
      v_order.id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_product.price,
      v_product.image,
      coalesce(v_variant_id, ''),
      coalesce(v_size, '')
    );

    v_item_count := v_item_count + v_quantity;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  if v_item_count <= 0 then
    raise exception '購物車沒有可提交的商品。';
  end if;

  update public.shop_orders
  set item_count = v_item_count,
      subtotal = v_subtotal,
      total_amount = v_subtotal
  where id = v_order.id
  returning * into v_order;

  if v_account.id is not null then
    update public.shop_payment_accounts
    set last_assigned_at = now()
    where id = v_account.id;
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'orderNumber', v_order.order_number,
    'itemCount', v_order.item_count,
    'status', v_order.status,
    'subtotal', v_order.subtotal,
    'totalAmount', v_order.total_amount,
    'paymentReference', v_order.payment_reference,
    'paymentChannelLabel', v_order.payment_account_label
  );
end;
$$;

revoke all on function public.create_shop_order_with_stock(text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_order_with_stock(text, uuid, text, text, text, text, jsonb) to service_role;
