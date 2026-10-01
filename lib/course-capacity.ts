// Payment review and registration validity are independent. Supplement requests retain seats.
export const SEAT_HOLDING_STATUSES = ['pending_transfer', 'pending_review', 'approved', 'rejected'] as const
export type RegistrationStatus = 'active' | 'cancelled' | 'duplicate'
export function isActiveEnrollment(row: { status?: unknown; registration_status?: unknown }) {
  // Historical fixtures without the new column retain their old classification.
  return row.registration_status === 'active' || (!row.registration_status && row.status !== 'rejected')
}
export function courseSeatAvailability(capacity: number, registeredCount: number) {
  return { registeredCount, remaining: Math.max(0, capacity - registeredCount), full: registeredCount >= capacity }
}
