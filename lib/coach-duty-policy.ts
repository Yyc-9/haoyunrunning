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

export function canCoachViewCheckInControl(input: {
  cancelled: boolean
  actualCoachId: string
  userId?: string
  scheduledCoachId: string
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
}) {
  return !input.cancelled
    && Boolean(input.userId)
    && input.actualCoachId === input.userId
    && !(input.leaveStatus === 'approved' && input.scheduledCoachId === input.userId)
}

export function canCoachRequestLeave(input: {
  cancelled: boolean
  scheduledCoachId: string
  userId?: string
  leaveStatus: 'none' | 'requested' | 'approved' | 'rejected'
  substituteResponse: 'none' | 'pending' | 'accepted' | 'rejected'
  hasCheckin: boolean
}) {
  return !input.cancelled
    && input.scheduledCoachId === input.userId
    && (
      input.leaveStatus === 'none'
      || (input.leaveStatus === 'requested' && input.substituteResponse === 'rejected')
    )
    && !input.hasCheckin
}

function sessionStart(sessionDate: string, startTime: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null
  return new Date(`${sessionDate}T${startTime}:00+08:00`)
}

export function coachDutyWindow(
  sessionDate: string,
  startTime: string,
  now = new Date(),
) {
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
