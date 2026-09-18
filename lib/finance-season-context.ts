import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-server'
import { overviewSeasonId, type CourseSeasonStatus } from '@/lib/course-seasons'

export async function financeSeasonContext(requestedSeasonId = '') {
  const { data, error } = await supabaseAdmin!.from('course_seasons')
    .select('id, code, name, status, is_current').order('code', { ascending: false })
  if (error) throw error
  const seasons = (data ?? []).map(row => ({ id: row.id as string, code: row.code as string, name: row.name as string,
    status: row.status as CourseSeasonStatus, isCurrent: Boolean(row.is_current) }))
  if (requestedSeasonId && !seasons.some(season => season.id === requestedSeasonId)) throw new Error('找不到選擇的季度。')
  const selectedSeasonId = overviewSeasonId(seasons, requestedSeasonId)
  const roster: Array<{ id: string; name: string; preferred_course: string; calculated_amount: number | null; transfer_last_five: string; status: string }> = []
  if (selectedSeasonId) {
    for (let from = 0; ; from += 500) {
      const { data: rows, error: rosterError } = await supabaseAdmin!.from('signup_leads')
        .select('id, name, preferred_course, calculated_amount, transfer_last_five, status')
        .eq('source', 'course_payment').eq('season_id', selectedSeasonId)
        .order('created_at').order('id').range(from, from + 499)
      if (rosterError) throw rosterError
      roster.push(...(rows ?? []))
      if (!rows || rows.length < 500) break
    }
  }
  const { data: accounts, error: accountError } = await supabaseAdmin!.from('shop_payment_accounts')
    .select('id, label, bank_name, account_number, active').eq('active', true)
  if (accountError) throw accountError
  return { seasons, selectedSeasonId, roster, paymentAccounts: accounts ?? [] }
}
