create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where id = user_id
        and role = 'admin'
    );
$$;

create or replace function private.is_coach_of(coach_id uuid, student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (coach_id = auth.uid() or student_id = auth.uid())
    and exists (
      select 1
      from public.coach_students
      where coach_students.coach_id = is_coach_of.coach_id
        and coach_students.student_id = is_coach_of.student_id
        and active = true
    );
$$;

revoke all on function private.is_admin(uuid) from public;
revoke all on function private.is_coach_of(uuid, uuid) from public;
grant execute on function private.is_admin(uuid) to anon, authenticated, service_role;
grant execute on function private.is_coach_of(uuid, uuid) to anon, authenticated, service_role;

alter policy coach_students_select_related on public.coach_students
  using (
    coach_id = auth.uid()
    or student_id = auth.uid()
    or private.is_admin(auth.uid())
  );

alter policy feedback_attachments_select_related on public.feedback_attachments
  using (
    student_id = auth.uid()
    or exists (
      select 1
      from public.training_feedback
      where training_feedback.id = feedback_attachments.feedback_id
        and (
          training_feedback.coach_id = auth.uid()
          or private.is_coach_of(auth.uid(), training_feedback.student_id)
        )
    )
    or private.is_admin(auth.uid())
  );

alter policy profiles_select_own_or_coach_or_admin on public.profiles
  using (
    id = auth.uid()
    or private.is_admin(auth.uid())
    or exists (
      select 1
      from public.coach_students
      where coach_students.coach_id = auth.uid()
        and coach_students.student_id = profiles.id
        and coach_students.active = true
    )
  );

alter policy student_races_select_related on public.student_races
  using (
    student_id = auth.uid()
    or private.is_admin(auth.uid())
    or private.is_coach_of(auth.uid(), student_id)
  );

alter policy training_feedback_coach_review on public.training_feedback
  using (
    coach_id = auth.uid()
    or private.is_coach_of(auth.uid(), student_id)
    or private.is_admin(auth.uid())
  )
  with check (
    coach_id = auth.uid()
    or private.is_coach_of(auth.uid(), student_id)
    or private.is_admin(auth.uid())
  );

alter policy training_feedback_select_related on public.training_feedback
  using (
    student_id = auth.uid()
    or coach_id = auth.uid()
    or private.is_coach_of(auth.uid(), student_id)
    or private.is_admin(auth.uid())
  );

alter policy training_feedback_student_insert on public.training_feedback
  with check (
    student_id = auth.uid()
    and (
      coach_id is null
      or private.is_coach_of(coach_id, auth.uid())
    )
  );

alter policy training_plans_coach_write on public.training_plans
  using (
    coach_id = auth.uid()
    or private.is_admin(auth.uid())
  )
  with check (
    coach_id = auth.uid()
    or private.is_admin(auth.uid())
  );

alter policy training_plans_select_related on public.training_plans
  using (
    student_id = auth.uid()
    or coach_id = auth.uid()
    or private.is_admin(auth.uid())
  );

drop function public.is_admin(uuid);
drop function public.is_coach_of(uuid, uuid);
