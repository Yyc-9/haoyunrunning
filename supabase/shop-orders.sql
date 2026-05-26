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
      and profiles.role in ('coach', 'admin')
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
            and profiles.role in ('coach', 'admin')
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
