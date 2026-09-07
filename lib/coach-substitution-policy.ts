export type DirectSubstituteResponse = 'accepted' | 'rejected'
export type ScheduledCoachRole = 'head_coach' | 'coach' | 'assistant'

export function createLeaveRequest(input: {
  scheduledCoachId: string
  scheduledCoachRole: ScheduledCoachRole
  invitedCoachId?: string
  reason: string
  requestedAt: string
}) {
  if (!input.reason.trim()) throw new Error('請填寫請假原因。')
  if (input.invitedCoachId && input.invitedCoachId === input.scheduledCoachId) throw new Error('不能邀請自己代班。')

  const hasInvitation = Boolean(input.invitedCoachId)
  return {
    leave_status: 'requested' as const,
    leave_reason: input.reason.trim(),
    leave_requested_at: input.requestedAt,
    recommended_substitute_id: input.invitedCoachId || null,
    substitute_coach_id: input.invitedCoachId || null,
    substitute_response: hasInvitation ? 'pending' as const : 'none' as const,
    substitute_responded_at: null,
    // Keep the original coach responsible until leave is approved and a
    // replacement is confirmed by the administrator.
    actual_coach_id: input.scheduledCoachId,
    coach_role: input.scheduledCoachRole,
    admin_status: hasInvitation ? 'not_required' as const : 'pending' as const,
    admin_reason: '',
  }
}

export function createDirectSubstituteInvitation(input: {
  scheduledCoachId: string
  scheduledCoachRole: ScheduledCoachRole
  invitedCoachId: string
  reason: string
  requestedAt: string
}) {
  if (!input.invitedCoachId) throw new Error('請選擇要邀請的代班教練。')
  return createLeaveRequest(input)
}

export function respondToDirectSubstituteInvitation(input: {
  scheduledCoachId: string
  scheduledCoachRole: ScheduledCoachRole
  invitedCoachId: string
  respondingCoachId: string
  response: DirectSubstituteResponse
  respondedAt: string
}) {
  if (input.respondingCoachId !== input.invitedCoachId) {
    throw new Error('只有受邀教練可以回覆代班邀請。')
  }

  if (input.response === 'accepted') {
    return {
      leave_status: 'approved' as const,
      substitute_response: 'accepted' as const,
      substitute_responded_at: input.respondedAt,
      actual_coach_id: input.invitedCoachId,
      coach_role: 'substitute' as const,
      admin_status: 'not_required' as const,
      admin_reason: '',
    }
  }

  return {
    leave_status: 'requested' as const,
    substitute_response: 'rejected' as const,
    substitute_responded_at: input.respondedAt,
    actual_coach_id: input.scheduledCoachId,
    coach_role: input.scheduledCoachRole,
    admin_status: 'not_required' as const,
    admin_reason: '',
  }
}
