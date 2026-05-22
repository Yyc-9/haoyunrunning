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

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  contact text not null,
  email text default '',
  fulfillment_note text default '',
  item_count integer not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  price integer not null default 0,
  image text default '',
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

create trigger shop_orders_set_updated_at
before update on public.shop_orders
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
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
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

create policy "shop_orders_select_own_or_admin"
on public.shop_orders for select
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "shop_orders_insert_own"
on public.shop_orders for insert
with check (user_id = auth.uid() or user_id is null);

create policy "shop_order_items_select_related"
on public.shop_order_items for select
using (
  exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.order_id
      and (
        shop_orders.user_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

create policy "shop_order_items_insert_related"
on public.shop_order_items for insert
with check (
  exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.order_id
      and (shop_orders.user_id = auth.uid() or shop_orders.user_id is null)
  )
);

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
create index shop_orders_user_created_idx on public.shop_orders (user_id, created_at desc);
create index shop_order_items_order_idx on public.shop_order_items (order_id);
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
