import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 503, headers })
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: '請先登入。' }, { status: 401, headers })
  if (!await getAdminProfile(user)) return NextResponse.json({ error: '只有超級管理員可以批量修正考勤。' }, { status: 403, headers })
  const body = await request.json().catch(() => null)
  if (!body || !['preview', 'apply'].includes(body.action) || !Array.isArray(body.assignmentIds)
    || body.assignmentIds.length < 1 || body.assignmentIds.length > 500
    || body.assignmentIds.some((id: unknown) => typeof id !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id))
    || !['on_time', 'late', 'not_checked_in'].includes(body.state)) {
    return NextResponse.json({ error: '批量修正範圍或狀態無效。' }, { status: 400, headers })
  }
  if (body.action === 'apply' && (typeof body.fingerprint !== 'string' || !/^[\da-f]{32}$/.test(body.fingerprint)
    || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 800)) {
    return NextResponse.json({ error: '請先預覽並填寫修正原因。' }, { status: 400, headers })
  }
  const { data, error } = await supabaseAdmin.rpc('admin_bulk_coach_attendance', {
    p_actor_id: user.id, p_assignment_ids: body.assignmentIds, p_state: body.state,
    p_reason: body.action === 'apply' ? body.reason.trim() : '',
    p_fingerprint: body.action === 'apply' ? body.fingerprint : null,
  })
  if (error) return NextResponse.json({ error: error.code === 'PGRST202'
    ? '批量考勤功能尚未完成資料庫更新，未修改任何記錄。' : error.message }, { status: error.code === 'PGRST202' ? 503 : 409, headers })
  return NextResponse.json(data, { headers })
}
