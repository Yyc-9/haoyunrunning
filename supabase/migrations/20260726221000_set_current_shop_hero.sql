-- Point the managed shop hero at the current approved public asset.
-- Keep the JSON object intact so all other administrator-managed fields survive.

update public.site_content
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{shopHero}',
  '"/site-visuals/hero-2026/shop-hero-02.jpg"'::jsonb,
  true
)
where key = 'page_media';
