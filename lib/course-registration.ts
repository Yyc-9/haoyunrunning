import { isPaymentOrderStatus, type PaymentOrderStatus } from '@/lib/payment'

export const COURSE_CAPACITY = 40

export type CourseAvailability = {
  courseSlug: string
  capacity: number
  paidCount: number
  pendingReviewCount: number
  remaining: number
  full: boolean
}

export type LegacyStudentStatus = {
  matched: boolean
  name: string
}

export type MyCourseEnrollment = {
  id: string
  courseSlug: string
  courseName: string
  status: PaymentOrderStatus
  amountText: string
  billingStartSessionDate: string
  priorAttendanceClaimed: boolean
  attendanceVerificationStatus: string
  transferLastFive: string
  reviewNote: string
  createdAt: string
  paymentSubmittedAt: string | null
}

export function courseEnrollmentPayload(row: Record<string, unknown>): MyCourseEnrollment {
  const status = String(row.status ?? 'pending_transfer')

  return {
    id: String(row.id ?? ''),
    courseSlug: String(row.course_slug ?? ''),
    courseName: String(row.preferred_course ?? ''),
    status: isPaymentOrderStatus(status) ? status : 'pending_transfer',
    amountText: String(row.amount_text ?? ''),
    billingStartSessionDate: String(row.billing_start_session_date ?? ''),
    priorAttendanceClaimed: row.prior_attendance_claimed === true,
    attendanceVerificationStatus: String(row.attendance_verification_status ?? 'not_required'),
    transferLastFive: String(row.transfer_last_five ?? ''),
    reviewNote: String(row.review_note ?? ''),
    createdAt: String(row.created_at ?? ''),
    paymentSubmittedAt: row.payment_submitted_at ? String(row.payment_submitted_at) : null,
  }
}
