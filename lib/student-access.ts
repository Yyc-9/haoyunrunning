import { supabaseAdmin } from '@/lib/supabase-server'
import { syncCoachSessionAssignments } from '@/lib/coach-session-duty'

export type StudentAccessState = 'approved' | 'pending_transfer' | 'pending_review' | 'rejected' | 'legacy_open' | 'not_enrolled'
export type StudentAccessSummary = { state: StudentAccessState; coachBound: boolean; coachName: string }

export async function getStudentAccessState(userId: string, email?: string | null) {
  return (await getStudentAccessSummary(userId, email)).state
}

export async function getStudentAccessSummary(userId: string, email?: string | null): Promise<StudentAccessSummary> {
  if (!supabaseAdmin || !email) return { state: 'not_enrolled', coachBound: false, coachName: '' }
  await syncCoachSessionAssignments()
  const { data: seasons, error: seasonError } = await supabaseAdmin.from('course_seasons').select('id').in('status', ['active', 'enrolling'])
  if (seasonError) throw seasonError
  if (!seasons?.length) return { state: 'not_enrolled', coachBound: false, coachName: '' }
  const { data: leads, error } = await supabaseAdmin.from('signup_leads').select('status, created_at')
    .eq('source', 'course_payment').eq('email', email.trim().toLowerCase()).in('season_id', seasons.map((row) => row.id)).order('created_at', { ascending: false })
  if (error) throw error
  const { data: bindings, error: bindingError } = await supabaseAdmin.from('formal_coach_students')
    .select('coach_id').eq('student_id', userId)
  if (bindingError) throw bindingError
  let coachName = ''
  if (bindings?.length) {
    const { data: coaches, error: coachError } = await supabaseAdmin.from('profiles').select('name').in('id', bindings.map((row) => row.coach_id))
    if (coachError) throw coachError
    coachName = (coaches ?? []).map((row) => row.name || '好運教練').join('、')
  }
  const latest = leads?.[0]?.status
  const state: StudentAccessState = leads?.some((row) => row.status === 'approved') ? 'approved'
    : ['pending_transfer', 'pending_review', 'rejected'].includes(latest ?? '') ? latest as StudentAccessState : 'not_enrolled'
  return { state, coachBound: Boolean(bindings?.length), coachName }
}

export function canAccessTrainingContent(state: StudentAccessState) { return state === 'approved' }
