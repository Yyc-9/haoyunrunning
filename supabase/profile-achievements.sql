-- Extended runner profiles and collectible achievement badges.

alter table public.profiles
add column if not exists nickname text not null default '';

alter table public.profiles
add column if not exists bio text not null default '';

alter table public.profiles
add column if not exists city text not null default '';

alter table public.profiles
add column if not exists running_since text not null default '';

alter table public.profiles
add column if not exists favorite_distance text not null default '';

alter table public.profiles
add column if not exists target_event text not null default '';

alter table public.profiles
add column if not exists instagram text not null default '';

create table if not exists public.achievement_badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  unlock_hint text not null default '',
  icon text not null default 'award',
  category text not null default '訓練',
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.achievement_badges(id) on delete cascade,
  reason text not null default '',
  awarded_by uuid references public.profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (profile_id, badge_id)
);

create index if not exists profile_achievements_profile_awarded_idx
on public.profile_achievements (profile_id, awarded_at desc);

alter table public.achievement_badges enable row level security;
alter table public.profile_achievements enable row level security;

drop policy if exists "achievement_badges_public_select" on public.achievement_badges;
create policy "achievement_badges_public_select"
on public.achievement_badges for select
to anon, authenticated
using (active = true);

drop policy if exists "profile_achievements_own_select" on public.profile_achievements;
create policy "profile_achievements_own_select"
on public.profile_achievements for select
to authenticated
using (
  profile_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
);

grant select on public.achievement_badges to anon, authenticated;
grant select on public.profile_achievements to authenticated;

insert into public.achievement_badges (slug, name, description, unlock_hint, icon, category, rarity, display_order)
values
  ('runner-profile', '跑者名片', '完成個人跑者資料，讓大家更認識你。', '填寫暱稱、城市與偏好距離', 'user-round', '帳戶', 'common', 10),
  ('first-course', '初次集結', '完成第一門好運跑班課程報名。', '第一筆課程付款核准後獲得', 'ticket-check', '課程', 'common', 20),
  ('first-feedback', '訓練回聲', '送出第一篇完整訓練回饋。', '完成第一次訓練回報', 'message-circle-heart', '訓練', 'common', 30),
  ('four-week-streak', '穩定四週', '連續四週留下訓練紀錄。', '連續四週完成訓練回報', 'calendar-check', '訓練', 'rare', 40),
  ('hundred-km', '百公里累積', '累積完成 100 公里訓練里程。', '網站訓練里程累積達 100 公里', 'route', '里程', 'rare', 50),
  ('first-finish', '初次完賽', '完成第一場正式目標賽事。', '由管理員確認完賽紀錄', 'medal', '賽事', 'rare', 60),
  ('pb-breakthrough', '突破 PB', '刷新自己的最佳成績。', '由管理員確認個人最佳成績', 'trophy', '賽事', 'epic', 70),
  ('team-spirit', '好運同行', '積極參與團練，陪伴夥伴一起進步。', '由教練或管理員授予', 'heart-handshake', '社群', 'epic', 80),
  ('full-cycle', '十二週全勤', '完整參與一個十二週訓練週期。', '完成一期課程全勤', 'crown', '課程', 'legendary', 90)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  unlock_hint = excluded.unlock_hint,
  icon = excluded.icon,
  category = excluded.category,
  rarity = excluded.rarity,
  display_order = excluded.display_order,
  active = true,
  updated_at = now();
