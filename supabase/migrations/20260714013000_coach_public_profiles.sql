create table if not exists public.coach_public_profiles (
  coach_key text primary key,
  owner_profile_id uuid unique references public.profiles(id) on delete set null,
  display_name text not null,
  nickname text not null default '',
  role_title text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  full_body_image_url text not null default '',
  avatar_focus_x smallint not null default 50 check (avatar_focus_x between 0 and 100),
  avatar_focus_y smallint not null default 18 check (avatar_focus_y between 0 and 100),
  full_body_focus_x smallint not null default 50 check (full_body_focus_x between 0 and 100),
  full_body_focus_y smallint not null default 18 check (full_body_focus_y between 0 and 100),
  specialties jsonb not null default '[]'::jsonb check (jsonb_typeof(specialties) = 'array'),
  style text not null default '',
  achievements jsonb not null default '[]'::jsonb check (jsonb_typeof(achievements) = 'array'),
  certifications jsonb not null default '[]'::jsonb check (jsonb_typeof(certifications) = 'array'),
  profile_initialized boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_public_profiles_key_format check (coach_key ~ '^[A-Za-z0-9-]{1,80}$')
);

drop trigger if exists coach_public_profiles_set_updated_at on public.coach_public_profiles;
create trigger coach_public_profiles_set_updated_at
before update on public.coach_public_profiles
for each row execute function public.set_updated_at();

alter table public.coach_public_profiles enable row level security;
revoke all on public.coach_public_profiles from anon, authenticated;
grant all on public.coach_public_profiles to service_role;

insert into public.coach_public_profiles (coach_key, display_name)
values
  ('chenShengQi', '總教練 陳盛琦'),
  ('liuChengEn', '劉丞恩教練'),
  ('wuPeiCi', '吳珮慈教練'),
  ('bianbian', '扁扁教練'),
  ('wuWeiQiao', '鄔惟喬教練'),
  ('luoPeiCi', '羅珮慈教練'),
  ('laiXinHong', '賴信宏教練'),
  ('zhouXianFeng', '周賢峰教練'),
  ('yangShengHao', '楊陞豪教練'),
  ('luoMinYao', '羅閔耀教練'),
  ('xiaoHe', '赫嵐妮助教'),
  ('zhongLiChen', '鍾立宸助教'),
  ('zhengYiQun', '鄭以群助教'),
  ('yongXin', '詠馨助教')
on conflict (coach_key) do nothing;

update public.coach_public_profiles
set owner_profile_id = (select id from public.profiles where lower(email) = 'ooo5204@gmail.com' limit 1)
where coach_key = 'chenShengQi'
  and exists (select 1 from public.profiles where lower(email) = 'ooo5204@gmail.com');

update public.coach_public_profiles
set owner_profile_id = (select id from public.profiles where lower(email) = 'p0963132000@gmail.com' limit 1)
where coach_key = 'wuPeiCi'
  and exists (select 1 from public.profiles where lower(email) = 'p0963132000@gmail.com');

comment on table public.coach_public_profiles is
  'Server-managed public coach profile overrides. Course pages resolve assigned coach keys through this table.';
