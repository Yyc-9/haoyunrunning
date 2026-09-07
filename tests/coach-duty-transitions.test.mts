import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('coach duty transition operation serializes the assignment and keeps the RPC server-only', async () => {
  const sql = await readFile(new URL('../supabase/operations/coach-duty-transitions.sql', import.meta.url), 'utf8')

  assert.match(sql, /from public\.coach_session_assignments\s+where id = p_assignment_id\s+for update/i)
  assert.match(sql, /from public\.coach_session_checkins\s+where assignment_id = v_assignment\.id\s+for update/i)
  assert.match(sql, /actor is not an enabled coach or admin/i)
  assert.match(sql, /substitute account is not an enabled coach or admin/i)
  assert.match(sql, /v_target_role is null or v_target_role not in/i)
  assert.match(sql, /v_response is null or v_response not in/i)
  assert.match(sql, /v_decision is null or v_decision not in/i)
  assert.match(sql, /v_state is null or v_state not in/i)
  assert.match(sql, /cancelled session cannot be marked as attended/i)
  assert.match(sql, /revoke all on function public\.apply_coach_duty_transition/i)
  assert.match(sql, /grant execute on function public\.apply_coach_duty_transition[\s\S]*to service_role/i)
  assert.match(sql, /v_managed_by_admin and v_reason = ''/i)
  assert.match(sql, /v_managed_by_admin,\s*case when v_managed_by_admin then p_actor_profile_id/i)
  assert.match(sql, /substitution invitation is stale/i)
  assert.match(sql, /substitution confirmation is stale/i)
  assert.match(sql, /leave_status in \('none', 'rejected'\) then 'approved'/i)
  assert.match(sql, /substitute_coach_id = case when v_decision = 'rejected' then null/i)
})

test('admin review_leave route uses the review guard for no-substitute and pending-invite requests', async () => {
  const route = await readFile(new URL('../app/api/admin/coach-duty/route.ts', import.meta.url), 'utf8')

  assert.match(route, /action === 'review_leave'/)
  assert.match(route, /canReviewLeaveAtState\(\{[\s\S]*leaveStatus: assignment\.leave_status,[\s\S]*decision: decision/)
  assert.doesNotMatch(route, /canRequestLeaveAtState/)
})

test('admin-owned actual coaching is treated as self check-in rather than admin proxy check-in', async () => {
  const route = await readFile(new URL('../app/api/coach/session-duty/route.ts', import.meta.url), 'utf8')
  const loader = await readFile(new URL('../lib/coach-session-duty.ts', import.meta.url), 'utf8')

  assert.match(route, /const managedByAdmin = Boolean\(auth\.isAdmin && auth\.user\.id !== assignment\.actual_coach_id\)/)
  assert.match(route, /if \(managedByAdmin && !reason\)/)
  assert.match(loader, /managedByAdmin: Boolean\(options\.isAdmin && \(!options\.userId \|\| options\.userId !== actualCoachId\)\)/)
})
