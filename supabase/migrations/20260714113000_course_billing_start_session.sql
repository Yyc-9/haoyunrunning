alter table public.signup_leads
add column if not exists billing_start_session_date date;

alter table public.signup_leads
add column if not exists prior_attendance_claimed boolean not null default false;

alter table public.signup_leads
add column if not exists attendance_verification_status text not null default 'not_required'
check (attendance_verification_status in ('not_required', 'pending', 'verified', 'rejected'));

create index if not exists signup_leads_billing_start_idx
on public.signup_leads (season_id, course_slug, billing_start_session_date, created_at desc)
where source = 'course_payment';

create or replace function public.approve_course_enrollment(
  p_lead_id uuid,
  p_review_note text default ''
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_lead public.signup_leads%rowtype;
  v_paid_count integer;
  v_capacity integer;
  v_lock_key text;
  v_result public.signup_leads%rowtype;
begin
  select *
  into v_lead
  from public.signup_leads
  where id = p_lead_id
    and source = 'course_payment'
  for update;

  if not found then
    raise exception 'course enrollment not found';
  end if;

  if v_lead.status = 'approved' then
    return to_jsonb(v_lead);
  end if;

  if coalesce(v_lead.course_slug, '') = '' then
    raise exception 'course slug is missing';
  end if;

  select capacity
  into v_capacity
  from public.course_season_courses
  where id = v_lead.course_season_course_id;

  v_capacity := greatest(coalesce(v_capacity, v_lead.course_capacity, 40), 1);
  v_lock_key := coalesce(v_lead.season_id::text, 'legacy') || ':' || v_lead.course_slug;
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

  select count(*)::integer
  into v_paid_count
  from public.signup_leads
  where source = 'course_payment'
    and season_id is not distinct from v_lead.season_id
    and course_slug = v_lead.course_slug
    and status = 'approved'
    and id <> p_lead_id;

  if v_paid_count >= v_capacity then
    raise exception 'course capacity reached';
  end if;

  update public.signup_leads
  set
    status = 'approved',
    course_capacity = v_capacity,
    attendance_verification_status = case
      when coalesce(v_lead.prior_attendance_claimed, false) then 'verified'
      else coalesce(v_lead.attendance_verification_status, 'not_required')
    end,
    reviewed_at = now(),
    review_note = coalesce(p_review_note, ''),
    updated_at = now()
  where id = p_lead_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

revoke all on function public.approve_course_enrollment(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_course_enrollment(uuid, text) to service_role;
