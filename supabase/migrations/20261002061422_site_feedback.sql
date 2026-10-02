-- Anonymous submissions pass through the rate-limited server API only.
create table public.site_feedback (
  id uuid primary key,
  category text not null check (category in ('網站使用問題','報名與繳費','課程與教練','意見建議')),
  description text not null check (char_length(description) between 5 and 2000),
  related text not null default '' check (char_length(related)<=100),
  source text not null default '/' check (char_length(source)<=200),
  device text not null default '電腦' check (device in ('手機','電腦')),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments)='array' and jsonb_array_length(attachments)<=3),
  status text not null default '待處理' check (status in ('待處理','處理中','已解決')),
  read_at timestamptz,
  note text not null default '' check (char_length(note)<=2000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_feedback_created_idx on public.site_feedback (created_at desc, id);
create index site_feedback_status_idx on public.site_feedback (status, created_at desc);
create index site_feedback_unread_idx on public.site_feedback (created_at desc) where read_at is null;
alter table public.site_feedback enable row level security;
revoke all on public.site_feedback from public, anon, authenticated;
grant select, insert, update, delete on public.site_feedback to service_role;

create table public.site_feedback_limits (
  key text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts>0)
);
alter table public.site_feedback_limits enable row level security;
revoke all on public.site_feedback_limits from public, anon, authenticated;
grant select, insert, update, delete on public.site_feedback_limits to service_role;

create function public.consume_feedback_quota(p_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare allowed integer;
begin
  if p_key !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from public.site_feedback_limits where window_start < now() - interval '2 days';
  insert into public.site_feedback_limits as limits (key,window_start,attempts)
  values (p_key,now(),1)
  on conflict (key) do update
    set attempts = case when limits.window_start < now()-interval '1 hour' then 1 else limits.attempts+1 end,
        window_start = case when limits.window_start < now()-interval '1 hour' then now() else limits.window_start end
    where limits.window_start < now()-interval '1 hour' or limits.attempts < 5
  returning attempts into allowed;
  return allowed is not null;
end $$;
revoke all on function public.consume_feedback_quota(text) from public, anon, authenticated;
grant execute on function public.consume_feedback_quota(text) to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('site-feedback','site-feedback',false,1048576,array['image/jpeg','image/png','image/webp']);
-- No storage object policies: only server service-role access and short-lived signed reads.

