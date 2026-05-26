-- Adds the shared signup/payment order status flow.
-- Run this in Supabase SQL Editor after the base tables exist.

do $$
begin
  if to_regclass('public.shop_orders') is not null then
    alter table public.shop_orders
    add column if not exists transfer_last_five text default '';

    alter table public.shop_orders
    add column if not exists payment_submitted_at timestamptz;

    alter table public.shop_orders
    add column if not exists reviewed_at timestamptz;

    alter table public.shop_orders
    add column if not exists review_note text default '';

    alter table public.shop_orders
    alter column status set default 'pending_transfer';

    update public.shop_orders
    set status = case
      when status in ('approved') then 'approved'
      when status in ('rejected', 'closed', 'cancelled', 'canceled') then 'rejected'
      when status in ('pending_review', 'paid', 'submitted') then 'pending_review'
      else 'pending_transfer'
    end
    where status is null
      or status not in ('pending_transfer', 'pending_review', 'approved', 'rejected');

    alter table public.shop_orders
    drop constraint if exists shop_orders_status_check;

    alter table public.shop_orders
    add constraint shop_orders_status_check
    check (status in ('pending_transfer', 'pending_review', 'approved', 'rejected'));
  end if;
end $$;

do $$
begin
  if to_regclass('public.signup_leads') is not null then
    alter table public.signup_leads
    add column if not exists amount_text text default '';

    alter table public.signup_leads
    add column if not exists transfer_last_five text default '';

    alter table public.signup_leads
    drop constraint if exists signup_leads_source_check;

    alter table public.signup_leads
    add constraint signup_leads_source_check
    check (source in ('anniversary_4th', 'group_class', 'course_payment'));

    alter table public.signup_leads
    add column if not exists payment_submitted_at timestamptz;

    alter table public.signup_leads
    add column if not exists reminder_sent_at timestamptz;

    alter table public.signup_leads
    add column if not exists reviewed_at timestamptz;

    alter table public.signup_leads
    add column if not exists review_note text default '';

    alter table public.signup_leads
    alter column status set default 'pending_transfer';

    update public.signup_leads
    set status = case
      when status in ('confirmed', 'approved') then 'approved'
      when status in ('closed', 'rejected') then 'rejected'
      when status in ('pending_review', 'contacted') then 'pending_review'
      else 'pending_transfer'
    end
    where status is null
      or status not in ('pending_transfer', 'pending_review', 'approved', 'rejected');

    alter table public.signup_leads
    drop constraint if exists signup_leads_status_check;

    alter table public.signup_leads
    add constraint signup_leads_status_check
    check (status in ('pending_transfer', 'pending_review', 'approved', 'rejected'));
  end if;
end $$;
