import { NextRequest, NextResponse } from 'next/server'
import { getAdminEmails, getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }
const validEmail = (email: unknown): email is string => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const messages: Record<string, string> = {
  admin_required: '只有超級管理員可以管理帳號權限。',
  invalid_admin_email: '請輸入有效的登入信箱。',
  admin_reason_required: '請填寫權限變更原因。',
  admin_email_conflict: '此信箱對應多個帳號，請先處理身份衝突。',
  admin_profile_missing: '帳號缺少個人資料，未修改權限。',
  admin_cannot_revoke_self: '不能撤銷自己的管理員權限，請由另一位超級管理員處理。',
  last_admin_required: '至少需要保留一位已驗證的超級管理員。',
}
async function requireAdmin(request: NextRequest) {
  if (!supabaseAdmin) return { response: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 503, headers }) }
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return { response: NextResponse.json({ error: '請先登入。' }, { status: 401, headers }) }
  if (!await getAdminProfile(user)) return { response: NextResponse.json({ error: messages.admin_required }, { status: 403, headers }) }
  return { user }
}
function unavailable() {
  return NextResponse.json({ error: '帳號管理暫時無法使用，請確認資料庫更新後重試。' }, { status: 503, headers })
}
function rpcError(error: { code?: string; message?: string }) {
  const message = messages[error.message ?? '']
  return message ? NextResponse.json({ error: message }, { status: error.message === 'admin_required' ? 403 : 409, headers }) : unavailable()
}
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('response' in auth) return auth.response
    const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || null
    if (email && !validEmail(email)) return NextResponse.json({ error: messages.invalid_admin_email }, { status: 400, headers })
    const { data, error } = await supabaseAdmin!.rpc('admin_account_overview', { p_actor_id: auth.user.id, p_email: email, p_env_emails: getAdminEmails() })
    if (error) return rpcError(error)
    return NextResponse.json({ ...data, actorId: auth.user.id }, { headers })
  } catch { return unavailable() }
}
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('response' in auth) return auth.response
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!validEmail(email) || typeof body?.active !== 'boolean') return NextResponse.json({ error: messages.invalid_admin_email }, { status: 400, headers })
    if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 800) return NextResponse.json({ error: messages.admin_reason_required }, { status: 400, headers })
    const { data, error } = await supabaseAdmin!.rpc('admin_set_access', { p_actor_id: auth.user.id, p_email: email, p_active: body.active, p_reason: body.reason.trim() })
    if (error) return rpcError(error)
    return NextResponse.json(data, { headers })
  } catch { return unavailable() }
}
