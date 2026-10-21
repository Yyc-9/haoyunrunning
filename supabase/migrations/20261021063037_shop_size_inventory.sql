-- Deploy before the application. NULL retains the existing shared-stock mode.
begin;
alter table public.shop_products
  add column if not exists stock_by_size jsonb;

create or replace function public.validate_shop_size_inventory()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  v_total bigint;
begin
  if new.stock_by_size is null then return new; end if;
  if jsonb_typeof(new.stock_by_size) <> 'object'
    or jsonb_typeof(new.sizes) is distinct from 'array'
    or jsonb_array_length(new.sizes) not between 1 and 100 then
    raise exception '請選擇尺碼並填寫各尺寸庫存。';
  end if;
  if (select count(*) from jsonb_object_keys(new.stock_by_size)) <> jsonb_array_length(new.sizes)
    or exists (select 1 from jsonb_array_elements(new.sizes) size
      where jsonb_typeof(size) <> 'string' or not (new.stock_by_size ? (size #>> '{}')))
    or exists (select 1 from jsonb_object_keys(new.stock_by_size) size where not (new.sizes ? size)) then
    raise exception '各尺寸庫存必須與商品尺碼一致。';
  end if;
  if exists (select 1 from jsonb_each(new.stock_by_size) entry
    where jsonb_typeof(entry.value) <> 'number' or entry.value::text !~ '^[0-9]{1,7}$') then
    raise exception '各尺寸庫存必須是 0 或正整數。';
  end if;
  select sum(value::text::integer) into v_total from jsonb_each(new.stock_by_size);
  if v_total > 1000000 then raise exception '總庫存不可超過 1,000,000。'; end if;
  -- Keep a size available for restoration until its reserved orders are resolved.
  if exists (select 1 from public.shop_order_items item
    join public.shop_orders orders on orders.id = item.order_id
    where item.product_id = new.id and not item.is_preorder
      and orders.inventory_reserved and orders.status <> 'approved'
      and not (new.stock_by_size ? coalesce(item.size, ''))) then
    raise exception '尚有未完成訂單使用舊尺寸，請保留該尺寸，或先處理訂單再調整。';
  end if;
  if tg_op = 'UPDATE' and old.stock_by_size is not null and exists (
    select 1 from jsonb_each(old.stock_by_size) entry
    where entry.value::text::integer > 0 and not (new.stock_by_size ? entry.key)
  ) then
    raise exception '移除尺寸前，請先確認並將該尺寸庫存調整為 0。';
  end if;
  new.stock_quantity := v_total::integer;
  return new;
end;
$$;
drop trigger if exists shop_size_inventory_guard on public.shop_products;
create trigger shop_size_inventory_guard before insert or update on public.shop_products
for each row execute function public.validate_shop_size_inventory();
revoke all on function public.validate_shop_size_inventory() from public, anon, authenticated;

-- Both old shared-stock orders and new per-size orders retain their original size.
-- When the current inventory mode changes, restore into the current matching bucket.
create or replace function public.restore_shop_order_stock(p_order_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_line record;
begin
  for v_line in select product_id, size, sum(quantity)::integer as quantity
    from public.shop_order_items where order_id = p_order_id and not is_preorder
    group by product_id, size order by product_id, size
  loop
    update public.shop_products
    set stock_quantity = stock_quantity + v_line.quantity,
        stock_by_size = case when stock_by_size is null then null else
          jsonb_set(stock_by_size, array[v_line.size], to_jsonb((stock_by_size->>v_line.size)::integer + v_line.quantity)) end,
        updated_at = now()
    where id = v_line.product_id;
  end loop;
end;
$$;
revoke all on function public.restore_shop_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.restore_shop_order_stock(uuid) to service_role;

create or replace function public.create_shop_order_with_specs(
  p_order_number text, p_user_id uuid, p_customer_name text, p_contact text,
  p_email text, p_fulfillment_note text, p_items jsonb
)
returns jsonb
language plpgsql security invoker
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
  v_selected jsonb;
  v_groups jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = '22023', message = '購物車資料格式無效。';
  end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception using errcode = '22023', message = '購物車商品數量無效。';
  end if;

  insert into public.shop_orders (
    order_number, user_id, customer_name, contact, email, fulfillment_note,
    item_count, status, payment_method, payment_reference, payment_account_id,
    payment_account_label, inventory_reserved
  ) values (
    p_order_number, p_user_id, p_customer_name, p_contact, p_email, p_fulfillment_note,
    0, 'pending_transfer', 'pickup', '', null, '', true
  ) returning * into v_order;

  -- Keep a stable lock order, including different options of the same product.
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'productId'
  loop
    v_product_id := nullif(btrim(v_item->>'productId'), '');
    v_variant_id := nullif(btrim(v_item->>'variantId'), '');
    v_size := nullif(btrim(v_item->>'size'), '');
    begin
      v_quantity := (v_item->>'quantity')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      v_quantity := 0;
    end;
    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception using errcode = '22023', message = '購物車包含無效商品。';
    end if;

    -- The server owns preorder eligibility. Preorders never consume physical stock.
    update public.shop_products
    set stock_quantity = case when is_preorder then stock_quantity else stock_quantity - v_quantity end,
        stock_by_size = case when is_preorder or stock_by_size is null then stock_by_size else
          jsonb_set(stock_by_size, array[v_size], to_jsonb((stock_by_size->>v_size)::integer - v_quantity)) end,
        updated_at = now()
    where id = v_product_id and active = true and deleted_at is null
      and price > 0 and (is_preorder or
        case when stock_by_size is null then stock_quantity else coalesce((stock_by_size->>v_size)::integer, 0) end >= v_quantity)
    returning * into v_product;
    if not found then
      if exists (select 1 from public.shop_products where id = v_product_id and active = true and deleted_at is null and price <= 0) then
        raise exception '商品尚未設定售價：%', v_product_id;
      end if;
      raise exception '庫存不足：%', v_product_id;
    end if;

    if (jsonb_array_length(coalesce(v_product.sizes, '[]'::jsonb)) > 0 and not coalesce(v_product.sizes ? v_size, false))
      or (jsonb_array_length(coalesce(v_product.sizes, '[]'::jsonb)) = 0 and v_size is not null) then
      raise exception using errcode = '22023', message = '商品尺碼已更新，請回商品頁重新選擇。';
    end if;
    if (jsonb_array_length(coalesce(v_product.variants, '[]'::jsonb)) > 0 and not exists (
      select 1 from jsonb_array_elements(v_product.variants) variant where variant->>'id' = v_variant_id
    )) or (jsonb_array_length(coalesce(v_product.variants, '[]'::jsonb)) = 0 and v_variant_id is not null) then
      raise exception using errcode = '22023', message = '商品款式已更新，請回商品頁重新選擇。';
    end if;

    v_selected := coalesce(v_item->'selectedSpecifications', '[]'::jsonb);
    if jsonb_typeof(v_selected) <> 'array' then
      raise exception using errcode = '22023', message = '商品規格格式無效。';
    end if;
    if jsonb_array_length(v_selected) > 30 or exists (
      select 1 from jsonb_array_elements(v_selected) choice
      where jsonb_typeof(choice->'label') is distinct from 'string'
        or jsonb_typeof(choice->'value') is distinct from 'string'
        or char_length(btrim(choice->>'label')) not between 1 and 80
        or char_length(btrim(choice->>'value')) not between 1 and 300
    ) then
      raise exception using errcode = '22023', message = '商品規格格式無效。';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('label', btrim(choice->>'label'), 'value', btrim(choice->>'value'))), '[]'::jsonb)
      into v_selected from jsonb_array_elements(v_selected) choice;
    if exists (select 1 from jsonb_array_elements(v_selected) choice group by choice->>'label' having count(*) > 1) then
      raise exception using errcode = '22023', message = '每組商品規格只能選擇一項。';
    end if;
    v_groups := public.shop_specification_groups(v_product.specifications, v_product.sizes, v_product.variants);
    if jsonb_array_length(v_groups) <> jsonb_array_length(v_selected) or exists (
      select 1 from jsonb_array_elements(v_groups) spec_group where not exists (
        select 1 from jsonb_array_elements(v_selected) choice
        where choice->>'label' = spec_group->>'label' and (spec_group->'options') ? (choice->>'value')
      )
    ) then
      raise exception using errcode = '22023', message = '商品規格已更新或尚未選齊，請回商品頁重新選擇後加入購物車。';
    end if;

    insert into public.shop_order_items (
      order_id, product_id, name, quantity, price, image, variant_id, size, selected_specifications, is_preorder
    ) values (
      v_order.id, v_product.id,
      v_product.name || case when v_product.is_preorder then '（預購）' else '' end,
      v_quantity, v_product.price, v_product.image, coalesce(v_variant_id, ''), coalesce(v_size, ''),
      v_selected, v_product.is_preorder
    );
    v_item_count := v_item_count + v_quantity;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;
  update public.shop_orders set item_count = v_item_count, subtotal = v_subtotal, total_amount = v_subtotal
  where id = v_order.id returning * into v_order;
  return jsonb_build_object(
    'id', v_order.id, 'orderNumber', v_order.order_number, 'itemCount', v_order.item_count,
    'status', v_order.status, 'subtotal', v_order.subtotal, 'totalAmount', v_order.total_amount,
    'paymentReference', '', 'paymentChannelLabel', '跑班自取'
  );
end;
$$;

-- Route legacy callers through the same size, specification and preorder checks.
create or replace function public.create_shop_order_with_stock(
  p_order_number text, p_user_id uuid, p_customer_name text, p_contact text,
  p_email text, p_fulfillment_note text, p_items jsonb
)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare v_items jsonb := p_items;
begin
  if jsonb_typeof(p_items) = 'array' then
    select coalesce(jsonb_agg(item || jsonb_build_object(
      'productId', coalesce(item->>'productId', item->>'product_id'),
      'variantId', coalesce(item->>'variantId', item->>'variant_id')
    )), '[]'::jsonb) into v_items from jsonb_array_elements(p_items) item;
  end if;
  return public.create_shop_order_with_specs(p_order_number, p_user_id, p_customer_name,
    p_contact, p_email, p_fulfillment_note, v_items);
end;
$$;
revoke all on function public.create_shop_order_with_stock(text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_order_with_stock(text, uuid, text, text, text, text, jsonb) to service_role;

-- Release uses the immutable order-line snapshot, even if the product mode changes.
create or replace function public.delete_shop_order_with_inventory(p_order_id uuid)
returns boolean
language plpgsql security invoker
set search_path = public
as $$
declare
  v_status text;
  v_inventory_reserved boolean;
begin
  select status, inventory_reserved into v_status, v_inventory_reserved
  from public.shop_orders where id = p_order_id for update;
  if not found then return false; end if;
  if v_status = 'approved' then raise exception 'approved orders cannot be deleted'; end if;
  if coalesce(v_inventory_reserved, false) then
    perform public.restore_shop_order_stock(p_order_id);
  end if;
  delete from public.shop_orders where id = p_order_id;
  return true;
end;
$$;

create or replace function public.release_shop_order_inventory(p_order_id uuid, p_stripe_session_id text)
returns boolean
language plpgsql security invoker
set search_path = public
as $$
declare
  v_released boolean := false;
begin
  update public.shop_orders
  set inventory_reserved = false, status = 'rejected', reviewed_at = now(),
      review_note = '信用卡付款逾時，系統已釋放庫存。'
  where id = p_order_id and stripe_session_id = p_stripe_session_id
    and inventory_reserved = true and status in ('pending_transfer', 'pending_review')
  returning true into v_released;
  if not coalesce(v_released, false) then return false; end if;
  perform public.restore_shop_order_stock(p_order_id);
  return true;
end;
$$;

revoke all on function public.create_shop_order_with_specs(text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_order_with_specs(text, uuid, text, text, text, text, jsonb) to service_role;
revoke all on function public.delete_shop_order_with_inventory(uuid) from public, anon, authenticated;
grant execute on function public.delete_shop_order_with_inventory(uuid) to service_role;
revoke all on function public.release_shop_order_inventory(uuid, text) from public, anon, authenticated;
grant execute on function public.release_shop_order_inventory(uuid, text) to service_role;
notify pgrst, 'reload schema';
commit;
