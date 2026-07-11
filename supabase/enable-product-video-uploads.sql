alter table public.shop_products
add column if not exists video text not null default '';

update storage.buckets
set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
where id = 'site-media';
