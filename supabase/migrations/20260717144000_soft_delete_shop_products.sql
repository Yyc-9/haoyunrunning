alter table public.shop_products
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

comment on column public.shop_products.deleted_at is
  'Soft-deletion timestamp. Deleted products stay available for historical order and inventory audits.';

comment on column public.shop_products.deleted_by is
  'Administrator profile that deleted the product.';

create index if not exists shop_products_not_deleted_listing_idx
  on public.shop_products (active, category, name)
  where deleted_at is null;

create index if not exists shop_products_deleted_by_idx
  on public.shop_products (deleted_by)
  where deleted_by is not null;
