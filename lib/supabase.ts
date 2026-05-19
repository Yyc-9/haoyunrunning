import { createClient } from '@supabase/supabase-js'

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
