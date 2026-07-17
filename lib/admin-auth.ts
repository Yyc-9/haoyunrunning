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

export async function isAdminAllowlistedEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return false
  if (isAdminEmail(normalizedEmail)) return true

  if (!supabaseAdmin) {
    throw new Error('Supabase server client is not configured.')
  }

  const { data, error } = await supabaseAdmin
    .from('admin_role_allowlist')
    .select('email')
    .eq('email', normalizedEmail)
    .eq('active', true)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
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
  let role = profile?.role as AdminProfile['role'] | undefined
  const allowlisted = role !== 'admin' && await isAdminAllowlistedEmail(email)
  const isAdmin = role === 'admin' || allowlisted

  if (!isAdmin) return null

  if (profile && role !== 'admin' && allowlisted) {
    const { error: promoteError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)

    if (promoteError) throw promoteError
    role = 'admin'
  }

  return {
    id: user.id,
    role: role ?? 'admin',
    email,
    name: profile?.name ?? '',
  } satisfies AdminProfile
}
