import { NextRequest, NextResponse } from 'next/server'
import { isAdminAllowlistedEmail } from '@/lib/admin-auth'
import { getAuthedUser, isRevokedDeviceSession, supabaseAdmin } from '@/lib/supabase-server'

const noStoreHeaders = {
  'Cache-Control': 'no-store',
}

type AccountUpdateBody = {
  name?: string
  phone?: string
  pb?: string
  nickname?: string
  bio?: string
  city?: string
  runningSince?: string
  favoriteDistance?: string
  targetEvent?: string
  instagram?: string
  facebook?: string
  goal?: string
  invoiceType?: string
  invoiceCarrier?: string
  taxId?: string
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

async function getAchievementCollection(profileId: string) {
  if (!supabaseAdmin) return []

  const [badgesResult, earnedResult] = await Promise.all([
    supabaseAdmin
      .from('achievement_badges')
      .select('id, slug, name, description, unlock_hint, icon, category, rarity, display_order')
      .eq('active', true)
      .order('display_order', { ascending: true }),
    supabaseAdmin
      .from('profile_achievements')
      .select('badge_id, reason, awarded_at')
      .eq('profile_id', profileId),
  ])

  if (badgesResult.error) throw badgesResult.error
  if (earnedResult.error) throw earnedResult.error

  const earnedByBadge = new Map((earnedResult.data ?? []).map((item) => [item.badge_id, item]))
  return (badgesResult.data ?? []).map((badge) => {
    const earned = earnedByBadge.get(badge.id)
    return {
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
      unlockHint: badge.unlock_hint,
      icon: badge.icon,
      category: badge.category,
      rarity: badge.rarity,
      earned: Boolean(earned),
      reason: earned?.reason ?? '',
      awardedAt: earned?.awarded_at ?? null,
    }
  })
}

async function getCoachVerification(profile: Record<string, unknown>) {
  if (!supabaseAdmin || profile.role === 'coach' || profile.role === 'admin') return null

  const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : ''
  if (!email) return null

  const { data: coachProfile, error: coachProfileError } = await supabaseAdmin
    .from('coach_public_profiles')
    .select('coach_key, display_name')
    .eq('verification_email', email)
    .is('owner_profile_id', null)
    .maybeSingle()

  if (coachProfileError) throw coachProfileError
  if (!coachProfile) return null

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('coach_invites')
    .select('id, expires_at')
    .eq('coach_key', coachProfile.coach_key)
    .is('used_at', null)
    .maybeSingle()

  if (inviteError) throw inviteError
  if (!invite) return null
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) return null

  return {
    eligible: true,
    coachKey: coachProfile.coach_key,
    coachName: coachProfile.display_name,
  }
}

async function accountResponse(profile: Record<string, unknown>) {
  if (!supabaseAdmin) return NextResponse.json({ profile, achievements: [] }, { headers: noStoreHeaders })

  const [achievements, billingResult, coachVerification] = await Promise.all([
    getAchievementCollection(String(profile.id)),
    supabaseAdmin
      .from('profile_billing_preferences')
      .select('invoice_type, invoice_carrier, tax_id')
      .eq('profile_id', String(profile.id))
      .maybeSingle(),
    getCoachVerification(profile),
  ])

  if (billingResult.error) throw billingResult.error

  return NextResponse.json({
    profile: {
      ...profile,
      facebook: typeof profile.facebook === 'string' ? profile.facebook : '',
      invoice_type: billingResult.data?.invoice_type ?? 'none',
      invoice_carrier: billingResult.data?.invoice_carrier ?? '',
      tax_id: billingResult.data?.tax_id ?? '',
    },
    achievements,
    coachVerification,
  }, { headers: noStoreHeaders })
}

