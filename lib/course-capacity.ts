// Submitted enrollments hold seats before payment approval; returned records release them.
export const SEAT_HOLDING_STATUSES = ['pending_transfer', 'pending_review', 'approved'] as const

export function courseSeatAvailability(capacity: number, registeredCount: number) {
  return { registeredCount, remaining: Math.max(0, capacity - registeredCount), full: registeredCount >= capacity }
}
