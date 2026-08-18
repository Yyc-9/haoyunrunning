-- 商城目前只提供跑班自取；課程報名仍維持獨立的銀行匯款核對流程。
-- 保留舊付款值供歷史訂單讀取，但新訂單一律由資料庫函式寫入 pickup。

alter table public.shop_orders
  drop constraint if exists shop_orders_payment_method_check;

alter table public.shop_orders
  add constraint shop_orders_payment_method_check
  check (payment_method in ('bank_transfer', 'manual_review', 'pickup'));

alter table public.shop_orders
  alter column payment_method set default 'pickup';

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
    'pickup',
    '',
    null,
    '',
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

  return jsonb_build_object(
    'id', v_order.id,
    'orderNumber', v_order.order_number,
    'itemCount', v_order.item_count,
    'status', v_order.status,
    'subtotal', v_order.subtotal,
    'totalAmount', v_order.total_amount,
    'paymentReference', '',
    'paymentChannelLabel', '跑班自取'
  );
end;
$$;

revoke all on function public.create_shop_order_with_stock(text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_order_with_stock(text, uuid, text, text, text, text, jsonb) to service_role;
