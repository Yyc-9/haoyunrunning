import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type RedeemInviteBody = {
  code?: string
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '請先登入後再輸入邀請碼。' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as RedeemInviteBody
  const code = body.code?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ error: '請輸入教練邀請碼。' }, { status: 400 })
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('coach_invites')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  if (!invite) {
    return NextResponse.json({ error: '邀請碼不存在。' }, { status: 404 })
  }

  if (invite.used_by && invite.used_by !== user.id) {
    return NextResponse.json({ error: '邀請碼已被其他帳號使用。' }, { status: 409 })
  }

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: '邀請碼已過期，請聯絡管理員重新建立。' }, { status: 410 })
  }

  if (!invite.coach_key) {
    return NextResponse.json({ error: '這組舊版邀請碼已失效，請聯絡管理員取得專屬認證碼。' }, { status: 410 })
  }

  const { data: publicCoachProfile, error: publicCoachProfileError } = await supabaseAdmin
    .from('coach_public_profiles')
    .select('coach_key, display_name, owner_profile_id, verification_email')
    .eq('coach_key', invite.coach_key)
    .maybeSingle()
  if (publicCoachProfileError) {
    return NextResponse.json({ error: publicCoachProfileError.message }, { status: 500 })
  }
  if (!publicCoachProfile) {
    return NextResponse.json({ error: '認證碼對應的公開教練資料不存在。' }, { status: 404 })
  }
  if (publicCoachProfile.owner_profile_id && publicCoachProfile.owner_profile_id !== user.id) {
    return NextResponse.json({ error: '這份公開教練資料已經連結其他帳號。' }, { status: 409 })
  }

  const loginEmail = (user.email ?? '').trim().toLowerCase()
  const verificationEmail = (publicCoachProfile.verification_email ?? '').trim().toLowerCase()
  if (!verificationEmail) {
    return NextResponse.json({ error: '這份教練資料尚未指定認證信箱，請聯絡管理員。' }, { status: 403 })
  }
  if (!loginEmail || loginEmail !== verificationEmail) {
    return NextResponse.json({ error: '這組認證碼與目前登入的信箱不符。' }, { status: 403 })
  }

  const fallbackName =
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    '好運教練'
  const { data: previousProfile, error: ensureProfileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        name: fallbackName,
      },
      { onConflict: 'id' }
    )
    .select('id, role')
    .single()

  if (ensureProfileError || !previousProfile) {
    return NextResponse.json({ error: ensureProfileError?.message || '建立教練帳號資料失敗。' }, { status: 500 })
  }

  let newlyClaimed = false
  if (!invite.used_by) {
    const { data: claimedInvite, error: claimError } = await supabaseAdmin
      .from('coach_invites')
      .update({
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id)
      .is('used_by', null)
      .select('id')
      .maybeSingle()

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }
    if (!claimedInvite) {
      return NextResponse.json({ error: '邀請碼剛剛已被其他帳號使用。' }, { status: 409 })
    }
    newlyClaimed = true
  }

  const nextRole = previousProfile.role === 'admin' ? 'admin' : 'coach'
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      email: user.email ?? '',
      name: fallbackName,
      role: nextRole,
    })
    .eq('id', user.id)
    .select('*')
    .single()

  if (profileError) {
    if (newlyClaimed) {
      await supabaseAdmin
        .from('coach_invites')
        .update({ used_by: null, used_at: null })
        .eq('id', invite.id)
        .eq('used_by', user.id)
    }
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (publicCoachProfile.owner_profile_id !== user.id) {
    const { data: linkedCoachProfile, error: linkError } = await supabaseAdmin
      .from('coach_public_profiles')
      .update({ owner_profile_id: user.id })
      .eq('coach_key', invite.coach_key)
      .is('owner_profile_id', null)
      .select('coach_key')
      .maybeSingle()

    if (linkError || !linkedCoachProfile) {
      await Promise.all([
        supabaseAdmin
          .from('profiles')
          .update({ role: previousProfile.role })
          .eq('id', user.id),
        newlyClaimed
          ? supabaseAdmin
              .from('coach_invites')
              .update({ used_by: null, used_at: null })
              .eq('id', invite.id)
              .eq('used_by', user.id)
          : Promise.resolve(),
      ])
      const isConflict = !linkError || linkError.code === '23505'
      return NextResponse.json({
        error: isConflict
          ? '這個登入帳號已連結其他公開教練身份。'
          : linkError.message,
      }, { status: isConflict ? 409 : 500 })
    }
  }

  const { error: deleteInviteError } = await supabaseAdmin
    .from('coach_invites')
    .delete()
    .eq('id', invite.id)
    .eq('used_by', user.id)

  if (deleteInviteError) {
    console.warn('[coach] Used invite cleanup failed.', deleteInviteError.message)
  }

  return NextResponse.json({
    profile,
    publicCoachProfile: {
      coachKey: publicCoachProfile.coach_key,
      displayName: publicCoachProfile.display_name,
    },
  })
}
