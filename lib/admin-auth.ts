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

export async function getAdminProfile(user: User) {
  if (!supabaseAdmin) {
    throw new Error('Supabase server client is not configured.')
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, email, name')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error

  const email = normalizeEmail(user.email || profile?.email)
  const role = profile?.role as AdminProfile['role'] | undefined
  const isAdmin = role === 'admin' || isAdminEmail(email)

  if (!isAdmin) return null

  return {
    id: user.id,
    role: role ?? 'admin',
    email,
    name: profile?.name ?? '',
  } satisfies AdminProfile
}
