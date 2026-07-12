import type { PaymentOrderStatus } from '@/lib/payment'

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
  transferLastFive: string
  reviewNote: string
  createdAt: string
  paymentSubmittedAt: string | null
}
