import { createClient } from '@supabase/supabase-js'
import { getTodayInfo } from '@/lib/week-dates'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export type AppRole = 'student' | 'coach' | 'admin'

export interface UserProfile {
  id: string
  role: AppRole
  name: string
  email: string
  phone: string | null
  program: string | null
  goal: string | null
  pb: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface TrainingFeedbackInsert {
  training_plan_id?: string | null
  student_id: string
  coach_id?: string | null
  distance_km?: number | null
  duration_text?: string
  pace_text?: string
  average_heart_rate?: number | null
  rpe?: number | null
  feeling?: string
}

export interface TrainingPlan {
  id: string
  student_id: string
  coach_id: string
  week_number: number
  week_start: string
  workout_date: string
  day_label: string
  title: string
  target: string
  pace: string | null
  note: string | null
  sort_order: number
}

export interface TrainingFeedback {
  id: string
  training_plan_id: string | null
  student_id: string
  coach_id: string | null
  completed_at: string
  distance_km: number | null
  duration_text: string | null
  pace_text: string | null
  average_heart_rate: number | null
  rpe: number | null
  feeling: string | null
  status: 'new' | 'flagged' | 'reviewed'
  created_at: string
}

export type StudentRaceStatus = 'accepted' | 'planned' | 'completed'
export type StudentRaceSource = 'catalog' | 'custom'
export type StudentAccessState = 'approved' | 'pending_transfer' | 'pending_review' | 'rejected' | 'legacy_open'

export interface StudentRace {
  id: string
  student_id: string
  race_name: string
  location: string
  country: string
  race_date: string | null
  distance: string
  status: StudentRaceStatus
  source: StudentRaceSource
  notes: string
  created_at: string
  updated_at: string
}

export interface StudentRaceInsert {
  student_id: string
  race_name: string
  location?: string
  country?: string
  race_date?: string | null
  distance?: string
  status?: StudentRaceStatus
  source?: StudentRaceSource
  notes?: string
}

export async function getMyStudentAccess() {
  if (!supabase) {
    return { state: 'legacy_open' as StudentAccessState, canAccessTraining: true }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return { state: 'legacy_open' as StudentAccessState, canAccessTraining: true }
  }

  const response = await fetch('/api/student/access', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as {
    state?: StudentAccessState
    canAccessTraining?: boolean
    coachBound?: boolean
    coachName?: string
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error || '讀取報名狀態失敗，請稍後再試。')
  }

  return {
    state: payload.state ?? 'legacy_open',
    canAccessTraining: payload.canAccessTraining ?? true,
    coachBound: payload.coachBound ?? false,
    coachName: payload.coachName ?? '',
  }
}

export async function getCurrentProfile() {
  if (!supabase) return null

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    throw error
  }

  return data as UserProfile
}

export async function submitTrainingFeedback(input: TrainingFeedbackInsert) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    const response = await fetch('/api/student/training-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(input),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      feedback?: TrainingFeedback
      error?: string
    }

    if (!response.ok || !payload.feedback) {
      throw new Error(payload.error || '提交訓練回饋失敗，請稍後再試。')
    }

    return payload.feedback
  }

  const { data, error } = await supabase
    .from('training_feedback')
    .insert(input)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getMyTrainingPlans(studentId: string) {
  if (!supabase) return []

  const currentWeekStart = getTodayInfo().weekStart

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    const params = new URLSearchParams({ weekStart: currentWeekStart })
    const response = await fetch(`/api/student/training-plans?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const payload = (await response.json().catch(() => ({}))) as {
      plans?: TrainingPlan[]
      error?: string
    }

    if (!response.ok) {
      throw new Error(payload.error || '讀取課表失敗，請稍後再試。')
    }

    return payload.plans ?? []
  }

  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .eq('student_id', studentId)
    .eq('week_start', currentWeekStart)
    .order('workout_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(14)

  if (error) {
    throw error
  }

  return (data ?? []) as TrainingPlan[]
}

export async function getMyTrainingFeedback(studentId: string) {
  if (!supabase) return []

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    const response = await fetch('/api/student/training-feedback', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const payload = (await response.json().catch(() => ({}))) as {
      feedback?: TrainingFeedback[]
      error?: string
    }

    if (!response.ok) {
      throw new Error(payload.error || '讀取最近回饋失敗，請稍後再試。')
    }

    return payload.feedback ?? []
  }

  const { data, error } = await supabase
    .from('training_feedback')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    throw error
  }

  return (data ?? []) as TrainingFeedback[]
}

export async function getMyStudentRaces(studentId: string) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('student_races')
    .select('*')
    .eq('student_id', studentId)
    .order('race_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as StudentRace[]
}

export async function addMyStudentRace(input: StudentRaceInsert) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('student_races')
    .insert({
      ...input,
      status: input.status ?? 'accepted',
      source: input.source ?? 'catalog',
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as StudentRace
}

export async function removeMyStudentRace(id: string, studentId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { error } = await supabase
    .from('student_races')
    .delete()
    .eq('id', id)
    .eq('student_id', studentId)

  if (error) {
    throw error
  }
}
