with target as (
  select profile_id
  from public.internal_test_accounts
  where email = '779374913@qq.com'
), suspended as (
  select coalesce(jsonb_agg(cs.id order by cs.created_at), '[]'::jsonb) as binding_ids
  from public.coach_students cs
  join target on target.profile_id = cs.student_id or target.profile_id = cs.coach_id
  where cs.active = true
)
update public.internal_test_accounts ita
set sandbox_state = jsonb_set(
      ita.sandbox_state,
      '{suspendedCoachStudentBindingIds}',
      suspended.binding_ids,
      true
    ),
    updated_at = now()
from suspended
where ita.email = '779374913@qq.com';

update public.coach_students
set active = false
where active = true
  and (
    coach_id = (select profile_id from public.internal_test_accounts where email = '779374913@qq.com')
    or student_id = (select profile_id from public.internal_test_accounts where email = '779374913@qq.com')
  );
