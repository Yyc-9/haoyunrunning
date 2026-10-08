import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
const errors: Record<string,string> = {
  admin_required: '只有超級管理員可以修改學員資料。',
  student_not_found: '找不到學員帳號，或其身份已變更。',
  student_details_changed: '學員資料已變更，請重新讀取後再編輯。',
  student_reason_required: '請填寫學員資料修改原因。',
  invalid_student_details: '學員資料格式無效，請檢查姓名及欄位長度。',
}
function unavailable() { return NextResponse.json({ error: '學員資料管理暫時無法使用，請稍後重試。' }, { status: 503, headers }) }
async function handle(request: NextRequest, write: boolean) {
  try {
    if (!supabaseAdmin) return unavailable()
    const user = await getAuthedUser(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: '請先登入。' }, { status: 401, headers })
    if (!await getAdminProfile(user)) return NextResponse.json({ error: errors.admin_required }, { status: 403, headers })
    const body = write ? await request.json().catch(() => null) : null
    const id = write ? body?.studentId : request.nextUrl.searchParams.get('studentId')
    if (!uuid(id)) return NextResponse.json({ error: errors.invalid_student_details }, { status: 400, headers })
    const limits = { name:120, phone:80, pb:120, goal:300, adminNote:2000 }
    if (write && (!body?.changes || typeof body.changes !== 'object' || Array.isArray(body.changes)
      || Object.keys(body.changes).length !== 5 || Object.entries(limits).some(([key,limit]) => typeof body.changes[key] !== 'string' || body.changes[key].length > limit)
      || !body.changes.name.trim() || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 800
      || typeof body.fingerprint !== 'string' || !/^[\da-f]{32}$/.test(body.fingerprint))) {
      return NextResponse.json({ error: errors.invalid_student_details }, { status: 400, headers })
    }
    const { data,error } = await supabaseAdmin.rpc('admin_student_details', { p_actor_id:user.id,p_student_id:id,
      p_changes:write ? body.changes : null,p_reason:write ? body.reason.trim() : '',p_fingerprint:write ? body.fingerprint : null })
    if (error) return errors[error.message] ? NextResponse.json({ error:errors[error.message] }, { status:error.message==='admin_required'?403:409,headers }) : unavailable()
    return NextResponse.json(data,{headers})
  } catch { return unavailable() }
}
export async function GET(request: NextRequest) { return handle(request,false) }
export async function POST(request: NextRequest) { return handle(request,true) }
