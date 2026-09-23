import { coachRegistrationFields } from './coach-registration'

type StudentRow = {
  id: string; active: boolean; created_at: string
  student: { id: string; name: string; email: string; program: string | null; goal: string | null; pb: string | null } | null
  enrollments: { id: string; courseName: string; fields: ReturnType<typeof coachRegistrationFields>; status?: string }[]
  recentFeedback: unknown[]
  pendingReview?: boolean
}
const text = (value: unknown) => typeof value === 'string' ? value : ''

/** Pending cards use scoped registration data, never grant profile/attendance access. */
export function appendPendingStudents(students: StudentRow[], enrollments: Record<string, unknown>[]) {
  const result = students.map(row => ({ ...row, enrollments: [...row.enrollments] }))
  const byEmail = new Map(result.filter(row => row.student?.email).map(row => [row.student!.email.trim().toLowerCase(), row]))
  for (const lead of enrollments.filter(lead => lead.status === 'pending_review')) {
    const email = text(lead.email).trim().toLowerCase()
    let row = email ? byEmail.get(email) : undefined
    if (!row) {
      const id = `pending-${text(lead.id)}`
      row = { id, active: false, pendingReview: true, created_at: text(lead.created_at),
        student: { id, name: text(lead.name), email: text(lead.email), program: text(lead.preferred_course), goal: text(lead.goal), pb: null },
        enrollments: [], recentFeedback: [] }
      result.push(row)
      if (email) byEmail.set(email, row)
    }
    row.enrollments.push({ id: text(lead.id), courseName: text(lead.preferred_course), status: 'pending_review', fields: coachRegistrationFields(lead) })
    if (row.pendingReview && row.student) row.student.program = [...new Set(row.enrollments.map(item => item.courseName))].join('、')
  }
  return result
}
