-- Invoice values are immutable purchase-time snapshots, independent of later registrations.
alter table public.shop_orders add column invoice_delivery text, add column invoice_detail text, add column tax_invoice_info text;
alter table public.shop_orders add constraint shop_orders_invoice_delivery_check check(invoice_delivery in ('carrier','email'));

create function public.create_shop_order_with_invoice(
  p_order_number text,p_user_id uuid,p_customer_name text,p_contact text,p_email text,
  p_fulfillment_note text,p_items jsonb,p_match_email text,p_pickup_course_id uuid,p_transfer_last_five text,
  p_require_selection boolean,p_invoice jsonb
) returns jsonb language plpgsql set search_path=public as $$
declare v_result jsonb; v_method text:=p_invoice->>'invoiceDelivery'; v_detail text:=trim(p_invoice->>'invoiceDetail');
begin
  if v_method is null or v_method not in ('carrier','email') or nullif(v_detail,'') is null
    or length(v_detail)>320 or length(coalesce(p_invoice->>'taxInvoiceInfo',''))>300
    or (v_method='carrier' and v_detail !~ '^/[A-Z0-9+.-]{7}$')
    or (v_method='email' and v_detail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    then raise exception using errcode='22023',message='請確認發票載具或電子信箱。'; end if;
  v_result:=public.create_shop_order_with_pickup(p_order_number,p_user_id,p_customer_name,p_contact,p_email,p_fulfillment_note,p_items,p_match_email,p_pickup_course_id,p_transfer_last_five,p_require_selection);
  update public.shop_orders set invoice_delivery=v_method,invoice_detail=v_detail,tax_invoice_info=trim(coalesce(p_invoice->>'taxInvoiceInfo','')) where id=(v_result->>'id')::uuid;
  return v_result;
end;
$$;
revoke all on function public.create_shop_order_with_invoice(text,uuid,text,text,text,text,jsonb,text,uuid,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.create_shop_order_with_invoice(text,uuid,text,text,text,text,jsonb,text,uuid,text,boolean,jsonb) to service_role;
