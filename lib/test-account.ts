import 'server-only'

import type { User } from '@supabase/supabase-js'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { getManagedCourses } from '@/lib/managed-courses-server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const ISOLATED_TEST_ACCOUNT_EMAIL = '779374913@qq.com'
export type IsolatedTestMode = 'student' | 'coach'

export type IsolatedTestAccount = {
  profileId: string
  email: string
  active: boolean
  currentMode: IsolatedTestMode
  assignedCourseSlug: string
  sandboxState: Record<string, unknown>
}

type TestAccountRow = {
  profile_id: string
  email: string
  active: boolean
  current_mode: IsolatedTestMode
  assigned_course_slug: string
  sandbox_state: Record<string, unknown> | null
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function fromRow(row: TestAccountRow): IsolatedTestAccount {
  return {
    profileId: row.profile_id,
    email: row.email,
    active: row.active,
    currentMode: row.current_mode,
    assignedCourseSlug: row.assigned_course_slug,
    sandboxState: row.sandbox_state ?? {},
  }
}

export async function getIsolatedTestAccount(user: Pick<User, 'id' | 'email'> | null | undefined) {
  if (!supabaseAdmin || !user || normalizeEmail(user.email) !== ISOLATED_TEST_ACCOUNT_EMAIL) return null

  const { data: existing, error } = await supabaseAdmin
    .from('internal_test_accounts')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (error) throw error
  if (existing) return existing.active ? fromRow(existing as TestAccountRow) : null

  const { data: created, error: createError } = await supabaseAdmin
    .from('internal_test_accounts')
    .upsert({
      profile_id: user.id,
      email: ISOLATED_TEST_ACCOUNT_EMAIL,
      active: true,
      current_mode: 'student',
      assigned_course_slug: 'zhubei-night-run-monday',
      sandbox_state: {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })
    .select('*')
    .single()
  if (createError || !created) throw createError || new Error('建立測試帳號沙盒失敗。')
  return fromRow(created as TestAccountRow)
}

export async function setIsolatedTestMode(account: IsolatedTestAccount, mode: IsolatedTestMode) {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')
  const { data, error } = await supabaseAdmin
    .from('internal_test_accounts')
    .update({ current_mode: mode, updated_at: new Date().toISOString() })
    .eq('profile_id', account.profileId)
    .eq('active', true)
    .select('*')
    .single()
  if (error || !data) throw error || new Error('切換測試身份失敗。')
  return fromRow(data as TestAccountRow)
}

export async function updateIsolatedTestState(
  account: IsolatedTestAccount,
  updater: (current: Record<string, unknown>) => Record<string, unknown>,
) {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')
  const nextState = updater(structuredClone(account.sandboxState))
  const { data, error } = await supabaseAdmin
    .from('internal_test_accounts')
    .update({ sandbox_state: nextState, updated_at: new Date().toISOString() })
    .eq('profile_id', account.profileId)
    .eq('active', true)
    .select('*')
    .single()
  if (error || !data) throw error || new Error('儲存測試資料失敗。')
  return fromRow(data as TestAccountRow)
}

export async function getIsolatedMondayCourse(account: IsolatedTestAccount) {
  const [season, courses] = await Promise.all([getCurrentCourseSeason(), getManagedCourses()])
  if (!season) return null
  const selected = courses.find((course) => course.slug === account.assignedCourseSlug)
    ?? courses.find((course) => course.weekday === '週一')
  if (!selected) return null
  const courseSeasonCourseId = season.courseOfferingIds[selected.slug]
  const billing = season.courseBillingConfigs[selected.slug]
  if (!courseSeasonCourseId || !billing?.sessionDates?.length) return null
  return {
    seasonId: season.id,
    seasonName: season.name,
    seasonCode: season.code,
    seasonEndsOn: season.endsOn,
    courseSeasonCourseId: `test-${courseSeasonCourseId}`,
    sourceCourseSeasonCourseId: courseSeasonCourseId,
    courseSlug: selected.slug,
    courseName: selected.name,
    weekday: selected.weekday,
    classTime: selected.classTime || selected.time || '',
    startTime: season.courseOverrides[selected.slug]?.startTime || '',
    location: selected.location,
    meetingPoint: selected.meetingPoint || '',
    sessionDates: billing.sessionDates,
    capacity: season.courseCapacities[selected.slug] ?? 40,
  }
}

export function isolatedTestStudentFixtures() {
  const now = new Date().toISOString()
  return [
    {
      id: 'test-binding-a', active: true, created_at: now,
      student: { id: 'test-student-a', name: '測試學員 A', email: 'student-a@invalid.test', program: '週一測試班', goal: '完成 10K', pb: '10K 55:00' },
      recentFeedback: [{ id: 'test-feedback-a', created_at: now, distance_km: 6, pace_text: '6:00/km', average_heart_rate: 145, rpe: 6, feeling: '這是隔離測試回饋，不是真實學員資料。', status: 'new' as const }],
    },
    {
      id: 'test-binding-b', active: true, created_at: now,
      student: { id: 'test-student-b', name: '測試學員 B', email: 'student-b@invalid.test', program: '週一測試班', goal: '半馬完賽', pb: '' },
      recentFeedback: [],
    },
  ]
}
