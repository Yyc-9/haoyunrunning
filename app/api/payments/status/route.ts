import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim()
  )

  let manualTransferConfigured = false
  if (supabaseAdmin) {
    const { count } = await supabaseAdmin
      .from('shop_payment_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
    manualTransferConfigured = (count ?? 0) > 0
  }

  return NextResponse.json(
    {
      cardConfigured: stripeConfigured,
      manualTransferConfigured,
      taiwanGatewayConfigured: false,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
