create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

alter table public.site_content enable row level security;

revoke all on table public.site_content from anon, authenticated;
grant select, insert, update, delete on table public.site_content to service_role;

drop policy if exists "site_content_service_role_all" on public.site_content;
create policy "site_content_service_role_all"
on public.site_content for all
to service_role
using (true)
with check (true);

create index if not exists site_content_updated_by_idx
on public.site_content (updated_by);

insert into public.site_content (key, value)
values
  (
    'hero_slides',
    '["/20250605[好運]三周年慶-7089.jpg","/20250605[好運]三周年慶-7096.jpg","/LINE_ALBUM_四週年手機桌布_260515_1.jpg"]'::jsonb
  ),
  (
    'home_activities',
    '[{"title":"好運跑班 4 週年活動","description":"留下 4 週年活動參加意向，方便我們掌握現場人數與後續聯絡。","action":"活動報名","href":"/anniversary"},{"title":"團練報名","description":"每週六開放式團練意向登記，方便教練掌握現場人數。","action":"填寫團練意向","href":"/group-signup"}]'::jsonb
  ),
  (
    'seasonal_update',
    '{"active":false,"period":"","title":"","summary":"","body":"","href":"","linkLabel":"了解更多"}'::jsonb
  ),
  ('course_overrides', '{}'::jsonb)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
