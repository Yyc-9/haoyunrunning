export type StudentCheckin = {
  enrollment_id: string
  course_season_course_id: string
  session_date: string
  checked_in_at: string
}

// Server and UI share a conservative window; the database enforces it again.
export function studentCheckinOpen(date: string, startTime: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}/.test(startTime)) return false
  const start = new Date(`${date}T${startTime.slice(0, 5)}:00+08:00`).getTime()
  return Number.isFinite(start) && now.getTime() >= start - 15 * 60_000 && now.getTime() <= start + 15 * 60_000
}

export function attendanceVerification(checkedIn: boolean, coachStatus?: string) {
  if (checkedIn && coachStatus === 'present') return '雙方已確認'
  if (checkedIn && coachStatus && coachStatus !== 'present') return '紀錄不一致，待核對'
  if (checkedIn) return '學員已簽到，待教練確認'
  if (coachStatus === 'present') return '教練已確認，學員未簽到'
  return '尚未雙重確認'
}
