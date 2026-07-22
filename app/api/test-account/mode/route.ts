import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'
import { getIsolatedTestAccount, setIsolatedTestMode, type IsolatedTestMode } from '@/lib/test-account'

const headers = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: '請先登入。' }, { status: 401, headers })
  const account = await getIsolatedTestAccount(user)
  if (!account) return NextResponse.json({ error: '目前帳號不是指定測試帳號。' }, { status: 403, headers })
  return NextResponse.json({ enabled: true, mode: account.currentMode, assignedCourseSlug: account.assignedCourseSlug }, { headers })
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: '請先登入。' }, { status: 401, headers })
  const account = await getIsolatedTestAccount(user)
  if (!account) return NextResponse.json({ error: '目前帳號不是指定測試帳號。' }, { status: 403, headers })
  const body = await request.json().catch(() => ({})) as { mode?: IsolatedTestMode }
  if (!['student', 'coach'].includes(body.mode ?? '')) return NextResponse.json({ error: '測試身份無效。' }, { status: 400, headers })
  const updated = await setIsolatedTestMode(account, body.mode!)
  return NextResponse.json({ enabled: true, mode: updated.currentMode, message: body.mode === 'coach' ? '已切換為教練測試模式。' : '已切換為學員測試模式。' }, { headers })
}
