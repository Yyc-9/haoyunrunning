-- Notification data is server-only. API routes authenticate and scope every read.
alter table public.signup_leads add column student_review_message text;
alter table public.signup_leads add column transfer_date date;

create table public.enrollment_followups (
  id uuid primary key,
  enrollment_id uuid not null references public.signup_leads(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  reason text not null check (reason in ('missing_info','unreported','amount_mismatch','other')),
  student_message text not null check (length(trim(student_message)) between 1 and 1000),
  internal_note text not null default '' check (length(internal_note) <= 1000),
  student_reply text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  email_status text not null default 'pending' check (email_status in ('pending','sending','sent','failed','skipped','expired')),
  email_first_attempt_at timestamptz,
  email_attempt_at timestamptz,
  email_error text,
  email_recipient text,
  email_payload jsonb
);
create unique index enrollment_followups_open_idx on public.enrollment_followups(enrollment_id) where responded_at is null;
create index enrollment_followups_history_idx on public.enrollment_followups(enrollment_id,created_at desc);
create index enrollment_followups_actor_idx on public.enrollment_followups(actor_id);
alter table public.enrollment_followups enable row level security;
revoke all on public.enrollment_followups from public,anon,authenticated;
grant all on public.enrollment_followups to service_role;

create table public.enrollment_notifications (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.signup_leads(id) on delete cascade,
  audience text not null check (audience in ('staff','student')),
  recipient_email text,
  kind text not null check (kind in ('new_enrollment','review_pending','payment_reported','supplement_requested','approved')),
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  check ((audience='staff' and recipient_email is null) or (audience='student' and recipient_email is not null))
);
create index enrollment_notifications_staff_idx on public.enrollment_notifications(created_at desc,id) where audience='staff';
create index enrollment_notifications_student_idx on public.enrollment_notifications(recipient_email,created_at desc,id) where audience='student';
create index enrollment_notifications_enrollment_idx on public.enrollment_notifications(enrollment_id);
alter table public.enrollment_notifications enable row level security;
revoke all on public.enrollment_notifications from public,anon,authenticated;
grant all on public.enrollment_notifications to service_role;

create table public.enrollment_notification_reads (
  notification_id uuid not null references public.enrollment_notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(notification_id,user_id)
);
create index enrollment_notification_reads_user_idx on public.enrollment_notification_reads(user_id,notification_id);
alter table public.enrollment_notification_reads enable row level security;
revoke all on public.enrollment_notification_reads from public,anon,authenticated;
grant all on public.enrollment_notification_reads to service_role;

create or replace function public.publish_enrollment_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_kind text; v_audience text; v_title text; v_message text;
begin
  if new.source is distinct from 'course_payment' then return new; end if;
  if tg_op='INSERT' then
    v_kind:='new_enrollment'; v_audience:='staff'; v_title:='有學生完成新報名';
    v_message:=case when new.status='pending_review' then '新報名已回報匯款，請核對。' else '新報名成立，請查看報名狀態。' end;
  elsif new.status is distinct from old.status then
    if new.status='pending_review' then
      v_kind:='payment_reported'; v_audience:='staff'; v_title:='匯款資料待核對';
      v_message:=case when old.status='rejected' then '學生已補交資料，請重新核對。' else '學生已回報匯款，請核對。' end;
      update public.enrollment_followups set responded_at=now(),student_reply=new.notes
        where enrollment_id=new.id and responded_at is null;
    elsif new.status='rejected' then
      v_kind:='supplement_requested'; v_audience:='student'; v_title:='你的報名需要補充資料';
      v_message:=coalesce(nullif(new.student_review_message,''),'匯款資料需要補充，請查看報名或聯絡財務。');
    elsif new.status='approved' then
      v_kind:='approved'; v_audience:='student'; v_title:='款項已確認入帳';
      v_message:='課程報名已確認，請留意後續課程通知。';
      update public.enrollment_followups set responded_at=now() where enrollment_id=new.id and responded_at is null;
    end if;
  end if;
  if v_kind is not null then
    insert into public.enrollment_notifications(enrollment_id,audience,recipient_email,kind,title,message)
    values(new.id,v_audience,case when v_audience='student' then lower(trim(new.email)) else null end,v_kind,v_title,v_message);
  end if;
  return new;
end $$;
revoke all on function public.publish_enrollment_notification() from public,anon,authenticated;
create trigger signup_lead_notifications after insert or update on public.signup_leads
for each row execute function public.publish_enrollment_notification();

-- Existing unfinished registrations also enter staff's queue; no historical emails are sent.
insert into public.enrollment_notifications(enrollment_id,audience,kind,title,message)
select l.id,'staff','review_pending','尚有報名待處理','請查看現有報名的核對與補件狀態。'
from public.signup_leads l join public.course_seasons s on s.id=l.season_id
where l.source='course_payment' and l.status in ('pending_transfer','pending_review','rejected') and s.status<>'archived';

create function public.request_enrollment_supplement(
  p_id uuid,p_enrollment_id uuid,p_actor_id uuid,p_reason text,p_message text,p_internal_note text,
  p_expected_status text,p_expected_submitted_at timestamptz
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_lead public.signup_leads; v_request public.enrollment_followups;
begin
  select * into v_lead from public.signup_leads where id=p_enrollment_id and source='course_payment' for update;
  if not found then raise exception 'enrollment_not_found'; end if;
  select * into v_request from public.enrollment_followups where id=p_id;
  if found then
    if v_request.enrollment_id<>p_enrollment_id or v_request.actor_id<>p_actor_id
       or v_request.student_message<>trim(p_message) or v_request.reason<>p_reason
       or v_request.internal_note<>trim(coalesce(p_internal_note,'')) then raise exception 'request_id_conflict'; end if;
    return to_jsonb(v_request);
  end if;
  perform 1 from public.course_seasons where id=v_lead.season_id and status<>'archived' for share;
  if not found then raise exception 'season_not_writable'; end if;
  if v_lead.status not in ('pending_transfer','pending_review','rejected') then raise exception 'enrollment_not_writable'; end if;
  if v_lead.status is distinct from p_expected_status or v_lead.payment_submitted_at is distinct from p_expected_submitted_at then
    raise exception 'enrollment_changed';
  end if;
  if exists(select 1 from public.enrollment_followups where enrollment_id=p_enrollment_id and responded_at is null) then
    raise exception 'supplement_already_requested';
  end if;
  insert into public.enrollment_followups(id,enrollment_id,actor_id,reason,student_message,internal_note)
    values(p_id,p_enrollment_id,p_actor_id,p_reason,trim(p_message),trim(coalesce(p_internal_note,''))) returning * into v_request;
  update public.signup_leads set status='rejected',student_review_message=trim(p_message),
    review_note=trim(coalesce(p_internal_note,'')),reviewed_at=now() where id=p_enrollment_id;
  -- An imported/bank-flagged row may already be rejected before a human writes the request.
  if v_lead.status='rejected' then
    insert into public.enrollment_notifications(enrollment_id,audience,recipient_email,kind,title,message)
      values(v_lead.id,'student',lower(trim(v_lead.email)),'supplement_requested','你的報名需要補充資料',trim(p_message));
  end if;
  return to_jsonb(v_request);
end $$;
revoke all on function public.request_enrollment_supplement(uuid,uuid,uuid,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.request_enrollment_supplement(uuid,uuid,uuid,text,text,text,text,timestamptz) to service_role;

create function public.submit_enrollment_supplement(
  p_enrollment_id uuid,p_email text,p_last_five text,p_transfer_date date,p_reply text,p_request_id uuid
) returns void language plpgsql security invoker set search_path='' as $$
declare v_lead public.signup_leads; v_request public.enrollment_followups;
begin
  select * into v_lead from public.signup_leads where id=p_enrollment_id and source='course_payment'
    and lower(trim(email))=lower(trim(p_email)) for update;
  if not found then raise exception 'enrollment_not_found'; end if;
  perform 1 from public.course_seasons where id=v_lead.season_id and status<>'archived' for share;
  if not found then raise exception 'season_not_writable'; end if;
  if v_lead.status not in ('pending_transfer','rejected') then raise exception 'enrollment_changed'; end if;
  if p_last_five !~ '^[0-9]{5}$' or p_last_five is null or p_transfer_date is null or p_transfer_date>(now() at time zone 'Asia/Taipei')::date
    then raise exception 'invalid_transfer'; end if;
  if length(coalesce(p_reply,''))>1000 or (v_lead.status='rejected' and length(trim(coalesce(p_reply,'')))=0)
    then raise exception 'invalid_reply'; end if;
  select * into v_request from public.enrollment_followups where enrollment_id=v_lead.id and responded_at is null;
  if v_request.id is distinct from p_request_id then raise exception 'enrollment_changed'; end if;
  update public.enrollment_followups set responded_at=now(),student_reply=trim(coalesce(p_reply,'')) where id=v_request.id;
  update public.signup_leads set transfer_last_five=p_last_five,transfer_date=p_transfer_date,
    notes=case when length(trim(coalesce(p_reply,'')))>0 then concat_ws(E'\n',nullif(v_lead.notes,''),'補充說明：'||trim(p_reply)) else v_lead.notes end,
    status='pending_review',payment_submitted_at=now() where id=v_lead.id;
end $$;
revoke all on function public.submit_enrollment_supplement(uuid,text,text,date,text,uuid) from public,anon,authenticated;
grant execute on function public.submit_enrollment_supplement(uuid,text,text,date,text,uuid) to service_role;

-- Per-account reads remain independent of business status. Count only authorized rows.
create function public.enrollment_notification_feed(p_user_id uuid,p_email text,p_staff boolean)
returns jsonb language sql stable security invoker set search_path='' as $$
  with visible as (
    select n.*,r.read_at from public.enrollment_notifications n
    join public.signup_leads l on l.id=n.enrollment_id
    left join public.enrollment_notification_reads r on r.notification_id=n.id and r.user_id=p_user_id
    where (p_staff and n.audience='staff') or (n.audience='student' and n.recipient_email=lower(trim(p_email)) and lower(trim(l.email))=lower(trim(p_email)))
  ), items as (select * from visible order by (read_at is null) desc,created_at desc,id limit 100)
  select jsonb_build_object('unreadCount',(select count(*) from visible where read_at is null),
    'items',coalesce((select jsonb_agg(to_jsonb(items) order by (read_at is null) desc,created_at desc,id) from items),'[]'::jsonb));
$$;
revoke all on function public.enrollment_notification_feed(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.enrollment_notification_feed(uuid,text,boolean) to service_role;

create function public.read_enrollment_notifications(p_user_id uuid,p_email text,p_staff boolean,p_ids uuid[])
returns void language sql security invoker set search_path='' as $$
  insert into public.enrollment_notification_reads(notification_id,user_id)
  select n.id,p_user_id from public.enrollment_notifications n join public.signup_leads l on l.id=n.enrollment_id
  where n.id=any(p_ids) and ((p_staff and n.audience='staff') or
    (n.audience='student' and n.recipient_email=lower(trim(p_email)) and lower(trim(l.email))=lower(trim(p_email))))
  on conflict do nothing;
$$;
revoke all on function public.read_enrollment_notifications(uuid,text,boolean,uuid[]) from public,anon,authenticated;
grant execute on function public.read_enrollment_notifications(uuid,text,boolean,uuid[]) to service_role;

create function public.claim_enrollment_followup_email(p_id uuid,p_recipient text,p_payload jsonb)
returns setof public.enrollment_followups language plpgsql security invoker set search_path='' as $$
declare v_row public.enrollment_followups;
begin
  select * into v_row from public.enrollment_followups where id=p_id for update;
  if not found or v_row.email_status='sent' or v_row.responded_at is not null then return; end if;
  if not exists(select 1 from public.signup_leads l join public.course_seasons s on s.id=l.season_id
    where l.id=v_row.enrollment_id and l.status='rejected' and s.status<>'archived' and lower(trim(l.email))=lower(trim(p_recipient))) then return; end if;
  if v_row.email_recipient is not null and v_row.email_recipient<>p_recipient then return; end if;
  -- Resend retains idempotency keys for 24 hours. Never retry an uncertain send beyond that window.
  if v_row.email_first_attempt_at < now()-interval '23 hours' then
    update public.enrollment_followups set email_status='expired',email_error='已超過安全重試時限，請人工確認郵件紀錄；站內通知仍有效。' where id=p_id;
    return;
  end if;
  if v_row.email_status='sending' and v_row.email_attempt_at > now()-interval '60 seconds' then return; end if;
  return query update public.enrollment_followups set email_status='sending',email_error=null,
    email_attempt_at=clock_timestamp(),email_first_attempt_at=coalesce(email_first_attempt_at,now()),
    email_recipient=coalesce(email_recipient,p_recipient),email_payload=coalesce(email_payload,p_payload)
    where id=p_id returning *;
end $$;
revoke all on function public.claim_enrollment_followup_email(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.claim_enrollment_followup_email(uuid,text,jsonb) to service_role;
