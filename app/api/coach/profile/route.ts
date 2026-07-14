import { NextRequest, NextResponse } from 'next/server'
import { coachPublicProfilesFromRows, type CoachPublicProfileRow } from '@/lib/coach-profiles'
import { isSafePublicUrl } from '@/lib/site-content'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

async function requireCoach(request: NextRequest) {
  if (!supabaseAdmin) return { response: NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 }) }
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return { response: NextResponse.json({ error: '請先登入教練帳號。' }, { status: 401 }) }

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
      avatar_url: cleanText(account.avatar_url, 2000),
      full_body_image_url: cleanText(account.avatar_url, 2000),
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

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const avatarUrl = cleanText(body.avatarUrl, 2000)
  if (!avatarUrl || !isSafePublicUrl(avatarUrl)) {
    return NextResponse.json({ error: '教練頭像網址格式無效。' }, { status: 400, headers })
  }

  try {
    const owned = await ensureOwnedProfile(auth.account)
    const { error } = await supabaseAdmin!
      .from('coach_public_profiles')
      .update({ avatar_url: avatarUrl, profile_initialized: true })
      .eq('coach_key', owned.coach_key)
      .eq('owner_profile_id', auth.account.id)
    if (error) throw new Error(error.message)

    const { error: accountError } = await supabaseAdmin!
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', auth.account.id)
    if (accountError) throw new Error(accountError.message)

    const profile = await loadMergedProfile(owned.coach_key)
    return NextResponse.json({ profile, message: '教練頭像已更新。' }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '儲存教練頭像失敗。' }, { status: 500, headers })
  }
}
