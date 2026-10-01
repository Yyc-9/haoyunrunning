import { supabase } from '@/lib/supabase'
import type { CoachRosterPayload } from '@/lib/coach-roster'

export async function fetchCoachRoster(seasonId = '', signal?: AbortSignal): Promise<CoachRosterPayload> {
  if (!supabase) throw new Error('Supabase 尚未設定。')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('請先登入教練帳號。')
  const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : ''
  const response = await fetch(`/api/coach/roster${query}`, {
    cache: 'no-store', signal, headers: { Authorization: `Bearer ${session.access_token}` },
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || '讀取班級名單失敗，請稍後重試。')
  return payload
}
