import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .eq('role', 'coach')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      coaches: (data ?? []).map((coach) => ({
        id: coach.id,
        name: coach.name || '好運教練',
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
