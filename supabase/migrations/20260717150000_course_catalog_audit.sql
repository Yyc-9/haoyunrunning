create table if not exists public.course_catalog_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('delete_empty_course_authorized')),
  season_id uuid references public.course_seasons(id) on delete set null,
  course_slug text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists course_catalog_audit_season_created_idx
on public.course_catalog_audit_log (season_id, created_at desc);

create index if not exists course_catalog_audit_actor_created_idx
on public.course_catalog_audit_log (actor_profile_id, created_at desc);

alter table public.course_catalog_audit_log enable row level security;
revoke all on table public.course_catalog_audit_log from public, anon, authenticated;
grant all on table public.course_catalog_audit_log to service_role;
