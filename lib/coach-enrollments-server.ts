import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-server'
import { syncCoachSessionAssignments } from '@/lib/coach-session-duty'

export async function getCoachApprovedEnrollments(coachId: string) {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')
  await syncCoachSessionAssignments()
  const [{ data: memberships, error: membershipError }, { data: seasons, error: seasonError }] = await Promise.all([
    supabaseAdmin.from('course_coach_memberships').select('course_season_course_id').eq('coach_id', coachId),
    supabaseAdmin.from('course_seasons').select('id').in('status', ['active', 'enrolling']),
  ])
  if (membershipError) throw membershipError
  if (seasonError) throw seasonError
  if (!memberships?.length || !seasons?.length) return []
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabaseAdmin.from('signup_leads').select('*')
      .eq('source', 'course_payment').eq('status', 'approved')
      .in('course_season_course_id', memberships.map(row => row.course_season_course_id))
      .in('season_id', seasons.map(row => row.id))
      .order('created_at', { ascending: false }).order('id').range(from, from + 499)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 500) break
  }
  return rows
}
