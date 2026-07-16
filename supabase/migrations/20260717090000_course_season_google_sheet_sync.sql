create table if not exists public.course_season_sync_sources (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.course_seasons(id) on delete cascade,
  provider text not null default 'google_sheets'
    check (provider in ('google_sheets')),
  external_id text not null,
  source_url text not null,
  active boolean not null default true,
  last_synced_at timestamptz,
  last_result jsonb not null default '{}'::jsonb,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, provider),
  unique (provider, external_id),
  check (external_id ~ '^[A-Za-z0-9_-]{10,200}$'),
  check (jsonb_typeof(last_result) = 'object')
);

create index if not exists course_season_sync_sources_active_idx
on public.course_season_sync_sources (active, season_id);

drop trigger if exists course_season_sync_sources_set_updated_at on public.course_season_sync_sources;
create trigger course_season_sync_sources_set_updated_at
before update on public.course_season_sync_sources
for each row execute function public.set_updated_at();

alter table public.course_season_sync_sources enable row level security;

revoke all on table public.course_season_sync_sources from anon, authenticated;
grant all on table public.course_season_sync_sources to service_role;

insert into public.course_season_sync_sources (
  season_id,
  provider,
  external_id,
  source_url,
  active
)
select
  season.id,
  'google_sheets',
  '1qYjpgbWt64wN9tWev8APmCd7ZieWcpQeNQuL8brr4lo',
  'https://docs.google.com/spreadsheets/d/1qYjpgbWt64wN9tWev8APmCd7ZieWcpQeNQuL8brr4lo/edit',
  true
from public.course_seasons as season
where season.code = '2026-Q3'
on conflict (season_id, provider) do update
set
  external_id = excluded.external_id,
  source_url = excluded.source_url,
  active = true,
  updated_at = now();
