import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'

export type AdminProfile = {
  id: string
  role: 'student' | 'coach' | 'admin'
  email: string
  name: string
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? ''
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return false

  return getAdminEmails().includes(normalizedEmail)
}

export async function resolveAccountRole(user: Pick<User, 'id'>): Promise<AdminProfile | null> {
  if (!supabaseAdmin) {
    throw new Error('Supabase server client is not configured.')
  }

  const { data, error } = await supabaseAdmin.rpc('resolve_account_role', {
    p_user_id: user.id,
    p_env_emails: getAdminEmails(),
  })
  if (error) throw error
  return data as AdminProfile | null
}

export async function getAdminProfile(user: User) {
  const profile = await resolveAccountRole(user)
  return profile?.role === 'admin' ? profile : null
}
