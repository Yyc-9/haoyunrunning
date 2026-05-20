-- Allow signed-in users to create their own profile row.
-- Run once in Supabase SQL Editor if profiles were not created for new users.

create policy if not exists "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

