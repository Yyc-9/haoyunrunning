create table public.admin_student_notes (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now()
);
create table public.admin_student_details_audit (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  previous_data jsonb not null,
  next_data jsonb not null,
  created_at timestamptz not null default now()
);
create index admin_student_details_audit_student_idx on public.admin_student_details_audit(student_id,created_at desc,id);
alter table public.admin_student_notes enable row level security;
alter table public.admin_student_details_audit enable row level security;
revoke all on public.admin_student_notes, public.admin_student_details_audit from public, anon, authenticated;
grant select,insert,update on public.admin_student_notes to service_role;
grant select,insert on public.admin_student_details_audit to service_role;

create function public.admin_student_details(p_actor_id uuid,p_student_id uuid,p_changes jsonb default null,p_reason text default '',p_fingerprint text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_actor jsonb;
  v_profile public.profiles%rowtype;
  v_note public.admin_student_notes%rowtype;
  v_before jsonb;
  v_next jsonb;
  v_fingerprint text;
begin
  v_actor := public.resolve_account_role(p_actor_id);
  if v_actor is null or v_actor->>'role'<>'admin' then raise exception 'admin_required'; end if;
  -- Serializes first-note insertion as well as edits from different admins.
  perform pg_advisory_xact_lock(hashtextextended('admin_student_details:'||p_student_id::text,0));
  select * into v_profile from public.profiles where id=p_student_id for update;
  if not found or v_profile.role<>'student' then raise exception 'student_not_found'; end if;
  select * into v_note from public.admin_student_notes where student_id=p_student_id for update;
  v_before:=jsonb_build_object('id',v_profile.id,'email',v_profile.email,'name',coalesce(v_profile.name,''),
    'phone',coalesce(v_profile.phone,''),'pb',coalesce(v_profile.pb,''),'goal',coalesce(v_profile.goal,''),
    'adminNote',coalesce(v_note.note,''),'profileUpdatedAt',v_profile.updated_at,'noteUpdatedAt',v_note.updated_at);
  v_fingerprint:=md5(v_before::text);
  if p_changes is null then
    return jsonb_build_object('student',v_before,'fingerprint',v_fingerprint,
      'audit',coalesce((select jsonb_agg(to_jsonb(x)) from (
        select a.id,a.reason,a.created_at,p.name as actor_name from public.admin_student_details_audit a
        left join public.profiles p on p.id=a.actor_id where a.student_id=p_student_id order by a.created_at desc,a.id limit 20
      ) x),'[]'::jsonb));
  end if;
  if p_fingerprint is null or p_fingerprint<>v_fingerprint then raise exception 'student_details_changed'; end if;
  if btrim(coalesce(p_reason,''))='' or length(p_reason)>800 then raise exception 'student_reason_required'; end if;
  if jsonb_typeof(p_changes) is distinct from 'object'
    or (select count(*) from jsonb_object_keys(p_changes))<>5
    or exists(select 1 from jsonb_each(p_changes) e where e.key not in ('name','phone','pb','goal','adminNote') or jsonb_typeof(e.value)<>'string')
    or btrim(coalesce(p_changes->>'name',''))=''
    or length(p_changes->>'name')>120 or length(p_changes->>'phone')>80
    or length(p_changes->>'pb')>120 or length(p_changes->>'goal')>300 or length(p_changes->>'adminNote')>2000 then
    raise exception 'invalid_student_details';
  end if;
  update public.profiles set name=btrim(p_changes->>'name'),phone=btrim(p_changes->>'phone'),
    pb=btrim(p_changes->>'pb'),goal=btrim(p_changes->>'goal') where id=p_student_id;
  insert into public.admin_student_notes(student_id,note) values(p_student_id,btrim(p_changes->>'adminNote'))
  on conflict(student_id) do update set note=excluded.note,updated_at=now();
  v_next:=jsonb_build_object('id',v_profile.id,'email',v_profile.email,'name',btrim(p_changes->>'name'),
    'phone',btrim(p_changes->>'phone'),'pb',btrim(p_changes->>'pb'),'goal',btrim(p_changes->>'goal'),'adminNote',btrim(p_changes->>'adminNote'));
  insert into public.admin_student_details_audit(student_id,actor_id,reason,previous_data,next_data)
  values(p_student_id,p_actor_id,btrim(p_reason),v_before,v_next);
  return jsonb_build_object('saved',true,'student',v_next);
end;
$$;
revoke all on function public.admin_student_details(uuid,uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.admin_student_details(uuid,uuid,jsonb,text,text) to service_role;
