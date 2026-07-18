import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const headers = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500, headers })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '請先登入管理員帳號。' }, { status: 401, headers })
  }

  const adminProfile = await getAdminProfile(user)
  if (!adminProfile) {
    return NextResponse.json({ error: '目前帳號沒有管理員權限。' }, { status: 403, headers })
  }

  const [profilesResult, invitesResult] = await Promise.all([
    supabaseAdmin
      .from('coach_public_profiles')
      .select('coach_key, display_name, owner_profile_id, verification_email')
      .order('display_name', { ascending: true }),
    supabaseAdmin
      .from('coach_invites')
      .select('id, code, coach_key, used_by, used_at, expires_at, created_at')
      .is('used_at', null)
      .order('created_at', { ascending: false }),
  ])

  const error = profilesResult.error || invitesResult.error
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers })
  }

  const profiles = profilesResult.data ?? []
  const profilesByKey = new Map(profiles.map((profile) => [profile.coach_key, profile]))

  return NextResponse.json({
    coachPublicProfiles: profiles.map((profile) => ({
      coachKey: profile.coach_key,
      displayName: profile.display_name || profile.coach_key,
      ownerProfileId: profile.owner_profile_id ?? null,
      verificationEmail: profile.verification_email ?? '',
    })),
    coachInvites: (invitesResult.data ?? []).map((invite) => {
      const profile = profilesByKey.get(invite.coach_key)
      return {
        id: invite.id,
        code: invite.code,
        coachKey: invite.coach_key,
        coachName: profile?.display_name || invite.coach_key,
        verificationEmail: profile?.verification_email ?? '',
        usedBy: '',
        usedAt: invite.used_at,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      }
    }),
  }, { headers })
}
