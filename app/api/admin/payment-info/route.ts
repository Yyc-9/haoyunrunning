import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getPaymentDisplay } from '@/lib/payment-display-server'
import { validatePaymentDisplay } from '@/lib/payment-display'

export const dynamic = 'force-dynamic'
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } })

async function authorize(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return { error: json({ error: '請先登入。' }, 401) }
  if (!await getAdminProfile(user)) return { error: json({ error: '只有超級管理員可修改對外匯款資料。' }, 403) }
  return { user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request)
    if (auth.error) return auth.error
    return json(await getPaymentDisplay())
  } catch { return json({ error: '收款資料讀取失敗，請稍後重試。' }, 503) }
}

export async function PATCH(request: NextRequest) {
  let persisted = false
  try {
    const auth = await authorize(request)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => null)
    let info
    try { info = validatePaymentDisplay(body?.info) } catch (error) { return json({ error: error instanceof Error ? error.message : '收款資料格式不正確。' }, 400) }
    if (body.confirmed !== true) return json({ error: '請先核對帳號及二維碼後再發布。' }, 400)
    if (body.version !== null && typeof body.version !== 'string') return json({ error: '請重新讀取收款資料。' }, 400)
    const record = { value: info, updated_at: new Date().toISOString(), updated_by: auth.user!.id }
    const query = body.version === null
      ? supabaseAdmin!.from('payment_display_settings').insert({ id: true, ...record })
      : supabaseAdmin!.from('payment_display_settings').update(record).eq('id', true).eq('updated_at', body.version)
    const { data, error } = await query.select('value, updated_at').maybeSingle()
    if (error?.code === '23505' || (!error && !data)) return json({ error: '另一位管理員已更新資料，請重新讀取後再修改。' }, 409)
    if (error || !data) return json({ error: '收款資料儲存失敗，請稍後重試。' }, 503)
    persisted = true
    return json({ ...await getPaymentDisplay(), message: '已發布至課程報名與商城結帳頁。' })
  } catch { return json({ error: persisted ? '收款資料已儲存，但重新讀取失敗；請重新讀取確認，不必重複發布。' : '收款資料服務暫時無法使用。' }, 503) }
}
