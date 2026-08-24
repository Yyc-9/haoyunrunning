-- Correct the confirmed identity mismatch for Wu Pei-Ci's public photos.
-- Both paths point to original photos from the source folder named 珮慈.

update public.coach_public_profiles
set avatar_url = '/coaches/2026/avatars/wu-pei-ci.jpg',
    full_body_image_url = '/coaches/2026/wu-pei-ci.jpg',
    updated_at = now()
where coach_key = 'wuPeiCi';
