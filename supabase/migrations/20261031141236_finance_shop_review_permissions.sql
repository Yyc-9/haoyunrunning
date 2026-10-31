-- Only the server may execute this function. It needs narrowly scoped owner
-- privileges to check verified finance identity in auth.users.
alter function public.finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz) security definer;
alter function public.finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz) set search_path = public, pg_temp;
revoke all on function public.finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.finance_review_shop_order(uuid,uuid,text,text,boolean,timestamptz) to service_role;
