update public.profiles
set email = lower(btrim(email))
where email <> lower(btrim(email));

create unique index if not exists profiles_email_unique_ci_idx
on public.profiles (lower(email))
where btrim(email) <> '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, pb)
  values (
    new.id,
    lower(btrim(coalesce(new.email, ''))),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'pb', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
