create or replace function public.delete_shop_order_with_inventory(
  p_order_id uuid
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_status text;
  v_inventory_reserved boolean;
begin
  select status, inventory_reserved
  into v_status, v_inventory_reserved
  from public.shop_orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if v_status = 'approved' then
    raise exception 'approved orders cannot be deleted';
  end if;

  if coalesce(v_inventory_reserved, false) then
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
  end if;

  delete from public.shop_orders where id = p_order_id;
  return true;
end;
$$;

revoke all on function public.delete_shop_order_with_inventory(uuid) from public, anon, authenticated;
grant execute on function public.delete_shop_order_with_inventory(uuid) to service_role;
