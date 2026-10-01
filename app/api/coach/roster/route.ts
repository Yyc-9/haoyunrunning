import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getIsolatedTestAccount } from '@/lib/test-account'
import { getCoachRoster } from '@/lib/coach-roster-server'
import { coachRosterPreview } from '@/lib/coach-roster-preview'

const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers })
  try {
    const user = await getAuthedUser(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: '請先登入教練帳號。' }, { status: 401, headers })
    const testAccount = await getIsolatedTestAccount(user)
    if (testAccount) {
      if (testAccount.currentMode !== 'coach') return NextResponse.json({ error: '請先切換至教練測試模式。' }, { status: 403, headers })
      return NextResponse.json({ ...coachRosterPreview, isolatedTest: true }, { headers })
    }
    const { data: profile, error } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (error) throw error
    if (!profile || !['coach', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: '目前帳號尚未取得教練權限。' }, { status: 403, headers })
    }
    const seasonId = request.nextUrl.searchParams.get('seasonId') ?? ''
    if (seasonId && !/^[0-9a-f-]{36}$/i.test(seasonId)) return NextResponse.json({ error: '季度資料無效。' }, { status: 400, headers })
    const roster = await getCoachRoster(user.id, seasonId)
    return NextResponse.json(roster, { headers })
  } catch (error) {
    const unknownSeason = error instanceof Error && error.message === '找不到這個季度。'
    return NextResponse.json({ error: unknownSeason ? '找不到這個季度。' : '讀取班級名單失敗，請稍後重試。' }, { status: unknownSeason ? 404 : 500, headers })
  }
}
