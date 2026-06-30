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
  const code = body.code?.trim()

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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        name:
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split('@')[0] ||
          '好運教練',
        role: 'coach',
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { error: updateInviteError } = await supabaseAdmin
    .from('coach_invites')
    .update({
      used_by: user.id,
      used_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  if (updateInviteError) {
    return NextResponse.json({ error: updateInviteError.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
