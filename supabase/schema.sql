-- Good Luck Running initial Supabase schema
-- Run this file in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'coach', 'admin');
create type public.feedback_status as enum ('new', 'flagged', 'reviewed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  name text not null default '',
  email text not null default '',
  phone text default '',
  program text default '',
  goal text default '',
  pb text default '',
  avatar_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (coach_id, student_id)
);

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  week_number integer not null,
  week_start date not null,
  workout_date date not null,
  day_label text not null,
  title text not null,
  target text not null,
  pace text default '',
  note text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_feedback (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid references public.training_plans(id) on delete set null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  completed_at timestamptz not null default now(),
  distance_km numeric(6, 2),
  duration_text text default '',
  pace_text text default '',
  average_heart_rate integer,
  rpe integer check (rpe between 1 and 10),
  feeling text default '',
  status public.feedback_status not null default 'new',
  coach_note text default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.training_feedback(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text default '',
  content_type text default '',
  created_at timestamptz not null default now()
);

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  contact text not null,
  email text default '',
  fulfillment_note text default '',
  item_count integer not null default 0,
  status text not null default 'pending_transfer' check (status in ('pending_transfer', 'pending_review', 'approved', 'rejected')),
  transfer_last_five text default '',
  payment_submitted_at timestamptz,
  reminder_sent_at timestamptz,
  reviewed_at timestamptz,
  review_note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  price integer not null default 0,
  image text default '',
  created_at timestamptz not null default now()
);

create table public.coach_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.signup_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('anniversary_4th', 'group_class', 'course_payment')),
  name text not null,
  phone text default '',
  email text default '',
  instagram text default '',
  preferred_course text default '',
  running_experience text default '',
  goal text default '',
  companion_count text default '',
  amount_text text default '',
  notes text default '',
  status text not null default 'pending_transfer' check (status in ('pending_transfer', 'pending_review', 'approved', 'rejected')),
  transfer_last_five text default '',
  payment_submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index signup_leads_source_created_at_idx
