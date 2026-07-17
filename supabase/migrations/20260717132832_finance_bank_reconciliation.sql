create table if not exists public.finance_access_credentials (
  singleton_key text primary key default 'primary'
    check (singleton_key = 'primary'),
  password_hash text not null
    check (char_length(password_hash) between 64 and 256),
  password_salt text not null
    check (char_length(password_salt) between 16 and 128),
  token_secret text not null
    check (char_length(token_secret) between 32 and 256),
  credential_version integer not null default 1
    check (credential_version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_access_credentials enable row level security;
revoke all on table public.finance_access_credentials from public, anon, authenticated;
grant all on table public.finance_access_credentials to service_role;

create table if not exists public.finance_access_guards (
  admin_profile_id uuid primary key references public.profiles(id) on delete cascade,
  failed_attempts integer not null default 0
    check (failed_attempts between 0 and 20),
  locked_until timestamptz,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.finance_access_guards enable row level security;
revoke all on table public.finance_access_guards from public, anon, authenticated;
grant all on table public.finance_access_guards to service_role;

create table if not exists public.finance_reconciliation_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_sha256 text not null unique
    check (file_sha256 ~ '^[0-9a-f]{64}$'),
  file_size_bytes bigint not null default 0
    check (file_size_bytes between 0 and 10485760),
  sheet_name text not null default '',
  bank_account_id uuid references public.shop_payment_accounts(id) on delete set null,
  bank_account_label text not null default '',
  header_row integer not null default 1
    check (header_row between 1 and 50),
  original_row_count integer not null default 0
    check (original_row_count >= 0),
  imported_count integer not null default 0
    check (imported_count >= 0),
  duplicate_count integer not null default 0
    check (duplicate_count >= 0),
  status text not null default 'processed'
    check (status in ('processed', 'partially_confirmed', 'confirmed')),
  summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(summary) = 'object'),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  uploaded_at timestamptz not null default now()
);

create index if not exists finance_reconciliation_batches_uploaded_idx
on public.finance_reconciliation_batches (uploaded_at desc);

alter table public.finance_reconciliation_batches enable row level security;
revoke all on table public.finance_reconciliation_batches from public, anon, authenticated;
grant all on table public.finance_reconciliation_batches to service_role;

create table if not exists public.finance_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.finance_reconciliation_batches(id) on delete cascade,
  row_number integer not null
    check (row_number > 0),
  transaction_date date,
  transaction_time text not null default '',
  amount integer not null
    check (amount > 0),
  direction text not null default 'credit'
    check (direction in ('credit', 'debit')),
  source_last_five text not null default ''
    check (source_last_five = '' or source_last_five ~ '^[0-9]{5}$'),
  source_name text not null default '',
  bank_reference text not null default '',
  note text not null default '',
  transaction_fingerprint text not null unique
    check (transaction_fingerprint ~ '^[0-9a-f]{64}$'),
  match_status text not null default 'unmatched'
    check (match_status in (
      'matched',
      'ambiguous',
      'amount_mismatch',
      'unmatched',
      'already_confirmed',
      'manual_match',
      'duplicate',
      'ignored',
      'confirmed'
    )),
  match_reason text not null default '',
  candidate_count integer not null default 0
    check (candidate_count >= 0),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

create index if not exists finance_bank_transactions_batch_status_idx
on public.finance_bank_transactions (batch_id, match_status, row_number);

create index if not exists finance_bank_transactions_match_lookup_idx
on public.finance_bank_transactions (source_last_five, amount, transaction_date desc)
where direction = 'credit' and source_last_five <> '';

alter table public.finance_bank_transactions enable row level security;
revoke all on table public.finance_bank_transactions from public, anon, authenticated;
grant all on table public.finance_bank_transactions to service_role;

create table if not exists public.finance_reconciliation_candidates (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.finance_bank_transactions(id) on delete cascade,
  order_kind text not null
    check (order_kind in ('course', 'shop')),
  order_id uuid not null,
  order_number text not null default '',
  customer_name text not null default '',
  order_label text not null default '',
  expected_amount integer not null
    check (expected_amount >= 0),
  transfer_last_five text not null
    check (transfer_last_five ~ '^[0-9]{5}$'),
  order_status text not null,
  match_quality text not null
    check (match_quality in ('exact', 'last_five_only')),
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (transaction_id, order_kind, order_id)
);

create index if not exists finance_reconciliation_candidates_transaction_idx
on public.finance_reconciliation_candidates (transaction_id, match_quality, selected);

create unique index if not exists finance_reconciliation_candidates_one_selected_idx
on public.finance_reconciliation_candidates (transaction_id)
where selected = true;

alter table public.finance_reconciliation_candidates enable row level security;
revoke all on table public.finance_reconciliation_candidates from public, anon, authenticated;
grant all on table public.finance_reconciliation_candidates to service_role;

create table if not exists public.finance_reconciliation_audit_log (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.finance_reconciliation_batches(id) on delete set null,
  transaction_id uuid references public.finance_bank_transactions(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null
    check (action in (
      'credential_setup',
      'password_changed',
      'unlock_success',
      'unlock_failure',
      'import',
      'select_candidate',
      'confirm',
      'ignore'
    )),
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists finance_reconciliation_audit_batch_idx
on public.finance_reconciliation_audit_log (batch_id, created_at desc);

create index if not exists finance_reconciliation_audit_actor_idx
on public.finance_reconciliation_audit_log (actor_profile_id, created_at desc);

alter table public.finance_reconciliation_audit_log enable row level security;
revoke all on table public.finance_reconciliation_audit_log from public, anon, authenticated;
grant all on table public.finance_reconciliation_audit_log to service_role;

create or replace function public.select_finance_reconciliation_candidate(
  p_transaction_id uuid,
  p_candidate_id uuid,
  p_actor_profile_id uuid
)
returns public.finance_bank_transactions
language plpgsql
set search_path = ''
as $$
declare
  v_transaction public.finance_bank_transactions%rowtype;
  v_candidate public.finance_reconciliation_candidates%rowtype;
begin
  select *
  into v_transaction
  from public.finance_bank_transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'bank transaction not found';
  end if;

  if v_transaction.match_status in ('confirmed', 'ignored', 'duplicate') then
    raise exception 'bank transaction cannot be rematched';
  end if;

  select *
  into v_candidate
  from public.finance_reconciliation_candidates
  where id = p_candidate_id
    and transaction_id = p_transaction_id;

  if not found then
    raise exception 'reconciliation candidate not found';
  end if;

  update public.finance_reconciliation_candidates
  set selected = false
  where transaction_id = p_transaction_id
    and selected = true;

  update public.finance_reconciliation_candidates
  set selected = true
  where id = p_candidate_id;

  update public.finance_bank_transactions
  set
    match_status = 'manual_match',
    match_reason = case
      when v_candidate.expected_amount = v_transaction.amount
        then '財務已人工選擇唯一訂單。'
      else '財務已人工選擇金額不同的訂單，確認前請再次核對。'
    end
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
    'select_candidate',
    jsonb_build_object(
      'candidateId', v_candidate.id,
      'orderKind', v_candidate.order_kind,
      'orderId', v_candidate.order_id,
      'amountMatches', v_candidate.expected_amount = v_transaction.amount
    )
  );

  return v_transaction;
end;
$$;

revoke all on function public.select_finance_reconciliation_candidate(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.select_finance_reconciliation_candidate(uuid, uuid, uuid)
to service_role;

create or replace function public.ignore_finance_reconciliation_transaction(
  p_transaction_id uuid,
  p_actor_profile_id uuid,
  p_reason text default ''
)
returns public.finance_bank_transactions
language plpgsql
set search_path = ''
as $$
declare
  v_transaction public.finance_bank_transactions%rowtype;
begin
  update public.finance_bank_transactions
  set
    match_status = 'ignored',
    match_reason = coalesce(nullif(trim(p_reason), ''), '財務已標記為不需對帳。'),
    confirmed_at = null,
    confirmed_by = null
  where id = p_transaction_id
    and match_status not in ('confirmed', 'duplicate')
  returning * into v_transaction;

  if not found then
    raise exception 'bank transaction cannot be ignored';
  end if;

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
    'ignore',
    jsonb_build_object('reason', left(coalesce(p_reason, ''), 300))
  );

  return v_transaction;
end;
$$;

revoke all on function public.ignore_finance_reconciliation_transaction(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.ignore_finance_reconciliation_transaction(uuid, uuid, text)
to service_role;

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

    if not found or v_course.status not in ('pending_review', 'approved') then
      raise exception 'course enrollment is not ready for confirmation';
    end if;

    if v_course.status = 'pending_review' then
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

    if not found or v_shop.status not in ('pending_review', 'approved') then
      raise exception 'shop order is not ready for confirmation';
    end if;

    if v_shop.status = 'pending_review' then
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
      when v_changed then '銀行款項與訂單已完成對帳並核准。'
      else '訂單先前已核准，本次已補登銀行對帳依據。'
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

  update public.finance_reconciliation_batches as batch
  set status = case
    when not exists (
      select 1
      from public.finance_bank_transactions as bank_transaction
      where bank_transaction.batch_id = batch.id
        and bank_transaction.direction = 'credit'
        and bank_transaction.match_status not in ('confirmed', 'ignored', 'duplicate')
    ) then 'confirmed'
    else 'partially_confirmed'
  end
  where batch.id = v_transaction.batch_id;

  return jsonb_build_object(
    'transactionId', v_transaction.id,
    'orderKind', v_candidate.order_kind,
    'orderId', v_candidate.order_id,
    'changed', v_changed,
    'alreadyConfirmed', not v_changed,
    'order', v_order
  );
end;
$$;

revoke all on function public.confirm_finance_reconciliation_transaction(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.confirm_finance_reconciliation_transaction(uuid, uuid)
to service_role;
