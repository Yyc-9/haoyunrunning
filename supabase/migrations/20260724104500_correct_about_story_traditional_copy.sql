update public.site_content
set value = jsonb_set(value, '{titleHighlight}', '"真正喜歡上跑步。"'::jsonb, true)
where key = 'about_content'
  and value ->> 'titleHighlight' = '真正喜欢上跑步。';
