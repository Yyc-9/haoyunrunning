import { NextRequest, NextResponse } from 'next/server'
import { coachPublicProfilesFromRows, type CoachPublicProfileRow } from '@/lib/coach-profiles'
import { isSafePublicUrl } from '@/lib/site-content'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => cleanText(item, 180)).filter(Boolean).slice(0, 20)
}

function cleanFocus(value: unknown, fallback: number) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : fallback
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
  const displayName = cleanText(body.displayName, 120)
  const avatarUrl = cleanText(body.avatarUrl, 2000)
  const fullBodyImageUrl = cleanText(body.fullBodyImageUrl, 2000)
  if (!displayName) return NextResponse.json({ error: '請填寫對外顯示名稱。' }, { status: 400, headers })
  if ((avatarUrl && !isSafePublicUrl(avatarUrl)) || (fullBodyImageUrl && !isSafePublicUrl(fullBodyImageUrl))) {
    return NextResponse.json({ error: '教練照片網址格式無效。' }, { status: 400, headers })
  }

  try {
    const owned = await ensureOwnedProfile(auth.account)
    const values = {
      display_name: displayName,
      nickname: cleanText(body.nickname, 80),
      role_title: cleanText(body.role, 180),
      bio: cleanText(body.bio, 2000),
      avatar_url: avatarUrl,
      full_body_image_url: fullBodyImageUrl || avatarUrl,
      avatar_focus_x: cleanFocus(body.avatarFocusX, 50),
      avatar_focus_y: cleanFocus(body.avatarFocusY, 18),
      full_body_focus_x: cleanFocus(body.fullBodyFocusX, 50),
      full_body_focus_y: cleanFocus(body.fullBodyFocusY, 18),
      specialties: cleanList(body.specialties),
      style: cleanText(body.style, 1200),
      achievements: cleanList(body.achievements),
      certifications: cleanList(body.certifications),
      profile_initialized: true,
      published: body.published !== false,
    }
    const { error } = await supabaseAdmin!
      .from('coach_public_profiles')
      .update(values)
      .eq('coach_key', owned.coach_key)
      .eq('owner_profile_id', auth.account.id)
    if (error) throw new Error(error.message)

    const { error: accountError } = await supabaseAdmin!
      .from('profiles')
      .update({
        name: displayName,
        nickname: values.nickname,
        bio: values.bio,
        avatar_url: avatarUrl,
      })
      .eq('id', auth.account.id)
    if (accountError) throw new Error(accountError.message)

    const profile = await loadMergedProfile(owned.coach_key)
    return NextResponse.json({ profile, message: '公開資料已發布，相關課程介紹已同步更新。' }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '儲存教練公開資料失敗。' }, { status: 500, headers })
  }
}
