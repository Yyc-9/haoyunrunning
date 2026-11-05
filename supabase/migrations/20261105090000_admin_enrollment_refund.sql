-- Refund registration releases a seat without deleting payment or attendance history.
create table public.admin_enrollment_refund_audit (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.signup_leads(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 1 and 800),
  previous_data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.admin_enrollment_refund_audit enable row level security;
revoke all on public.admin_enrollment_refund_audit from public, anon, authenticated;
grant select, insert on public.admin_enrollment_refund_audit to service_role;

create function private.guard_refunded_enrollment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.registration_status is distinct from 'cancelled'
    and exists(select 1 from public.admin_enrollment_refund_audit where enrollment_id=old.id) then
    raise exception '此報名已登記退費退班，不能由表格同步或其他操作恢復占位。';
  end if;
  return new;
end;
$$;
create trigger guard_refunded_enrollment before update on public.signup_leads
for each row execute function private.guard_refunded_enrollment();

create function public.admin_refund_enrollment(
  p_actor_id uuid, p_enrollment_id uuid, p_reason text default '', p_fingerprint text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_lead public.signup_leads%rowtype;
  v_fingerprint text;
  v_season_status text;
begin
  if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then
    raise exception '只有超級管理員可以登記退費退班。';
  end if;
  select * into v_lead from public.signup_leads where id=p_enrollment_id for update;
  if not found or v_lead.source is distinct from 'course_payment'
    or v_lead.registration_status is distinct from 'active' or v_lead.status is distinct from 'approved' then
    raise exception '只能為有效且已確認入帳的課程報名登記退費退班。';
  end if;
  select status into v_season_status from public.course_seasons where id=v_lead.season_id for share;
  if v_season_status is null or v_season_status not in ('active','enrolling') then
    raise exception '只能在招生中或進行中的季度辦理退費退班。';
  end if;
  v_fingerprint := md5(to_jsonb(v_lead)::text);
  if p_fingerprint is null then
    return jsonb_build_object('fingerprint',v_fingerprint,'studentName',v_lead.name,
      'courseName',v_lead.preferred_course,'amountText',v_lead.amount_text);
  end if;
  if p_fingerprint is distinct from v_fingerprint then raise exception '報名資料已變更，請重新預覽。'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 800 then raise exception '請填寫退費退班原因。'; end if;
  insert into public.admin_enrollment_refund_audit(enrollment_id,actor_id,reason,previous_data)
    values(v_lead.id,p_actor_id,btrim(p_reason),to_jsonb(v_lead));
  update public.signup_leads set registration_status='cancelled', updated_at=now()
    where id=v_lead.id;
  return jsonb_build_object('withdrawn',true,'enrollmentId',v_lead.id,'releasedSeats',1);
end;
$$;
revoke all on function public.admin_refund_enrollment(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_refund_enrollment(uuid,uuid,text,text) to service_role;
