create or replace function public.confirm_finance_reconciliation_transaction(
  p_transaction_id uuid,
  p_actor_profile_id uuid
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_transaction public.finance_bank_transactions%rowtype;
  v_candidate public.finance_reconciliation_candidates%rowtype;
  v_course public.signup_leads%rowtype;
  v_shop public.shop_orders%rowtype;
  v_order jsonb;
  v_changed boolean := false;
begin
  select *
  into v_transaction
  from public.finance_bank_transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'bank transaction not found';
  end if;

  if v_transaction.match_status = 'confirmed' then
    return jsonb_build_object(
      'transactionId', v_transaction.id,
      'alreadyConfirmed', true,
      'changed', false
    );
  end if;

  if v_transaction.direction <> 'credit'
    or v_transaction.match_status in ('ignored', 'duplicate', 'unmatched', 'ambiguous', 'amount_mismatch') then
    raise exception 'bank transaction is not ready for confirmation';
  end if;

  select *
  into v_candidate
  from public.finance_reconciliation_candidates
  where transaction_id = p_transaction_id
    and selected = true;

  if not found then
    raise exception 'selected reconciliation candidate not found';
  end if;

  if v_candidate.order_kind = 'course' then
    select *
    into v_course
    from public.signup_leads
    where id = v_candidate.order_id
      and source = 'course_payment'
    for update;

    if not found or v_course.status not in ('pending_review', 'rejected', 'approved') then
      raise exception 'course enrollment is not ready for confirmation';
    end if;

    if v_course.status <> 'approved' then
      v_course := public.approve_course_enrollment(
        v_course.id,
        '銀行對帳確認：後五碼與款項已由財務核對。'
      );
      v_order := to_jsonb(v_course);
      v_changed := true;
    else
      v_order := to_jsonb(v_course);
    end if;
  else
    select *
    into v_shop
    from public.shop_orders
    where id = v_candidate.order_id
    for update;

    if not found or v_shop.status not in ('pending_review', 'rejected', 'approved') then
      raise exception 'shop order is not ready for confirmation';
    end if;

    if v_shop.status <> 'approved' then
      if v_shop.inventory_reserved is not true then
        raise exception 'shop inventory is not reserved';
      end if;

      update public.shop_orders as shop_order
      set
        status = 'approved',
        reviewed_at = now(),
        review_note = '銀行對帳確認：後五碼與款項已由財務核對。',
        updated_at = now()
      where shop_order.id = v_shop.id
      returning to_jsonb(shop_order.*) into v_order;

      v_changed := true;
    else
      v_order := to_jsonb(v_shop);
    end if;
  end if;

  update public.finance_bank_transactions
  set
    match_status = 'confirmed',
    match_reason = case
      when v_changed then '銀行款項與訂單已完成對帳並確認。'
      else '訂單先前已確認，本次已補登銀行對帳依據。'
    end,
    confirmed_at = now(),
    confirmed_by = p_actor_profile_id
  where id = p_transaction_id
  returning * into v_transaction;

  insert into public.finance_reconciliation_audit_log (
    batch_id,
    transaction_id,
    actor_profile_id,
    action,
    details
  ) values (
    v_transaction.batch_id,
    v_transaction.id,
    p_actor_profile_id,
    'confirm',
    jsonb_build_object(
      'orderKind', v_candidate.order_kind,
      'orderId', v_candidate.order_id,
      'changed', v_changed
    )
  );

  return jsonb_build_object(
    'transactionId', v_transaction.id,
    'batchId', v_transaction.batch_id,
    'orderKind', v_candidate.order_kind,
    'orderId', v_candidate.order_id,
    'changed', v_changed,
    'order', v_order
  );
end;
$$;

revoke all on function public.confirm_finance_reconciliation_transaction(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.confirm_finance_reconciliation_transaction(uuid, uuid)
to service_role;