on public.signup_leads (source, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger training_plans_set_updated_at
before update on public.training_plans
for each row execute function public.set_updated_at();

create trigger shop_orders_set_updated_at
before update on public.shop_orders
for each row execute function public.set_updated_at();

create trigger signup_leads_set_updated_at
before update on public.signup_leads
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

create or replace function public.is_coach_of(coach_id uuid, student_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coach_students
    where coach_students.coach_id = is_coach_of.coach_id
      and coach_students.student_id = is_coach_of.student_id
      and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.coach_students enable row level security;
alter table public.training_plans enable row level security;
alter table public.training_feedback enable row level security;
alter table public.feedback_attachments enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.coach_invites enable row level security;
alter table public.signup_leads enable row level security;

create policy "profiles_select_own_or_coach_or_admin"
on public.profiles for select
using (
  id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1 from public.coach_students
    where coach_students.coach_id = auth.uid()
      and coach_students.student_id = profiles.id
      and active = true
  )
);

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_admin_update"
on public.profiles for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "coach_students_select_related"
on public.coach_students for select
using (
  coach_id = auth.uid()
  or student_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "coach_students_admin_write"
on public.coach_students for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "training_plans_select_related"
on public.training_plans for select
using (
  student_id = auth.uid()
  or coach_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "training_plans_coach_write"
on public.training_plans for all
using (
  coach_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  coach_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "training_feedback_select_related"
on public.training_feedback for select
using (
  student_id = auth.uid()
  or coach_id = auth.uid()
  or public.is_coach_of(auth.uid(), student_id)
  or public.is_admin(auth.uid())
);

create policy "training_feedback_student_insert"
on public.training_feedback for insert
with check (
  student_id = auth.uid()
  and (
    coach_id is null
    or public.is_coach_of(coach_id, auth.uid())
  )
);

create policy "training_feedback_student_update_own_unreviewed"
on public.training_feedback for update
using (student_id = auth.uid() and status <> 'reviewed')
with check (student_id = auth.uid());

create policy "training_feedback_coach_review"
on public.training_feedback for update
using (
  coach_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  coach_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "feedback_attachments_select_related"
on public.feedback_attachments for select
using (
  student_id = auth.uid()
  or exists (
    select 1 from public.training_feedback
    where training_feedback.id = feedback_attachments.feedback_id
      and (
        training_feedback.coach_id = auth.uid()
        or public.is_coach_of(auth.uid(), training_feedback.student_id)
      )
  )
  or public.is_admin(auth.uid())
);

create policy "feedback_attachments_student_insert"
on public.feedback_attachments for insert
with check (student_id = auth.uid());

create policy "shop_orders_select_own_or_admin"
on public.shop_orders for select
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "shop_orders_insert_own"
on public.shop_orders for insert
with check (user_id = auth.uid() or user_id is null);

create policy "shop_order_items_select_related"
on public.shop_order_items for select
using (
  exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.order_id
      and (
        shop_orders.user_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

create policy "shop_order_items_insert_related"
on public.shop_order_items for insert
with check (
  exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.order_id
      and (shop_orders.user_id = auth.uid() or shop_orders.user_id is null)
  )
);

create policy "coach_invites_admin_all"
on public.coach_invites for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "coach_invites_select_unused_for_signed_in"
on public.coach_invites for select
using (
  auth.uid() is not null
  and used_by is null
  and (expires_at is null or expires_at > now())
);

create policy "signup_leads_admin_select"
on public.signup_leads for select
using (public.is_admin(auth.uid()));

create policy "signup_leads_admin_update"
on public.signup_leads for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "signup_leads_admin_delete"
on public.signup_leads for delete
using (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('training-feedback', 'training-feedback', false)
on conflict (id) do nothing;

create policy "training_feedback_storage_read_own"
on storage.objects for select
using (
  bucket_id = 'training-feedback'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "training_feedback_storage_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'training-feedback'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create index coach_students_coach_id_idx on public.coach_students (coach_id);
create index coach_students_student_id_idx on public.coach_students (student_id);
create index training_plans_student_date_idx on public.training_plans (student_id, workout_date desc);
create index training_feedback_coach_status_idx on public.training_feedback (coach_id, status, created_at desc);
create index training_feedback_student_created_idx on public.training_feedback (student_id, created_at desc);
create index shop_orders_user_created_idx on public.shop_orders (user_id, created_at desc);
create index shop_order_items_order_idx on public.shop_order_items (order_id);
-- Add student race goals for accepted lottery races.

create table if not exists public.student_races (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  race_name text not null,
  location text not null default '',
  country text not null default '',
  race_date date,
  distance text not null default '',
  status text not null default 'accepted' check (status in ('accepted', 'planned', 'completed')),
  source text not null default 'catalog' check (source in ('catalog', 'custom')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger student_races_set_updated_at
before update on public.student_races
for each row execute function public.set_updated_at();

alter table public.student_races enable row level security;

create policy "student_races_select_related"
on public.student_races for select
using (
  student_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.is_coach_of(auth.uid(), student_id)
);

create policy "student_races_student_insert"
on public.student_races for insert
with check (student_id = auth.uid());

create policy "student_races_student_update_own"
on public.student_races for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "student_races_student_delete_own"
on public.student_races for delete
using (student_id = auth.uid());

create index if not exists student_races_student_date_idx
on public.student_races (student_id, race_date asc, created_at desc);

-- Shop products, inventory, and private payment-account assignment.

create table if not exists public.shop_products (
  id text primary key,
  name text not null,
  category text not null default '',
  price integer not null default 0 check (price >= 0),
  price_label text not null default '私訊諮詢',
  image text not null default '',
  rating numeric(3, 2) not null default 5,
  reviews integer not null default 0 check (reviews >= 0),
  tags jsonb not null default '[]'::jsonb,
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

insert into public.shop_products (
  id, name, category, price, price_label, image, rating, reviews, tags, variants, sizes, stock_quantity, active
) values
  ('1', '好運競速跑步背心', '跑者服飾', 0, '私訊諮詢', '/goodluck-running-vest.jpg', 5, 0, '["團隊裝備"]'::jsonb, '[{"id":"purple-white","name":"紫電白","image":"/goodluck-running-vest.jpg"},{"id":"black-blue","name":"曜黑藍","image":"/goodluck-running-vest-black.jpg"}]'::jsonb, '["XS","S","M","L","XL"]'::jsonb, 20, true),
  ('2', '好運跑步 T 恤', '跑者服飾', 0, '私訊諮詢', '/goodluck-running-tee.jpg', 5, 0, '["團隊裝備"]'::jsonb, '[]'::jsonb, '["XS","S","M","L","XL"]'::jsonb, 20, true),
  ('3', '好運跑步帽', '跑者配件', 0, '私訊諮詢', '', 5, 0, '["日常訓練"]'::jsonb, '[]'::jsonb, '["S/M","L/XL"]'::jsonb, 20, true),
  ('4', '好運毛巾衣', '跑者服飾', 0, '私訊諮詢', '', 5, 0, '["赛後恢復"]'::jsonb, '[]'::jsonb, '["S","M","L","XL"]'::jsonb, 20, true),
  ('5', 'CALBOMB 蜂蜜檸檬能量膠', '運動補給', 0, '私訊諮詢', '/calbomb-energy-gel.png', 5, 0, '["訓練補給","無添加認證"]'::jsonb, '[]'::jsonb, '[]'::jsonb, 30, true)
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
using ((select public.is_admin(auth.uid())))
with check ((select public.is_admin(auth.uid())));

drop policy if exists "shop_payment_accounts_admin_all" on public.shop_payment_accounts;
create policy "shop_payment_accounts_admin_all"
on public.shop_payment_accounts for all
to authenticated
using ((select public.is_admin(auth.uid())))
with check ((select public.is_admin(auth.uid())));

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
      and stock_quantity >= v_quantity
    returning * into v_product;

    if not found then
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
