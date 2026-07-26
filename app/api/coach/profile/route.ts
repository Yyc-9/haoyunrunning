import { NextRequest, NextResponse } from 'next/server'
import { coachPublicProfilesFromRows, type CoachPublicProfileRow } from '@/lib/coach-profiles'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getIsolatedTestAccount } from '@/lib/test-account'

const headers = { 'Cache-Control': 'no-store' }

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

async function requireCoach(request: NextRequest) {
  if (!supabaseAdmin) return { response: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 }) }
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return { response: NextResponse.json({ error: '請先登入教練帳號。' }, { status: 401 }) }

  const testAccount = await getIsolatedTestAccount(user)
  if (testAccount) {
    if (testAccount.currentMode !== 'coach') return { response: NextResponse.json({ error: '請先切換至教練測試模式。' }, { status: 403 }) }
    return {
      user,
      testAccount,
      account: { id: user.id, role: 'coach', name: '測試教練', email: user.email ?? '', nickname: '', bio: '', avatar_url: '' },
    }
  }

  const { data: account, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, name, email, nickname, bio, avatar_url')
    .eq('id', user.id)
    .single()

  if (error || !account) return { response: NextResponse.json({ error: error?.message || '找不到帳號資料。' }, { status: 500 }) }
  if (!['coach', 'admin'].includes(account.role)) {
    return { response: NextResponse.json({ error: '目前帳號尚未取得教練權限。' }, { status: 403 }) }
  }
  return { user, account }
}

async function ensureOwnedProfile(account: { id: string; name: string; email: string; nickname: string | null; bio: string | null; avatar_url: string | null }) {
  const { data: owned, error: ownedError } = await supabaseAdmin!
    .from('coach_public_profiles')
    .select('*')
    .eq('owner_profile_id', account.id)
    .maybeSingle()
  if (ownedError) throw new Error(ownedError.message)
  if (owned) return owned as CoachPublicProfileRow

  const coachKey = `account-${account.id.replaceAll('-', '')}`
  const displayName = cleanText(account.name, 120) || account.email.split('@')[0] || '好運教練'
  const { data: created, error: createError } = await supabaseAdmin!
    .from('coach_public_profiles')
    .upsert({
      coach_key: coachKey,
      owner_profile_id: account.id,
      display_name: displayName,
      nickname: cleanText(account.nickname, 80),
      role_title: '好運跑班教練',
      bio: cleanText(account.bio, 1600),
      avatar_url: '',
      full_body_image_url: '',
      profile_initialized: true,
      published: true,
    }, { onConflict: 'coach_key' })
    .select('*')
    .single()
  if (createError || !created) throw new Error(createError?.message || '建立教練公開資料失敗。')
  return created as CoachPublicProfileRow
}

async function loadMergedProfile(coachKey: string) {
  const { data, error } = await supabaseAdmin!.from('coach_public_profiles').select('*')
  if (error) throw new Error(error.message)
  return coachPublicProfilesFromRows(data as CoachPublicProfileRow[] | null)[coachKey]
}

export async function GET(request: NextRequest) {
  const auth = await requireCoach(request)
  if ('response' in auth) return auth.response

  const testAccount = 'testAccount' in auth ? auth.testAccount : undefined
  if (testAccount) {
    return NextResponse.json({
      profile: {
        coachKey: 'isolated-test-coach', displayName: '測試教練', nickname: '', role: '週一課程測試教練',
        bio: '此為獨立測試帳號，不會顯示在公開團隊陣容。', avatarUrl: '', fullBodyImageUrl: '',
        avatarFocusX: 50, avatarFocusY: 25, fullBodyFocusX: 50, fullBodyFocusY: 20,
        specialties: ['功能測試'], style: '僅供網站功能驗證', achievements: [], certifications: [], published: false,
      },
      account: { name: '測試教練', email: auth.account.email }, isolatedTest: true,
    }, { headers })
  }

  try {
    const row = await ensureOwnedProfile(auth.account)
    const profile = await loadMergedProfile(row.coach_key)
    return NextResponse.json({ profile, account: { name: auth.account.name, email: auth.account.email } }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '讀取教練公開資料失敗。' }, { status: 500, headers })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCoach(request)
  if ('response' in auth) return auth.response
  return NextResponse.json({ error: '教練照片由超級管理員統一維護，教練帳號不可自行上傳。' }, { status: 403, headers })
}
