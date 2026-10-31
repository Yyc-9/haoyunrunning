alter table public.finance_shop_review_audit drop constraint finance_shop_review_audit_action_check;
alter table public.finance_shop_review_audit add constraint finance_shop_review_audit_action_check check(action in ('approved','rejected','note'));

create or replace function public.finance_review_shop_order(
 p_actor_id uuid,p_order_id uuid,p_status text,p_reason text,
 p_confirm_receipt boolean,p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_before public.shop_orders%rowtype; v_after public.shop_orders%rowtype;
begin
 if not (exists(select 1 from public.profiles where id=p_actor_id and role='admin')
   or exists(select 1 from auth.users where id=p_actor_id and email_confirmed_at is not null
     and lower(trim(email))='yuanma0525@gmail.com')) then raise exception 'finance_required'; end if;
 if p_status is null or p_status not in ('approved','rejected','note') then raise exception 'invalid_status'; end if;
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>1000 then raise exception 'reason_required'; end if;
 if p_status='approved' and p_confirm_receipt is distinct from true then raise exception 'receipt_required'; end if;
 select * into v_before from public.shop_orders where id=p_order_id for update;
 if not found then raise exception 'order_not_found'; end if;
 if p_expected_updated_at is null or v_before.updated_at is distinct from p_expected_updated_at then raise exception 'order_changed'; end if;
 if v_before.payment_method is null or v_before.payment_method not in ('bank_transfer','manual_review') then raise exception 'not_bank_transfer'; end if;
 if v_before.status='approved' and p_status<>'note' then raise exception 'already_approved'; end if;
 if p_status='approved' and (v_before.inventory_reserved is distinct from true or coalesce(v_before.total_amount,0)<=0) then raise exception 'inventory_review_required'; end if;
 update public.shop_orders set status=case when p_status='note' then status else p_status end,
   review_note=trim(p_reason),reviewed_at=case when p_status='note' then reviewed_at else now() end
 where id=p_order_id returning * into v_after;
 insert into public.finance_shop_review_audit(order_id,actor_id,action,reason,before_value,after_value)
 values(p_order_id,p_actor_id,p_status,trim(p_reason),
 jsonb_build_object('status',v_before.status,'reviewNote',v_before.review_note,'reviewedAt',v_before.reviewed_at,'totalAmount',v_before.total_amount),
 jsonb_build_object('status',v_after.status,'reviewNote',v_after.review_note,'reviewedAt',v_after.reviewed_at,'totalAmount',v_after.total_amount));
 return jsonb_build_object('id',v_after.id,'status',v_after.status,'updated_at',v_after.updated_at);
end;
$$;
revoke all on function public.finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz) to service_role;