async function ensurePreferredCoachBinding(user: Awaited<ReturnType<typeof getAuthedUser>>) {
  if (!supabaseAdmin || !user) return null

  const coachId = typeof user.user_metadata?.preferred_coach_id === 'string'
    ? user.user_metadata.preferred_coach_id.trim()
    : ''
  if (!coachId) return null

  const { data: existingBinding, error: existingBindingError } = await supabaseAdmin
    .from('coach_students')
    .select('id')
    .eq('student_id', user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  if (existingBindingError) return existingBindingError
  if (existingBinding) return null

  const { data: coach, error: coachError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', coachId)
    .eq('role', 'coach')
    .maybeSingle()
  if (coachError) return coachError
  if (!coach) return null

  const { error: bindError } = await supabaseAdmin.from('coach_students').upsert(
    {
      coach_id: coach.id,
      student_id: user.id,
      active: true,
    },
    { onConflict: 'coach_id,student_id' }
  )

  return bindError
}

async function unauthorizedResponse(request: NextRequest) {
  const revoked = await isRevokedDeviceSession(request.headers.get('authorization'))
  return NextResponse.json(
    revoked
      ? { error: '此帳號已在其他裝置登入，目前裝置已登出。', code: 'SESSION_REVOKED' }
      : { error: '請先登入。' },
    { status: 401, headers: noStoreHeaders }
  )
}

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(
    request.headers.get('authorization'),
    request.headers.get('user-agent') ?? ''
  )
  if (!user) {
    return unauthorizedResponse(request)
  }

  const { data: existingProfile, error: selectError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (existingProfile) {
    const coachBindingError = await ensurePreferredCoachBinding(user)
    if (coachBindingError) {
      return NextResponse.json({ error: coachBindingError.message }, { status: 500 })
    }

    const nextEmail = (user.email ?? existingProfile.email ?? '').trim().toLowerCase()
    const shouldPromoteAdmin =
      existingProfile.role !== 'admin' && await isAdminAllowlistedEmail(nextEmail)
    if (
      (nextEmail && nextEmail !== existingProfile.email) ||
      shouldPromoteAdmin
    ) {
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: nextEmail,
          ...(shouldPromoteAdmin ? { role: 'admin' as const } : {}),
        })
        .eq('id', user.id)
        .select('*')
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return accountResponse(updatedProfile)
    }

    return accountResponse(existingProfile)
  }

  const email = (user.email ?? '').trim().toLowerCase()
  const initialRole = await isAdminAllowlistedEmail(email) ? 'admin' : 'student'
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      email,
      name:
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split('@')[0] ||
        '好運跑者',
      phone: (user.user_metadata?.phone as string | undefined) ?? '',
      pb: (user.user_metadata?.pb as string | undefined) ?? '',
      role: initialRole,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const coachBindingError = await ensurePreferredCoachBinding(user)
  if (coachBindingError) {
    return NextResponse.json({ error: coachBindingError.message }, { status: 500 })
  }

  return accountResponse(profile)
}

export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(
    request.headers.get('authorization'),
    request.headers.get('user-agent') ?? ''
  )
  if (!user) {
    return unauthorizedResponse(request)
  }

  const body = (await request.json().catch(() => ({}))) as AccountUpdateBody
  const nextName = cleanText(body.name, 120)
  const nickname = cleanText(body.nickname, 80)
  const city = cleanText(body.city, 80)
  const favoriteDistance = cleanText(body.favoriteDistance, 80)
  const invoiceType = cleanText(body.invoiceType, 20) || 'none'
  const invoiceCarrier = cleanText(body.invoiceCarrier, 20).toUpperCase()
  const taxId = cleanText(body.taxId, 20)

  if (!nextName) {
    return NextResponse.json({ error: '請填寫姓名。' }, { status: 400 })
  }

  if (!['none', 'carrier', 'tax_id'].includes(invoiceType)) {
    return NextResponse.json({ error: '發票選項無效。' }, { status: 400 })
  }

  if (invoiceType === 'carrier' && !/^\/[0-9A-Z.+-]{7}$/.test(invoiceCarrier)) {
    return NextResponse.json({ error: '手機條碼載具格式應為「/」加 7 位英數字。' }, { status: 400 })
  }

  if (invoiceType === 'tax_id' && !/^\d{8}$/.test(taxId)) {
    return NextResponse.json({ error: '統一編號必須是 8 位數字。' }, { status: 400 })
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update({
      name: nextName,
      phone: cleanText(body.phone, 80),
      pb: cleanText(body.pb, 120),
      nickname,
      bio: cleanText(body.bio, 600),
      city,
      running_since: cleanText(body.runningSince, 40),
      favorite_distance: favoriteDistance,
      target_event: cleanText(body.targetEvent, 160),
      instagram: cleanText(body.instagram, 120).replace(/^@/, ''),
      facebook: cleanText(body.facebook, 240),
      goal: cleanText(body.goal, 300),
      email: user.email ?? '',
    })
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { error: billingError } = await supabaseAdmin
    .from('profile_billing_preferences')
    .upsert({
      profile_id: user.id,
      invoice_type: invoiceType,
      invoice_carrier: invoiceType === 'carrier' ? invoiceCarrier : '',
      tax_id: invoiceType === 'tax_id' ? taxId : '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })

  if (billingError) {
    return NextResponse.json({ error: billingError.message }, { status: 500 })
  }

  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      name: nextName,
    },
  })

  if (nickname && city && favoriteDistance) {
    const { data: profileBadge } = await supabaseAdmin
      .from('achievement_badges')
      .select('id')
      .eq('slug', 'runner-profile')
      .eq('active', true)
      .maybeSingle()

    if (profileBadge) {
      await supabaseAdmin.from('profile_achievements').upsert(
        {
          profile_id: user.id,
          badge_id: profileBadge.id,
          reason: '完成個人跑者資料',
        },
        { onConflict: 'profile_id,badge_id', ignoreDuplicates: true }
      )
    }
  }

  return accountResponse(profile)
}
