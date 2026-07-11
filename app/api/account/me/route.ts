import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, isRevokedDeviceSession, supabaseAdmin } from '@/lib/supabase-server'

const noStoreHeaders = {
  'Cache-Control': 'no-store',
}

type AccountUpdateBody = {
  name?: string
  phone?: string
  pb?: string
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

    const nextEmail = user.email ?? existingProfile.email ?? ''
    if (nextEmail && nextEmail !== existingProfile.email) {
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ email: nextEmail })
        .eq('id', user.id)
        .select('*')
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ profile: updatedProfile }, { headers: noStoreHeaders })
    }

    return NextResponse.json({ profile: existingProfile }, { headers: noStoreHeaders })
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? '',
      name:
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split('@')[0] ||
        '好運跑者',
      phone: (user.user_metadata?.phone as string | undefined) ?? '',
      pb: (user.user_metadata?.pb as string | undefined) ?? '',
      role: (user.user_metadata?.role as string | undefined) ?? 'student',
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

  return NextResponse.json({ profile }, { headers: noStoreHeaders })
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
  const nextName = body.name?.trim()

  if (!nextName) {
    return NextResponse.json({ error: '請填寫姓名。' }, { status: 400 })
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update({
      name: nextName,
      phone: body.phone?.trim() ?? '',
      pb: body.pb?.trim() ?? '',
      email: user.email ?? '',
    })
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      name: nextName,
    },
  })

  return NextResponse.json({ profile }, { headers: noStoreHeaders })
}
