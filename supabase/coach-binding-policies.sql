-- Run this after the initial schema if you already created the project.
-- It lets a coach read feedback and attachments from students they are bound to,
-- even when older feedback rows do not yet have coach_id filled.

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

drop policy if exists "training_feedback_select_related" on public.training_feedback;

create policy "training_feedback_select_related"
on public.training_feedback
for select
using (
  student_id = auth.uid()
  or coach_id = auth.uid()
  or public.is_coach_of(auth.uid(), student_id)
  or public.is_admin(auth.uid())
);

drop policy if exists "feedback_attachments_select_related" on public.feedback_attachments;

create policy "feedback_attachments_select_related"
on public.feedback_attachments
for select
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
