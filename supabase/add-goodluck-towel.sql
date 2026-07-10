update public.shop_products
set
  name = '好運運動毛巾',
  category = '跑者配件',
  image = '/products/goodluck-towel/goodluck-towel.jpeg',
  video = '',
  tags = '["33 × 70 cm","訓練必備"]'::jsonb,
  variants = '[]'::jsonb,
  sizes = '["33 × 70 cm"]'::jsonb,
  active = true
where id = '4';
