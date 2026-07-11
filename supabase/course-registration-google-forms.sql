-- Google Forms course registration sync and capacity-safe approval.

alter table public.signup_leads
add column if not exists course_slug text not null default '';

alter table public.signup_leads
add column if not exists external_submission_id text;

alter table public.signup_leads
add column if not exists form_submitted_at timestamptz;

create unique index if not exists signup_leads_external_submission_id_key
on public.signup_leads (external_submission_id)
where external_submission_id is not null;

create index if not exists signup_leads_course_status_idx
on public.signup_leads (course_slug, status, created_at desc)
where source = 'course_payment';

create or replace function public.approve_course_enrollment(
  p_lead_id uuid,
  p_review_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lead public.signup_leads%rowtype;
  v_paid_count integer;
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

  perform pg_advisory_xact_lock(hashtextextended(v_lead.course_slug, 0));

  select count(*)::integer
  into v_paid_count
  from public.signup_leads
  where source = 'course_payment'
    and course_slug = v_lead.course_slug
    and status = 'approved'
    and id <> p_lead_id;

  if v_paid_count >= 40 then
    raise exception 'course capacity reached';
  end if;

  update public.signup_leads
  set
    status = 'approved',
    reviewed_at = now(),
    review_note = coalesce(p_review_note, ''),
    updated_at = now()
  where id = p_lead_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

revoke all on function public.approve_course_enrollment(uuid, text) from public;
revoke all on function public.approve_course_enrollment(uuid, text) from anon;
revoke all on function public.approve_course_enrollment(uuid, text) from authenticated;
grant execute on function public.approve_course_enrollment(uuid, text) to service_role;

-- Used coach codes are intentionally ephemeral and should not remain in admin lists.
delete from public.coach_invites where used_at is not null;
