begin;

update public.course_season_courses as course
set
  course_slug = 'hsinchu-morning-run-wednesday',
  course_data = jsonb_build_object(
    'active', true,
    'name', '2026 好運跑步訓練營 X 週三新竹早鳥班',
    'weekday', '週三',
    'location', '新竹',
    'period', '7/8 - 9/30',
    'classTime', '05:37',
    'meetingPoint', '竹市體育場',
    'feeNote', '費用與名額請透過 Instagram 諮詢',
    'targetAudience', '適合業餘跑者、目標賽事備賽者、追求 PB 的進階與菁英跑者。',
    'focus', '晨間訓練、耐力建立、穩定輸出',
    'signupUrl', ''
  )
from public.course_seasons as season
where course.season_id = season.id
  and season.code = '2026-Q3'
  and course.course_slug = 'hsinchu-early-bird-wednesday';

update public.signup_leads as lead
set
  course_slug = 'hsinchu-morning-run-wednesday',
  preferred_course = '2026 好運跑步訓練營 X 週三新竹早鳥班'
from public.course_seasons as season
where lead.season_id = season.id
  and season.code = '2026-Q3'
  and lead.source = 'course_payment'
  and lead.course_slug = 'hsinchu-early-bird-wednesday';

update public.course_season_courses as course
set
  course_slug = 'taipei-morning-run-saturday',
  course_data = jsonb_build_object(
    'active', true,
    'name', '2026 好運跑步訓練營 X 週六台北早鳥班',
    'weekday', '週六',
    'location', '台北',
    'period', '7/11 - 9/19',
    'classTime', '06:37',
    'meetingPoint', '台大田徑場',
    'feeNote', '費用與名額請透過 Instagram 諮詢',
    'targetAudience', '適合業餘跑者、目標賽事備賽者、追求 PB 的進階與菁英跑者。',
    'focus', '晨間團練、長距離基礎與賽事準備',
    'signupUrl', ''
  )
from public.course_seasons as season
where course.season_id = season.id
  and season.code = '2026-Q3'
  and course.course_slug = 'taipei-early-bird-saturday';

update public.signup_leads as lead
set
  course_slug = 'taipei-morning-run-saturday',
  preferred_course = '2026 好運跑步訓練營 X 週六台北早鳥班'
from public.course_seasons as season
where lead.season_id = season.id
  and season.code = '2026-Q3'
  and lead.source = 'course_payment'
  and lead.course_slug = 'taipei-early-bird-saturday';

commit;
