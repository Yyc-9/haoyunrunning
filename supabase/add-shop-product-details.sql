alter table public.shop_products
  add column if not exists summary text not null default '',
  add column if not exists description text not null default '',
  add column if not exists gallery jsonb not null default '[]'::jsonb,
  add column if not exists highlights jsonb not null default '[]'::jsonb,
  add column if not exists specifications jsonb not null default '[]'::jsonb,
  add column if not exists usage_notes jsonb not null default '[]'::jsonb,
  add column if not exists external_url text not null default '';

update public.shop_products
set
  summary = '好運跑班團隊競速背心，提供兩款配色與 XS 至 XL 尺寸。',
  description = '適合團練、賽事與日常跑步穿著的好運跑班團隊背心。可依喜好選擇紫電白或曜黑藍款式，並在下單前確認需要的尺寸。',
  gallery = '["/goodluck-running-vest.jpg","/goodluck-running-vest-black.jpg"]'::jsonb,
  highlights = '["兩款團隊配色","XS 至 XL 尺寸","團練與賽事皆可穿著"]'::jsonb,
  specifications = '[{"label":"款式","value":"紫電白、曜黑藍"},{"label":"尺寸","value":"XS、S、M、L、XL"}]'::jsonb,
  usage_notes = '["請依商品頁尺寸選項下單。","清洗與保養方式以商品實際洗標為準。"]'::jsonb
where id = '1';

update public.shop_products
set
  summary = '好運跑班團隊 T 恤，提供 XS 至 XL 尺寸選擇。',
  description = '把好運跑班識別帶進團練與日常穿搭。商品頁可直接查看圖片、售價、庫存與可選尺寸。',
  gallery = '["/goodluck-running-tee.jpg"]'::jsonb,
  highlights = '["好運跑班團隊設計","XS 至 XL 尺寸","適合團練與日常穿著"]'::jsonb,
  specifications = '[{"label":"尺寸","value":"XS、S、M、L、XL"}]'::jsonb,
  usage_notes = '["請依商品頁尺寸選項下單。","清洗與保養方式以商品實際洗標為準。"]'::jsonb
where id = '2';

update public.shop_products
set
  summary = '黑色好運跑步帽，正面好運刺繡、側面閃電圖樣與背面馬蹄識別。',
  description = '適合跑步、運動與日常休閒搭配的好運跑班帽款。商品圖完整呈現正面、側面、背面與實際配戴效果。',
  gallery = '["/products/goodluck-cap/cap-front.jpeg","/products/goodluck-cap/cap-side.jpeg","/products/goodluck-cap/cap-back.png","/products/goodluck-cap/cap-model-front.png","/products/goodluck-cap/cap-model-side.png","/products/goodluck-cap/cap-model-back.png"]'::jsonb,
  highlights = '["正面好運刺繡","側面閃電圖樣","背面馬蹄識別","提供實際配戴圖片"]'::jsonb,
  specifications = '[{"label":"顏色","value":"黑色"},{"label":"尺寸","value":"S/M、L/XL"}]'::jsonb,
  usage_notes = '["請依頭圍與商品尺寸選項選購。","清潔與保養方式以商品實際標示為準。"]'::jsonb
where id = '3';

update public.shop_products
set
  summary = '33 × 70 公分好運運動毛巾，適合團練、比賽與運動後使用。',
  description = '以好運跑班品牌識別製作的運動毛巾，尺寸清楚、方便放入訓練包，適合日常訓練與賽事攜帶。',
  gallery = '["/products/goodluck-towel/goodluck-towel.jpeg"]'::jsonb,
  highlights = '["33 × 70 公分","好運跑班品牌圖樣","訓練與賽事方便攜帶"]'::jsonb,
  specifications = '[{"label":"尺寸","value":"33 × 70 公分"}]'::jsonb,
  usage_notes = '["首次使用前建議先清洗。","清洗與保養方式以商品實際標示為準。"]'::jsonb
where id = '4';

update public.shop_products
set
  summary = '每包 50 mL、含 42 g 碳水化合物與 170 kcal 的蜂蜜檸檬能量膠。',
  description = 'CALBOMB 蜂蜜檸檬能量膠採用蜂蜜配方，官方標示葡萄糖與果糖比例為 5:2，並取得 2024 A.A. 無添加驗證。適合依個人補給策略安排於訓練或賽事中使用。',
  gallery = '["/calbomb-energy-gel.png"]'::jsonb,
  highlights = '["每包 42 g 碳水化合物","每包 170 kcal","50 mL 包裝","2024 A.A. 無添加驗證"]'::jsonb,
  specifications = '[{"label":"容量","value":"50 mL"},{"label":"碳水化合物","value":"42 g / 包"},{"label":"熱量","value":"170 kcal / 包"},{"label":"風味","value":"蜂蜜檸檬"}]'::jsonb,
  usage_notes = '["請依個人訓練、賽事與飲食需求安排補給。","食品資訊、過敏原與保存方式以商品包裝標示為準。"]'::jsonb,
  external_url = 'https://calbomb.com/calbomb-honey-energy-gel/'
where id = '5';

update public.shop_products
set
  summary = '好運跑班衝鋒衣，提供 XS 至 XL 尺寸選擇。',
  description = '好運跑班團隊外套款式。可在商品頁查看主圖、影片、售價、庫存與目前可選尺寸，再依需求加入購物車。',
  gallery = jsonb_build_array(image),
  highlights = '["好運跑班團隊設計","XS 至 XL 尺寸","提供商品影片"]'::jsonb,
  specifications = '[{"label":"尺寸","value":"XS、S、M、L、XL"}]'::jsonb,
  usage_notes = '["請依商品頁尺寸選項下單。","材質、機能與保養方式以商品實際標示為準。"]'::jsonb
where id = 'product-37b34f5a-f80e-4c8c-8c42-d0dc5ae63bc8';
