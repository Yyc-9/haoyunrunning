-- Pickup is separate from payment and uses stable course-offering IDs.
alter table public.shop_orders
  add column if not exists pickup_course_id uuid references public.course_season_courses(id) on delete set null,
  add column if not exists pickup_class_name text not null default '',
  add column if not exists pickup_status text not null default 'pending',
  add column if not exists pickup_match_source text not null default 'unmatched',
  add column if not exists pickup_updated_by uuid references auth.users(id) on delete set null;
alter table public.shop_orders add constraint shop_orders_pickup_status_check check (pickup_status in ('pending','packed','collected'));

create table public.shop_pickup_audit (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.shop_orders(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  before_value jsonb not null,
  after_value jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.shop_pickup_audit enable row level security;
revoke all on public.shop_pickup_audit from anon, authenticated;
grant all on public.shop_pickup_audit to service_role;

-- Server-only lookup: never expose arbitrary-email membership queries publicly.
create or replace function public.shop_pickup_candidates(p_email text)
returns table(id uuid, name text)
language sql stable set search_path = public as $$
  select distinct c.id, s.code || ' ' || coalesce(nullif(c.course_data->>'name',''),c.course_slug)
  from public.signup_leads l
  join public.course_season_courses c on c.id=l.course_season_course_id
  join public.course_seasons s on s.id=c.season_id
  where l.source='course_payment' and lower(trim(l.email))=lower(trim(p_email))
    and nullif(trim(p_email),'') is not null
    and s.is_current and s.status in ('active','enrolling')
    and coalesce(l.registration_status,case when l.status='rejected' then 'cancelled' else 'active' end)='active'
  order by 2,1;
$$;

create or replace function public.create_shop_order_with_pickup(
  p_order_number text,p_user_id uuid,p_customer_name text,p_contact text,p_email text,
  p_fulfillment_note text,p_items jsonb,p_match_email text,p_pickup_course_id uuid,p_transfer_last_five text,
  p_require_selection boolean default false
) returns jsonb language plpgsql set search_path=public as $$
declare
  v_result jsonb; v_ids uuid[]; v_id uuid; v_name text := ''; v_source text := 'unmatched';
begin
  if p_transfer_last_five is null or p_transfer_last_five !~ '^[0-9]{5}$' then raise exception using errcode='22023',message='匯款後五碼無效。'; end if;
  select array_agg(id) into v_ids from public.shop_pickup_candidates(p_match_email);
  if p_pickup_course_id is not null then
    if not coalesce(p_pickup_course_id=any(v_ids),false) then
      raise exception using errcode='22023',message='取貨班級已變更，請重新確認。';
    end if;
    v_id := p_pickup_course_id; v_source := 'selected';
  elsif cardinality(v_ids)=1 then v_id := v_ids[1]; v_source := 'automatic';
  elsif cardinality(v_ids)>1 and p_require_selection then
    raise exception using errcode='22023',message='請選擇取貨班級。';
  end if;
  if v_id is not null then select name into v_name from public.shop_pickup_candidates(p_match_email) where id=v_id; end if;
  v_result := public.create_shop_order_with_specs(p_order_number,p_user_id,p_customer_name,p_contact,p_email,p_fulfillment_note,p_items);
  update public.shop_orders set pickup_course_id=v_id,pickup_class_name=coalesce(v_name,''),
    pickup_match_source=v_source,status='pending_review',transfer_last_five=p_transfer_last_five,
    payment_submitted_at=now(),payment_method='bank_transfer',payment_reference=p_order_number,
    payment_account_id=null,payment_account_label='好運跑班官方匯款帳戶'
    where id=(v_result->>'id')::uuid;
  return v_result || jsonb_build_object('status','pending_review');
end;
$$;

create or replace function public.admin_set_shop_pickup(
 p_actor_id uuid,p_order_id uuid,p_course_id uuid,p_status text,p_expected_updated_at timestamptz
) returns jsonb language plpgsql set search_path=public as $$
declare v_before public.shop_orders%rowtype; v_after public.shop_orders%rowtype; v_name text;
begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'admin_required'; end if;
 if p_status not in ('pending','packed','collected') or p_status is null then raise exception 'invalid_pickup_status'; end if;
 select * into v_before from public.shop_orders where id=p_order_id for update;
 if not found then raise exception 'order_not_found'; end if;
 if p_expected_updated_at is null or v_before.updated_at<>p_expected_updated_at then raise exception 'order_changed'; end if;
 if p_course_id is not null then
   select s.code || ' ' || coalesce(nullif(c.course_data->>'name',''),c.course_slug) into v_name
   from public.course_season_courses c join public.course_seasons s on s.id=c.season_id
   where c.id=p_course_id and (s.status in ('active','enrolling') or c.id=v_before.pickup_course_id);
   if not found then raise exception 'invalid_pickup_class'; end if;
   if p_course_id=v_before.pickup_course_id and v_before.pickup_class_name<>'' then v_name:=v_before.pickup_class_name; end if;
 end if;
 if p_status<>'pending' and p_course_id is null then raise exception 'pickup_requires_class'; end if;
 update public.shop_orders set pickup_course_id=p_course_id,pickup_class_name=coalesce(v_name,''),
   pickup_status=p_status,pickup_match_source='manual',pickup_updated_by=p_actor_id
   where id=p_order_id returning * into v_after;
 insert into public.shop_pickup_audit(order_id,actor_id,before_value,after_value)
 values(p_order_id,p_actor_id,
 jsonb_build_object('classId',v_before.pickup_course_id,'className',v_before.pickup_class_name,'status',v_before.pickup_status),
 jsonb_build_object('classId',v_after.pickup_course_id,'className',v_after.pickup_class_name,'status',v_after.pickup_status));
 return jsonb_build_object('id',v_after.id,'updatedAt',v_after.updated_at);
end;
$$;
revoke all on function public.shop_pickup_candidates(text) from public,anon,authenticated;
revoke all on function public.create_shop_order_with_pickup(text,uuid,text,text,text,text,jsonb,text,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.admin_set_shop_pickup(uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.shop_pickup_candidates(text) to service_role;
grant execute on function public.create_shop_order_with_pickup(text,uuid,text,text,text,text,jsonb,text,uuid,text,boolean) to service_role;
grant execute on function public.admin_set_shop_pickup(uuid,uuid,uuid,text,timestamptz) to service_role;

