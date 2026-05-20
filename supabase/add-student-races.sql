-- Add student race goals for accepted lottery races.

create table if not exists public.student_races (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  race_name text not null,
  location text not null default '',
  country text not null default '',
  race_date date,
  distance text not null default '',
  status text not null default 'accepted' check (status in ('accepted', 'planned', 'completed')),
  source text not null default 'catalog' check (source in ('catalog', 'custom')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger student_races_set_updated_at
before update on public.student_races
for each row execute function public.set_updated_at();

alter table public.student_races enable row level security;

create policy "student_races_select_related"
on public.student_races for select
using (
  student_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.is_coach_of(auth.uid(), student_id)
);

create policy "student_races_student_insert"
on public.student_races for insert
with check (student_id = auth.uid());

create policy "student_races_student_update_own"
on public.student_races for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "student_races_student_delete_own"
on public.student_races for delete
using (student_id = auth.uid());

create index if not exists student_races_student_date_idx
on public.student_races (student_id, race_date asc, created_at desc);
