-- Keep every published team portrait framed around the upper body while
-- preserving extra headroom for the two source photos that sit highest.
update public.coach_public_profiles
set full_body_focus_y = case
  when coach_key in ('bianbian', 'zhengYiQun') then 6
  else 10
end
where coach_key in (
  'chenShengQi',
  'liuChengEn',
  'wuPeiCi',
  'bianbian',
  'wuWeiQiao',
  'luoPeiCi',
  'laiXinHong',
  'zhouXianFeng',
  'yangShengHao',
  'luoMinYao',
  'xiaoHe',
  'zhongLiChen',
  'zhengYiQun',
  'yongXin'
);

-- This account was created for internal verification and should not appear in
-- the public team roster or the course coach selector for now.
update public.coach_public_profiles
set published = false
where coach_key = 'account-e08b5f94b53642ab84559d450ebba845';
