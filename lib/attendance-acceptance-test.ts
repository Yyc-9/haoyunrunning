export const ATTENDANCE_ACCEPTANCE_TEST = {
  enabled: true,
  key: 'attendance-acceptance-2026-07-25',
  courseName: '網站驗收測試',
  dateLabel: '7 月 25 日',
  timeLabel: '09:00–12:00',
  timeZoneLabel: 'UTC+8',
  startsAt: '2026-07-25T09:00:00+08:00',
  endsAt: '2026-07-25T12:00:00+08:00',
  visibleUntil: '2026-07-26T00:00:00+08:00',
} as const

export type AcceptanceTestPhase = 'upcoming' | 'open' | 'closed' | 'hidden'
export type AcceptanceParticipantRole = 'coach' | 'student'

type AcceptanceTestWindow = typeof ATTENDANCE_ACCEPTANCE_TEST & { enabled: boolean }

export function acceptanceTestPhase(
  now = new Date(),
  test: AcceptanceTestWindow = ATTENDANCE_ACCEPTANCE_TEST
): AcceptanceTestPhase {
  if (!test.enabled) return 'hidden'
  const timestamp = now.getTime()
  if (timestamp < new Date(test.startsAt).getTime()) return 'upcoming'
  if (timestamp <= new Date(test.endsAt).getTime()) return 'open'
  if (timestamp < new Date(test.visibleUntil).getTime()) return 'closed'
  return 'hidden'
}

export function canSubmitAcceptanceCheckIn(input: {
  now?: Date
  alreadyCheckedIn: boolean
  test?: AcceptanceTestWindow
}) {
  return acceptanceTestPhase(input.now, input.test) === 'open' && !input.alreadyCheckedIn
}
