-- Keep course-detail avatars as dedicated 1:1 close-up assets.
-- Team portraits remain managed separately through full_body_image_url.
-- This migration is intentionally limited to the two confirmed overrides.

update public.coach_public_profiles
set avatar_url = case coach_key
  when 'bianbian' then '/coaches/2026/avatars/bianbian.jpg'
  when 'wuPeiCi' then '/coaches/2026/avatars/wu-pei-ci.jpg'
  else avatar_url
end,
updated_at = now()
where coach_key in ('bianbian', 'wuPeiCi');
