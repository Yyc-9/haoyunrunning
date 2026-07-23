-- Restore the former isolated sandbox account to its original student state.
-- Only bindings that were active immediately before sandbox isolation are restored.
with test_account as (
  select profile_id, sandbox_state
  from public.internal_test_accounts
  where lower(email) = '779374913@qq.com'
), suspended_bindings as (
  select jsonb_array_elements_text(
    coalesce(test_account.sandbox_state -> 'suspendedCoachStudentBindingIds', '[]'::jsonb)
  )::uuid as binding_id
  from test_account
)
update public.coach_students
set active = true
where id in (select binding_id from suspended_bindings);

update public.profiles
set role = 'student',
    updated_at = now()
where lower(email) = '779374913@qq.com';

delete from public.internal_test_accounts
where lower(email) = '779374913@qq.com';
