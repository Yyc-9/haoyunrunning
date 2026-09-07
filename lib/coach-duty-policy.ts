export type CoachDutyAttendanceState =
  | 'upcoming'
  | 'check_in_open'
  | 'on_time'
  | 'late'
  | 'not_checked_in'
  | 'substitute_absent'
  | 'cancelled'
  | 'missing_start_time'
  | 'leave_approved'

export type CoachDutyWindowPhase = 'upcoming' | 'open' | 'closed' | 'missing'

export function coachDutyActionCoachId(input: {
  action: 'check_in' | 'request_leave'
  actualCoachId: string
  isAdmin?: boolean
  scheduledCoachId: string
  userId?: string
}) {
  if (input.action === 'check_in') {
    return input.actualCoachId
      && (input.isAdmin || input.actualCoachId === input.userId)
      ? input.actualCoachId
      : null
  }

  return input.scheduledCoachId
    && (input.isAdmin || input.scheduledCoachId === input.userId)
    ? input.scheduledCoachId
    : null
}

export function canCoachViewCheckInControl(input: {
  cancelled: boolean
  actualCoachId: string
  isAdmin?: boolean
  userId?: string
  scheduledCoachId: string
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
}) {
  return !input.cancelled
    && Boolean(input.actualCoachId)
    && (input.isAdmin || (Boolean(input.userId) && input.actualCoachId === input.userId))
    && !(input.leaveStatus === 'approved' && input.actualCoachId === input.scheduledCoachId)
}

export function canCoachRequestLeave(input: {
  cancelled: boolean
  isAdmin?: boolean
  scheduledCoachId: string
  userId?: string
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
  substituteResponse: 'none' | 'pending' | 'accepted' | 'rejected'
  hasCheckin: boolean
  windowPhase?: CoachDutyWindowPhase
}) {
  if (input.windowPhase && (input.windowPhase === 'closed' || input.windowPhase === 'missing') && !input.isAdmin) return false
  return !input.cancelled
    && (input.isAdmin || input.scheduledCoachId === input.userId)
    && (
      input.leaveStatus === 'none'
      || (input.leaveStatus === 'requested' && input.substituteResponse === 'rejected')
    )
    && !input.hasCheckin
}

/**
 * State guard shared by API transitions. The UI may be stale, so the server
 * must repeat these checks after loading the current assignment.
 */
export function canRequestLeaveAtState(input: {
  cancelled: boolean
  hasCheckin: boolean
  isAdmin?: boolean
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
  substituteResponse: 'none' | 'pending' | 'accepted' | 'rejected'
  windowPhase: CoachDutyWindowPhase
  hasReason?: boolean
}) {
  if (input.cancelled || input.hasCheckin) return false
  if (!(
    input.leaveStatus === 'none'
    || (input.leaveStatus === 'requested' && input.substituteResponse === 'rejected')
  )) return false
  if (input.windowPhase !== 'closed' && input.windowPhase !== 'missing') return true
  return Boolean(input.isAdmin && input.hasReason)
}

export function canReviewLeaveAtState(input: {
  cancelled: boolean
  hasCheckin: boolean
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
  decision: 'approved' | 'rejected'
  windowPhase: CoachDutyWindowPhase
  hasReason?: boolean
}) {
  if (input.cancelled || input.hasCheckin || input.leaveStatus !== 'requested') return false
  if (input.decision === 'rejected' && !input.hasReason) return false
  if ((input.windowPhase === 'closed' || input.windowPhase === 'missing') && !input.hasReason) return false
  return true
}

export function canChangeSubstituteAtState(input: {
  cancelled: boolean
  hasCheckin: boolean
  isAdmin?: boolean
  windowPhase: CoachDutyWindowPhase
  hasReason?: boolean
}) {
  if (input.cancelled || input.hasCheckin) return false
  if (input.windowPhase !== 'closed' && input.windowPhase !== 'missing') return true
  return Boolean(input.isAdmin && input.hasReason)
}

export function canRecordCoachCheckin(input: {
  cancelled: boolean
  hasCheckin: boolean
  actualCoachId: string
  scheduledCoachId: string
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
  isAdmin?: boolean
  userId?: string
  windowPhase: CoachDutyWindowPhase
}) {
  if (input.cancelled || input.hasCheckin || input.windowPhase !== 'open') return false
  if (!input.actualCoachId) return false
  if (input.leaveStatus === 'approved' && input.actualCoachId === input.scheduledCoachId) return false
  return Boolean(input.isAdmin || input.actualCoachId === input.userId)
}

function sessionStart(sessionDate: string, startTime: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null
  return new Date(`${sessionDate}T${startTime}:00+08:00`)
}

export function coachDutyWindow(
  sessionDate: string,
  startTime: string,
  now = new Date(),
): { startsAt: Date | null; opensAt: Date | null; closesAt: Date | null; phase: CoachDutyWindowPhase } {
  const startsAt = sessionStart(sessionDate, startTime)
  if (!startsAt) {
    return {
      startsAt: null,
      opensAt: null,
      closesAt: null,
      phase: 'missing' as const,
    }
  }

  const opensAt = new Date(startsAt.getTime() - 15 * 60_000)
  const closesAt = new Date(startsAt.getTime() + 15 * 60_000)
  const phase = now < opensAt ? 'upcoming' : now <= closesAt ? 'open' : 'closed'
  return { startsAt, opensAt, closesAt, phase }
}

export function coachDutyPunctuality(
  sessionDate: string,
  startTime: string,
  now = new Date(),
) {
  const window = coachDutyWindow(sessionDate, startTime, now)
  if (!window.startsAt || window.phase !== 'open') return null
  return now <= window.startsAt ? 'on_time' as const : 'late' as const
}

export function resolveCoachDutyAttendanceState(input: {
  sessionDate: string
  startTime: string
  now: Date
  checkedInPunctuality: 'on_time' | 'late' | null
  leaveApproved: boolean
  hasActualCoach: boolean
  isSubstitute: boolean
  cancelled: boolean
}): CoachDutyAttendanceState {
  if (input.cancelled) return 'cancelled'
  if (!input.startTime) return 'missing_start_time'
  if (input.checkedInPunctuality) return input.checkedInPunctuality
  if (input.leaveApproved && !input.hasActualCoach) return 'leave_approved'

  const window = coachDutyWindow(input.sessionDate, input.startTime, input.now)
  if (window.phase === 'upcoming') return 'upcoming'
  if (window.phase === 'open') return 'check_in_open'
  return input.isSubstitute ? 'substitute_absent' : 'not_checked_in'
}
