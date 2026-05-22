import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '請先登入。' }, { status: 401 })
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

      return NextResponse.json({ profile: updatedProfile })
    }

    return NextResponse.json({ profile: existingProfile })
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
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
