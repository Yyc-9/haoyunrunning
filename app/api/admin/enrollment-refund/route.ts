import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 503, headers })
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: '請先登入。' }, { status: 401, headers })
  if (!await getAdminProfile(user)) return NextResponse.json({ error: '只有超級管理員可以登記退費退班。' }, { status: 403, headers })
  const body = await request.json().catch(() => null)
  if (!body || !['preview', 'apply'].includes(body.action)
    || typeof body.enrollmentId !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(body.enrollmentId)) {
    return NextResponse.json({ error: '退班資料無效。' }, { status: 400, headers })
  }
  if (body.action === 'apply' && (typeof body.fingerprint !== 'string' || !/^[\da-f]{32}$/.test(body.fingerprint)
    || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 800)) {
    return NextResponse.json({ error: '請先預覽並填寫退費退班原因。' }, { status: 400, headers })
  }
  const { data, error } = await supabaseAdmin.rpc('admin_refund_enrollment', {
    p_actor_id: user.id, p_enrollment_id: body.enrollmentId,
    p_reason: body.action === 'apply' ? body.reason.trim() : '',
    p_fingerprint: body.action === 'apply' ? body.fingerprint : null,
  })
  if (error) return NextResponse.json({ error: error.code === 'PGRST202' ? '退費退班功能尚未完成資料庫更新，未修改任何資料。' : error.message }, { status: error.code === 'PGRST202' ? 503 : 409, headers })
  return NextResponse.json(data, { headers })
}
