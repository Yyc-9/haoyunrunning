import 'server-only'

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

function getSessionIdFromToken(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as {
      session_id?: unknown
    }
    const sessionId = typeof payload.session_id === 'string' ? payload.session_id : ''
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)
      ? sessionId
      : null
  } catch {
    return null
  }
}

export async function isRevokedDeviceSession(authorization: string | null) {
  if (!supabaseAdmin) return false

  const token = getBearerToken(authorization)
  if (!token) return false
  const sessionId = getSessionIdFromToken(token)
  if (!sessionId) return false

  const { data } = await supabaseAdmin
    .from('user_device_sessions')
    .select('revoked_at')
    .eq('session_id', sessionId)
    .maybeSingle()

  return Boolean(data?.revoked_at)
}

export async function getAuthedUser(authorization: string | null, deviceLabel = '') {
  if (!supabaseAdmin) {
    throw new Error('Supabase server client is not configured.')
  }

  const token = getBearerToken(authorization)
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null

  const sessionId = getSessionIdFromToken(token)
  if (!sessionId) return null

  const { data: sessionAccepted, error: sessionError } = await supabaseAdmin.rpc(
    'register_user_device_session',
    {
      p_user_id: data.user.id,
      p_session_id: sessionId,
      p_device_label: deviceLabel,
    }
  )

  if (sessionError || sessionAccepted !== true) return null

  return data.user
}
