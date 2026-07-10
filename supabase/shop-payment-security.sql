alter table public.shop_orders
add column if not exists stripe_session_id text;

alter table public.shop_orders
add column if not exists stripe_payment_intent_id text;

alter table public.shop_orders
add column if not exists paid_at timestamptz;

alter table public.shop_orders
drop constraint if exists shop_orders_payment_method_check;

alter table public.shop_orders
add constraint shop_orders_payment_method_check
check (payment_method in ('bank_transfer', 'manual_review', 'card'));

create unique index if not exists shop_orders_stripe_session_unique_idx
on public.shop_orders (stripe_session_id)
where stripe_session_id is not null;

create or replace function public.release_shop_order_inventory(
  p_order_id uuid,
  p_stripe_session_id text
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_released boolean := false;
begin
  update public.shop_orders
  set inventory_reserved = false,
      status = 'rejected',
      reviewed_at = now(),
      review_note = '信用卡付款逾時，系統已釋放庫存。'
  where id = p_order_id
    and stripe_session_id = p_stripe_session_id
    and inventory_reserved = true
    and status in ('pending_transfer', 'pending_review')
  returning true into v_released;

  if not coalesce(v_released, false) then
    return false;
  end if;

  update public.shop_products as product
  set stock_quantity = product.stock_quantity + released.quantity,
      updated_at = now()
  from (
    select product_id, sum(quantity)::integer as quantity
    from public.shop_order_items
    where order_id = p_order_id
    group by product_id
  ) as released
  where product.id = released.product_id;

  return true;
end;
$$;

revoke all on function public.release_shop_order_inventory(uuid, text) from public, anon, authenticated;
grant execute on function public.release_shop_order_inventory(uuid, text) to service_role;
