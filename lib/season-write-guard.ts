import 'server-only'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function archivedSeasonResponse(target: {
  seasonId?: string | null
  enrollmentId?: string | null
  assignmentId?: string | null
  attendanceId?: string | null
  transactionId?: string | null
}) {
  const unavailable = () => NextResponse.json({ error: '無法確認季度狀態，未執行修改。' }, { status: 503 })
  if (!supabaseAdmin) return unavailable()
  let seasonId = target.seasonId
  let enrollmentId = target.enrollmentId
  if (target.transactionId) {
    const { data, error } = await supabaseAdmin.from('finance_reconciliation_candidates')
      .select('order_id').eq('transaction_id', target.transactionId).eq('selected', true).eq('order_kind', 'course').maybeSingle()
    if (error) return unavailable()
    enrollmentId = data?.order_id
  }
  const table = enrollmentId ? 'signup_leads' : target.assignmentId ? 'coach_session_assignments' : target.attendanceId ? 'course_attendance_records' : ''
  const id = enrollmentId || target.assignmentId || target.attendanceId
  if (table && id) {
    const { data, error } = await supabaseAdmin.from(table).select('season_id').eq('id', id).maybeSingle()
    if (error) return unavailable()
    seasonId = data?.season_id
  }
  if (!seasonId) return null
  const { data, error } = await supabaseAdmin.from('course_seasons').select('status').eq('id', seasonId).maybeSingle()
  if (error || !data) return unavailable()
  return data.status === 'archived'
    ? NextResponse.json({ error: '此季度已封存，歷史資料僅供查閱，不能修改或同步。' }, { status: 409 })
    : null
}
