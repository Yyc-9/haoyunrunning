import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { readAllRows } from '@/lib/supabase-pagination'

const headers = { 'Cache-Control': 'no-store' }
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
async function requireAdmin(request: NextRequest) {
  if (!supabaseAdmin) return { response: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 503, headers }) }
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return { response: NextResponse.json({ error: '請先登入。' }, { status: 401, headers }) }
  if (!await getAdminProfile(user)) return { response: NextResponse.json({ error: '只有超級管理員可以轉班。' }, { status: 403, headers }) }
  return { user }
}
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('response' in auth) return auth.response
  const id = request.nextUrl.searchParams.get('enrollmentId')
  if (!uuid(id)) return NextResponse.json({ error: '報名識別碼無效。' }, { status: 400, headers })
  try {
    const leadResult = await supabaseAdmin!.from('signup_leads')
      .select('id,name,season_id,course_season_course_id,preferred_course,billing_start_session_date,status,amount_text,registration_status')
      .eq('id', id).eq('source', 'course_payment').maybeSingle()
    if (leadResult.error) throw leadResult.error
    const lead = leadResult.data
    if (!lead) return NextResponse.json({ error: '找不到課程報名。' }, { status: 404, headers })
    const [courses, attendance, checkins, deductions, makeups] = await Promise.all([
      readAllRows((from, to) => supabaseAdmin!.from('course_season_courses').select('id,course_slug,course_data,billing_config').eq('season_id', lead.season_id).order('id').range(from, to)),
      readAllRows((from, to) => supabaseAdmin!.from('course_attendance_records').select('id,session_date').eq('enrollment_id', id).eq('course_season_course_id', lead.course_season_course_id).order('id').range(from, to)),
      readAllRows((from, to) => supabaseAdmin!.from('student_course_checkins').select('id,session_date').eq('enrollment_id', id).eq('course_season_course_id', lead.course_season_course_id).order('id').range(from, to)),
      readAllRows((from, to) => supabaseAdmin!.from('course_attendance_deductions').select('id,session_date').eq('enrollment_id', id).eq('course_season_course_id', lead.course_season_course_id).order('id').range(from, to)),
      readAllRows((from, to) => supabaseAdmin!.from('course_makeup_requests').select('id,original_session_date').eq('enrollment_id', id).eq('original_course_season_course_id', lead.course_season_course_id).order('id').range(from, to)),
    ])
    return NextResponse.json({ enrollment: lead,
      courses: courses.filter(course => course.id !== lead.course_season_course_id).map(course => ({ id: course.id, name: course.course_data?.name || course.course_slug, sessionDates: course.billing_config?.sessionDates || [] })),
      sourceDates: [...new Set([...attendance, ...checkins, ...deductions].map(row => row.session_date).concat(makeups.map(row => row.original_session_date)))].sort(),
    }, { headers })
  } catch {
    return NextResponse.json({ error: '無法完整讀取轉班資料，請稍後重試。' }, { status: 503, headers })
  }
}
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('response' in auth) return auth.response
  const body = await request.json().catch(() => null)
  if (!body || !['preview', 'apply'].includes(body.action) || !uuid(body.enrollmentId) || !uuid(body.targetId)
    || typeof body.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)
    || !['preserve_history', 'move_records'].includes(body.mode)
    || !body.dateMap || typeof body.dateMap !== 'object' || Array.isArray(body.dateMap)
    || Object.entries(body.dateMap).some(([from, to]) => !/^\d{4}-\d{2}-\d{2}$/.test(from) || typeof to !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
    return NextResponse.json({ error: '轉班資料或課次對應無效。' }, { status: 400, headers })
  }
  if (body.action === 'apply' && (typeof body.fingerprint !== 'string' || !/^[\da-f]{32}$/.test(body.fingerprint)
    || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 800)) {
    return NextResponse.json({ error: '請先預覽並填寫轉班原因。' }, { status: 400, headers })
  }
  const { data, error } = await supabaseAdmin!.rpc('admin_transfer_enrollment', {
    p_actor_id: auth.user.id, p_enrollment_id: body.enrollmentId, p_target_id: body.targetId,
    p_start_date: body.startDate, p_mode: body.mode, p_date_map: body.dateMap,
    p_reason: body.action === 'apply' ? body.reason.trim() : '', p_fingerprint: body.action === 'apply' ? body.fingerprint : null,
  })
  if (error) return NextResponse.json({ error: error.code === 'PGRST202' ? '轉班功能尚未完成資料庫更新，未修改任何資料。' : error.message }, { status: error.code === 'PGRST202' ? 503 : 409, headers })
  return NextResponse.json(data, { headers })
}
