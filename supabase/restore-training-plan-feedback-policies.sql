-- Restore RLS policies required for coach-assigned plans and student feedback.

-- Students must be able to read their assigned plans; coaches/admins can read/write their plans.
drop policy if exists "profiles_select_own_or_coach_or_admin" on public.profiles;
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

drop policy if exists "coach_students_select_related" on public.coach_students;
create policy "coach_students_select_related"
on public.coach_students for select
using (
  coach_id = auth.uid()
  or student_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "training_plans_select_related" on public.training_plans;
create policy "training_plans_select_related"
on public.training_plans for select
using (
  student_id = auth.uid()
  or coach_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "training_plans_coach_write" on public.training_plans;
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

-- Students can submit feedback for their own plan; bound coaches can see and review it.
drop policy if exists "training_feedback_student_insert" on public.training_feedback;
create policy "training_feedback_student_insert"
on public.training_feedback for insert
with check (
  student_id = auth.uid()
  and (
    coach_id is null
    or public.is_coach_of(coach_id, auth.uid())
  )
);

drop policy if exists "training_feedback_student_update_own_unreviewed" on public.training_feedback;
create policy "training_feedback_student_update_own_unreviewed"
on public.training_feedback for update
using (student_id = auth.uid() and status <> 'reviewed')
with check (student_id = auth.uid());

drop policy if exists "training_feedback_coach_review" on public.training_feedback;
create policy "training_feedback_coach_review"
on public.training_feedback for update
using (
  coach_id = auth.uid()
  or public.is_coach_of(auth.uid(), student_id)
  or public.is_admin(auth.uid())
)
with check (
  coach_id = auth.uid()
  or public.is_coach_of(auth.uid(), student_id)
  or public.is_admin(auth.uid())
);
