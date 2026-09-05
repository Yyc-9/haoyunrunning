-- Additive migration: historical orders retain [], new orders save an immutable choice snapshot.
alter table public.shop_order_items
  add column if not exists selected_specifications jsonb not null default '[]'::jsonb;
alter table public.shop_order_items drop constraint if exists shop_order_items_specifications_array;
alter table public.shop_order_items add constraint shop_order_items_specifications_array
  check (jsonb_typeof(selected_specifications) = 'array' and jsonb_array_length(selected_specifications) <= 30);

-- Match lib/product-specifications.ts: delimiters, duplicate labels, and legacy size/style rows.
create or replace function public.shop_specification_groups(p_specs jsonb, p_sizes jsonb, p_variants jsonb)
returns jsonb
language sql immutable security invoker
set search_path = public
as $$
  with raw_options as (
    select btrim(spec.value->>'label') as label,
      regexp_replace(option.value, '^[[:space:]]+|[[:space:]]+$', '', 'g') as option,
      spec.ordinality * 1000 + option.ordinality as position
    from jsonb_array_elements(coalesce(p_specs, '[]'::jsonb)) with ordinality spec(value, ordinality)
    cross join lateral regexp_split_to_table(spec.value->>'value', E'[,，、\r\n]') with ordinality option(value, ordinality)
    where jsonb_typeof(spec.value->'label') = 'string' and jsonb_typeof(spec.value->'value') = 'string'
  ), unique_options as (
    select label, option, min(position) as position from raw_options
    where label <> '' and option <> '' group by label, option
  ), groups as (
    select label, jsonb_agg(option order by position) as options, min(position) as position
    from unique_options group by label
  ), sizes as (
    select coalesce(jsonb_agg(distinct btrim(value)), '[]'::jsonb) as options
    from jsonb_array_elements_text(coalesce(p_sizes, '[]'::jsonb)) where btrim(value) <> ''
  ), variants as (
    select coalesce(jsonb_agg(distinct btrim(value->>'name')), '[]'::jsonb) as options
    from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) where btrim(value->>'name') <> ''
  )
  select coalesce(jsonb_agg(jsonb_build_object('label', groups.label, 'options', groups.options) order by groups.position), '[]'::jsonb)
  from groups cross join sizes cross join variants
  where not (groups.label in ('尺寸', '尺碼', '商品尺碼') and sizes.options <> '[]'::jsonb and groups.options @> sizes.options and sizes.options @> groups.options)
    and not (groups.label in ('款式', '顏色', '配色') and variants.options <> '[]'::jsonb and groups.options @> variants.options and variants.options @> groups.options);
$$;

-- New RPC name prevents an old database from silently discarding submitted specifications.
-- The previous RPC remains available during the migration-before-app deployment window.
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

  -- Stable product lock order also covers multiple specifications of the same product.
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

    update public.shop_products
    set stock_quantity = stock_quantity - v_quantity, updated_at = now()
    where id = v_product_id and active = true and deleted_at is null
      and price > 0 and stock_quantity >= v_quantity
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
      order_id, product_id, name, quantity, price, image, variant_id, size, selected_specifications
    ) values (
      v_order.id, v_product.id, v_product.name, v_quantity, v_product.price,
      v_product.image, coalesce(v_variant_id, ''), coalesce(v_size, ''), v_selected
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

revoke all on function public.shop_specification_groups(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.shop_specification_groups(jsonb, jsonb, jsonb) to service_role;
revoke all on function public.create_shop_order_with_specs(text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_order_with_specs(text, uuid, text, text, text, text, jsonb) to service_role;

notify pgrst, 'reload schema';
