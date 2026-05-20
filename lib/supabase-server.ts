import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServerKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServerKey)

export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl!, supabaseServerKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

export function getBearerToken(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim()
}

export async function getAuthedUser(authorization: string | null) {
  if (!supabaseAdmin) {
    throw new Error('Supabase server client is not configured.')
  }

  const token = getBearerToken(authorization)
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null

  return data.user
}
