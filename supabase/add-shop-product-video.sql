alter table public.shop_products
add column if not exists video text not null default '';

update public.shop_products
set
  image = '/products/goodluck-cap/cap-front.jpeg',
  video = '/products/goodluck-cap/goodluck-cap-promo.mp4'
where id = '3';
