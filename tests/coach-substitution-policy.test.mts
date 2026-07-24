import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDirectSubstituteInvitation,
  respondToDirectSubstituteInvitation,
} from '../lib/coach-substitution-policy.ts'

test('原教練請假時可直接邀請另一位教練代班', () => {
  assert.deepEqual(
    createDirectSubstituteInvitation({
      scheduledCoachId: 'coach-a',
      scheduledCoachRole: 'coach',
      invitedCoachId: 'coach-b',
      reason: '當日有事',
      requestedAt: '2026-07-24T10:00:00.000Z',
    }),
    {
      leave_status: 'requested',
      leave_reason: '當日有事',
      leave_requested_at: '2026-07-24T10:00:00.000Z',
      recommended_substitute_id: 'coach-b',
      substitute_coach_id: 'coach-b',
      substitute_response: 'pending',
      substitute_responded_at: null,
      actual_coach_id: 'coach-a',
      coach_role: 'coach',
      admin_status: 'not_required',
      admin_reason: '',
    },
  )
})

test('受邀教練接受後自動成為實際授課教練且不需管理員確認', () => {
  assert.deepEqual(
    respondToDirectSubstituteInvitation({
      scheduledCoachId: 'coach-a',
      scheduledCoachRole: 'coach',
      invitedCoachId: 'coach-b',
      respondingCoachId: 'coach-b',
      response: 'accepted',
      respondedAt: '2026-07-24T11:00:00.000Z',
    }),
    {
      leave_status: 'approved',
      substitute_response: 'accepted',
      substitute_responded_at: '2026-07-24T11:00:00.000Z',
      actual_coach_id: 'coach-b',
      coach_role: 'substitute',
      admin_status: 'not_required',
      admin_reason: '',
    },
  )
})

test('受邀教練拒絕後仍保留原教練並可重新邀請', () => {
  assert.deepEqual(
    respondToDirectSubstituteInvitation({
      scheduledCoachId: 'coach-a',
      scheduledCoachRole: 'coach',
      invitedCoachId: 'coach-b',
      respondingCoachId: 'coach-b',
      response: 'rejected',
      respondedAt: '2026-07-24T11:00:00.000Z',
    }),
    {
      leave_status: 'requested',
      substitute_response: 'rejected',
      substitute_responded_at: '2026-07-24T11:00:00.000Z',
      actual_coach_id: 'coach-a',
      coach_role: 'coach',
      admin_status: 'not_required',
      admin_reason: '',
    },
  )
})

test('非受邀教練不能回覆代班邀請', () => {
  assert.throws(
    () => respondToDirectSubstituteInvitation({
      scheduledCoachId: 'coach-a',
      scheduledCoachRole: 'coach',
      invitedCoachId: 'coach-b',
      respondingCoachId: 'coach-c',
      response: 'accepted',
      respondedAt: '2026-07-24T11:00:00.000Z',
    }),
    /只有受邀教練可以回覆代班邀請/,
  )
})

test('等待回覆或拒絕時保留原教練角色', () => {
  const invitation = createDirectSubstituteInvitation({
    scheduledCoachId: 'assistant-a',
    scheduledCoachRole: 'assistant',
    invitedCoachId: 'coach-b',
    reason: '當日有事',
    requestedAt: '2026-07-24T10:00:00.000Z',
  })
  const rejection = respondToDirectSubstituteInvitation({
    scheduledCoachId: 'assistant-a',
    scheduledCoachRole: 'assistant',
    invitedCoachId: 'coach-b',
    respondingCoachId: 'coach-b',
    response: 'rejected',
    respondedAt: '2026-07-24T11:00:00.000Z',
  })

  assert.equal(invitation.coach_role, 'assistant')
  assert.equal(rejection.coach_role, 'assistant')
})
