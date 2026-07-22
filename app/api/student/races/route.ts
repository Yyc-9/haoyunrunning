import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getIsolatedTestAccount, updateIsolatedTestState } from '@/lib/test-account'

const headers = { 'Cache-Control': 'no-store' }

function clean(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function access(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return { response: NextResponse.json({ error: '請先登入學員帳號。' }, { status: 401, headers }) }
  const testAccount = await getIsolatedTestAccount(user)
  if (testAccount?.currentMode === 'coach') return { response: NextResponse.json({ error: '請先切換至學員測試模式。' }, { status: 403, headers }) }
  return { user, testAccount }
}

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers })
  const auth = await access(request)
  if ('response' in auth) return auth.response
  if (auth.testAccount) return NextResponse.json({ races: Array.isArray(auth.testAccount.sandboxState.studentRaces) ? auth.testAccount.sandboxState.studentRaces : [], isolatedTest: true }, { headers })
  const { data, error } = await supabaseAdmin.from('student_races').select('*').eq('student_id', auth.user.id).order('race_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers })
  return NextResponse.json({ races: data ?? [] }, { headers })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers })
  const auth = await access(request)
  if ('response' in auth) return auth.response
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const race = {
    id: auth.testAccount ? `test-race-${Date.now()}` : undefined,
    student_id: auth.user.id, race_name: clean(body.race_name), location: clean(body.location), country: clean(body.country),
    race_date: clean(body.race_date, 10) || null, distance: clean(body.distance), status: clean(body.status, 20) || 'accepted',
    source: clean(body.source, 20) || 'catalog', notes: clean(body.notes, 500), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }
  if (!race.race_name) return NextResponse.json({ error: '請填寫賽事名稱。' }, { status: 400, headers })
  if (auth.testAccount) {
    await updateIsolatedTestState(auth.testAccount, (state) => ({ ...state, studentRaces: [...(Array.isArray(state.studentRaces) ? state.studentRaces : []), race] }))
    return NextResponse.json({ race, isolatedTest: true }, { headers })
  }
  const insert = { ...race }
  delete insert.id
  const { data, error } = await supabaseAdmin.from('student_races').insert(insert).select('*').single()
  if (error || !data) return NextResponse.json({ error: error?.message || '新增賽事失敗。' }, { status: 500, headers })
  return NextResponse.json({ race: data }, { headers })
}

export async function DELETE(request: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers })
  const auth = await access(request)
  if ('response' in auth) return auth.response
  const id = clean(request.nextUrl.searchParams.get('id'), 100)
  if (!id) return NextResponse.json({ error: '缺少賽事 ID。' }, { status: 400, headers })
  if (auth.testAccount) {
    await updateIsolatedTestState(auth.testAccount, (state) => ({ ...state, studentRaces: (Array.isArray(state.studentRaces) ? state.studentRaces : []).filter((item) => typeof item === 'object' && item && (item as { id?: unknown }).id !== id) }))
    return NextResponse.json({ success: true, isolatedTest: true }, { headers })
  }
  const { error } = await supabaseAdmin.from('student_races').delete().eq('id', id).eq('student_id', auth.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers })
  return NextResponse.json({ success: true }, { headers })
}
