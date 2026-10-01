import { buildCoachRosterCourses, type CoachRosterPayload } from './coach-roster'

const seasonId = 'demo-season'
const courses = [
  { id: 'demo-class-a', slug: 'demo-a', name: '26Q4 週二台北 PB 班' },
  { id: 'demo-class-b', slug: 'demo-b', name: '26Q4 週三竹北夜跑班' },
  { id: 'demo-class-c', slug: 'demo-c', name: '26Q4 週四竹南初階班' },
]
const registrations = [
  ['林小晴', 'approved', 'demo-class-a', '年底半馬穩定跑進 2 小時'],
  ['陳宇安', 'pending_review', 'demo-class-a', '建立每週三次的跑步習慣'],
  ['黃以辰', 'pending_transfer', 'demo-class-a', '輕鬆完成第一場 10 公里'],
  ['王品涵', 'approved', 'demo-class-b', '全馬配速與肌力訓練'],
  ['測試退回紀錄', 'rejected', 'demo-class-a', ''],
  ['許子晴', 'approved', 'demo-class-c', ''],
  ['李承恩', 'pending_transfer', 'demo-class-c', ''],
].map(([name, status, courseId, goal], index) => ({
  id: `demo-${index}`, source: 'course_payment', season_id: seasonId,
  course_season_course_id: courseId, course_slug: courses.find(course => course.id === courseId)!.slug,
  name, status, goal, email: `runner${index + 1}@example.com`, phone: '0900-000-000',
  preferred_course: courses.find(course => course.id === courseId)!.name,
  payload: { lineId: 'demo-runner', recentGoal: goal, emergencyContactName: '測試聯絡人', emergencyContactPhone: '0900-111-111' },
}))
export const coachRosterPreview: CoachRosterPayload = {
  seasons: [{ id: seasonId, code: '2026-Q4', name: '2026 第四季', status: 'enrolling', isCurrent: true }],
  selectedSeasonId: seasonId,
  courses: buildCoachRosterCourses({ seasonId, courses, ownCourseIds: ['demo-class-a', 'demo-class-b'], registrations, ownDetails: registrations,
    formalProfiles: [{ email: 'runner1@example.com', pb: '半馬 02:08:36', recentFeedback: [{
      id: 'demo-feedback', created_at: '2026-10-01T00:00:00Z', distance_km: 6, pace_text: '6:15',
      average_heart_rate: 145, rpe: 5, feeling: '今天的節奏跑很順利，後半段能維持穩定呼吸。', status: 'new',
    }] }],
  }),
}
