alter table public.coach_public_profiles
  add column if not exists verification_email text not null default '';

update public.coach_public_profiles
set verification_email = case coach_key
  when 'chenShengQi' then 'ooo5204@gmail.com'
  when 'wuPeiCi' then 'p0963132000@gmail.com'
  when 'wuWeiQiao' then 'irene.wu99@gmail.com'
  when 'liuChengEn' then 'bryan5331577@gmail.com'
  when 'xiaoHe' then 'melanie.haarring@gmail.com'
  when 'yangShengHao' then 'oysteryang925@gmail.com'
  when 'bianbian' then 'ten878588@gmail.com'
  when 'zhouXianFeng' then 'k5595152@gmail.com'
  when 'zhongLiChen' then '100085@sdt.cles.tyc.edu.tw'
  when 'luoPeiCi' then 'rainbow523024@gmail.com'
  when 'yongXin' then 'yungshin611@gmail.com'
  when 'zhengYiQun' then 'mars871007@gmail.com'
  when 'luoMinYao' then 'erty445665@gmail.com'
  else verification_email
end
where coach_key in (
  'chenShengQi',
  'wuPeiCi',
  'wuWeiQiao',
  'liuChengEn',
  'xiaoHe',
  'yangShengHao',
  'bianbian',
  'zhouXianFeng',
  'zhongLiChen',
  'luoPeiCi',
  'yongXin',
  'zhengYiQun',
  'luoMinYao'
);

insert into public.coach_public_profiles (
  coach_key,
  display_name,
  verification_email,
  published
)
values
  ('shiXinDi', '史昕娣教練', 'sandy95916@gmail.com', false),
  ('huangLiLun', '黃立倫教練', 'allen951213@gmail.com', false),
  ('daiJiaHui', '戴嘉惠教練', 'judy29017186@gmail.com', false)
on conflict (coach_key) do update
set
  display_name = excluded.display_name,
  verification_email = excluded.verification_email;

alter table public.coach_public_profiles
  add constraint coach_public_profiles_verification_email_format
  check (
    verification_email = lower(btrim(verification_email))
    and (
      verification_email = ''
      or verification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

create unique index if not exists coach_public_profiles_verification_email_key
  on public.coach_public_profiles (lower(verification_email))
  where verification_email <> '';

comment on column public.coach_public_profiles.verification_email is
  'Private allowlisted login email that may redeem the one-time invite for this public coach identity.';

insert into public.coach_invites (code, coach_key, expires_at)
select
  'HYCOACH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  profile.coach_key,
  now() + interval '30 days'
from public.coach_public_profiles profile
where profile.coach_key in ('shiXinDi', 'huangLiLun', 'daiJiaHui')
  and profile.owner_profile_id is null
on conflict (coach_key) do nothing;
