create index if not exists finance_access_credentials_created_by_idx
on public.finance_access_credentials (created_by)
where created_by is not null;

create index if not exists finance_access_credentials_updated_by_idx
on public.finance_access_credentials (updated_by)
where updated_by is not null;

create index if not exists finance_reconciliation_batches_bank_account_idx
on public.finance_reconciliation_batches (bank_account_id)
where bank_account_id is not null;

create index if not exists finance_reconciliation_batches_uploaded_by_idx
on public.finance_reconciliation_batches (uploaded_by);

create index if not exists finance_bank_transactions_confirmed_by_idx
on public.finance_bank_transactions (confirmed_by)
where confirmed_by is not null;

create index if not exists finance_reconciliation_audit_transaction_idx
on public.finance_reconciliation_audit_log (transaction_id)
where transaction_id is not null;
