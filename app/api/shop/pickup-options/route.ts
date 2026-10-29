import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const user = await getAuthedUser(request.headers.get('authorization'))
    if (!user?.email_confirmed_at || !user.email) return NextResponse.json({ options: [] }, { headers })
    if (!supabaseAdmin) throw new Error('unavailable')
    const { data, error } = await supabaseAdmin.rpc('shop_pickup_candidates', { p_email: user.email })
    if (error) throw error
    return NextResponse.json({ options: data ?? [] }, { headers })
  } catch {
    return NextResponse.json({ error: '取貨班級暫時無法讀取，請稍後重試。' }, { status: 503, headers })
  }
}
