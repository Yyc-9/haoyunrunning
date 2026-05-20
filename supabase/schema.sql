-- Good Luck Running initial Supabase schema
-- Run this file in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'coach', 'admin');
create type public.feedback_status as enum ('new', 'flagged', 'reviewed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  name text not null default '',
  email text not null default '',
  phone text default '',
  program text default '',
  goal text default '',
  pb text default '',
  avatar_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (coach_id, student_id)
);

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  week_number integer not null,
  week_start date not null,
  workout_date date not null,
  day_label text not null,
  title text not null,
  target text not null,
  pace text default '',
  note text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_feedback (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid references public.training_plans(id) on delete set null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  completed_at timestamptz not null default now(),
  distance_km numeric(6, 2),
  duration_text text default '',
  pace_text text default '',
  average_heart_rate integer,
  rpe integer check (rpe between 1 and 10),
  feeling text default '',
  status public.feedback_status not null default 'new',
  coach_note text default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.training_feedback(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text default '',
  content_type text default '',
  created_at timestamptz not null default now()
);

create table public.coach_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger training_plans_set_updated_at
before update on public.training_plans
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

create or replace function public.is_coach_of(coach_id uuid, student_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coach_students
    where coach_students.coach_id = is_coach_of.coach_id
      and coach_students.student_id = is_coach_of.student_id
      and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.coach_students enable row level security;
alter table public.training_plans enable row level security;
alter table public.training_feedback enable row level security;
alter table public.feedback_attachments enable row level security;
alter table public.coach_invites enable row level security;

create policy "profiles_select_own_or_coach_or_admin"
on public.profiles for select
using (
  id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1 from public.coach_students
    where coach_students.coach_id = auth.uid()
      and coach_students.student_id = profiles.id
      and active = true
  )
);

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_admin_update"
on public.profiles for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "coach_students_select_related"
on public.coach_students for select
using (
  coach_id = auth.uid()
  or student_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "coach_students_admin_write"
on public.coach_students for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "training_plans_select_related"
on public.training_plans for select
using (
  student_id = auth.uid()
  or coach_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "training_plans_coach_write"
on public.training_plans for all
using (
  coach_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  coach_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "training_feedback_select_related"
on public.training_feedback for select
using (
  student_id = auth.uid()
  or coach_id = auth.uid()
  or public.is_coach_of(auth.uid(), student_id)
  or public.is_admin(auth.uid())
);

create policy "training_feedback_student_insert"
on public.training_feedback for insert
with check (
  student_id = auth.uid()
  and (
    coach_id is null
    or public.is_coach_of(coach_id, auth.uid())
  )
);

create policy "training_feedback_student_update_own_unreviewed"
on public.training_feedback for update
using (student_id = auth.uid() and status <> 'reviewed')
with check (student_id = auth.uid());

create policy "training_feedback_coach_review"
on public.training_feedback for update
using (
  coach_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  coach_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "feedback_attachments_select_related"
on public.feedback_attachments for select
using (
  student_id = auth.uid()
  or exists (
    select 1 from public.training_feedback
    where training_feedback.id = feedback_attachments.feedback_id
      and (
        training_feedback.coach_id = auth.uid()
        or public.is_coach_of(auth.uid(), training_feedback.student_id)
      )
  )
  or public.is_admin(auth.uid())
);

create policy "feedback_attachments_student_insert"
on public.feedback_attachments for insert
with check (student_id = auth.uid());

create policy "coach_invites_admin_all"
on public.coach_invites for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "coach_invites_select_unused_for_signed_in"
on public.coach_invites for select
using (
  auth.uid() is not null
  and used_by is null
  and (expires_at is null or expires_at > now())
);

insert into storage.buckets (id, name, public)
values ('training-feedback', 'training-feedback', false)
on conflict (id) do nothing;

create policy "training_feedback_storage_read_own"
on storage.objects for select
using (
  bucket_id = 'training-feedback'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "training_feedback_storage_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'training-feedback'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create index coach_students_coach_id_idx on public.coach_students (coach_id);
create index coach_students_student_id_idx on public.coach_students (student_id);
create index training_plans_student_date_idx on public.training_plans (student_id, workout_date desc);
create index training_feedback_coach_status_idx on public.training_feedback (coach_id, status, created_at desc);
create index training_feedback_student_created_idx on public.training_feedback (student_id, created_at desc);
