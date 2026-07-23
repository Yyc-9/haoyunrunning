-- Backfill the controls used by the current public page layouts.
-- The defaults are placed on the left so any administrator-maintained value wins.

insert into public.site_content (key, value)
values (
  'courses_page_content',
  '{
    "heroLabel": "訓練日程",
    "heroTitle": "訓練日程表",
    "heroDescription": "先看適合對象、訓練目標、時間地點與報名方式，不進入詳情頁也能初步判斷是否適合。",
    "guideLabel": "REGISTRATION GUIDE",
    "guideTitle": "如何加入課程？",
    "guideSteps": [
      {"title": "查看本期課表", "description": "先依照星期、城市與上課時間，找到能穩定參加的班級。"},
      {"title": "進入課程詳情", "description": "點擊課表中的課程卡片，確認訓練方向、教練與適合對象。"},
      {"title": "填寫專屬報名表", "description": "在課程詳情最下方點擊「立即報名」，登入後完成資料與計費確認。"},
      {"title": "完成匯款與核對", "description": "依網站顯示的金額完成匯款並提交後五碼，財務核對後即完成報名。"}
    ]
  }'::jsonb
)
on conflict (key) do update
set value = excluded.value || coalesce(public.site_content.value, '{}'::jsonb);

insert into public.site_content (key, value)
values (
  'home_content',
  '{"coursesCtaLabel":"查看完整課表"}'::jsonb
)
on conflict (key) do update
set value = excluded.value || coalesce(public.site_content.value, '{}'::jsonb);

insert into public.site_content (key, value)
values (
  'about_content',
  '{
    "heroEyebrow": "OUR PHILOSOPHY",
    "heroBrandName": "好運跑班",
    "heroEnglishTitle": "A great place builds great runners.",
    "heroChineseTitle": "好的環境，創造出好的運動員。",
    "philosophies": [
      {"title": "專注速度能力與跑步經濟性", "english": "Precision Training. Smarter, Faster, Stronger.", "description": "不是追求更多公里，而是透過科學化訓練，提升速度能力與跑步經濟性，讓每一步都更有效率。"},
      {"title": "建立穩固的訓練基礎", "english": "Build the Base. Prepare for Your Best.", "description": "真正的進步，來自一季又一季穩定累積。用清楚的訓練節奏，讓每一次努力都能銜接賽事目標。"},
      {"title": "每位跑者都值得被看見", "english": "Every Runner Matters.", "description": "依班級人數配置專屬教練，確保每位學員都能獲得足夠的指導與回饋。"}
    ]
  }'::jsonb
)
on conflict (key) do update
set value = excluded.value || coalesce(public.site_content.value, '{}'::jsonb);

insert into public.site_content (key, value)
values (
  'page_media',
  '{
    "homeCoursesHero": "/site-visuals/hero-2026/home-courses.webp",
    "aboutPageHero": "/site-visuals/hero-2026/about-track.webp",
    "coursesHero": "/site-visuals/hero-2026/home-courses.webp",
    "teamHero": "/site-visuals/hero-2026/team-hero.webp"
  }'::jsonb
)
on conflict (key) do update
set value = excluded.value || coalesce(public.site_content.value, '{}'::jsonb);

update public.site_content
set value = jsonb_set(
  value,
  '{aboutStoryHero}',
  coalesce(value -> 'aboutStoryHero', value -> 'aboutHero', '"/goodluck-fourth-anniversary-wallpaper.jpg"'::jsonb),
  true
)
where key = 'page_media';
