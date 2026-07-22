import { NextRequest, NextResponse } from 'next/server'
import { courseEnrollmentPayload } from '@/lib/course-registration'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) {
    return NextResponse.json({ error: '請先登入後再查看匯款狀態。' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .select('id, course_slug, preferred_course, status, amount_text, billing_start_session_date, prior_attendance_claimed, attendance_verification_status, transfer_last_five, review_note, created_at, payment_submitted_at')
    .eq('source', 'course_payment')
    .eq('email', user.email.trim().toLowerCase())
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: '匯款狀態讀取失敗。' }, { status: 500 })
  }

  return NextResponse.json(
    { enrollments: (data ?? []).map((row) => courseEnrollmentPayload(row)) },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
  )
}
