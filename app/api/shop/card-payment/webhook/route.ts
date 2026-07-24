import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getStripeClient } from '@/lib/stripe'
import { isShopCardPaymentEnabled } from '@/lib/payment-features'

export const runtime = 'nodejs'

async function markOrderPaid(session: Stripe.Checkout.Session) {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')

  const orderId = session.metadata?.orderId || session.client_reference_id
  if (!orderId) throw new Error('Stripe 付款缺少訂單 ID。')

  const { data: order, error } = await supabaseAdmin
    .from('shop_orders')
    .select('id, status, total_amount, stripe_session_id')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error(error?.message || '找不到 Stripe 對應訂單。')
  if (order.status === 'approved') return

  if (order.stripe_session_id !== session.id) {
    throw new Error('Stripe 工作階段與訂單不一致。')
  }

  if (session.currency !== 'twd' || session.amount_total !== order.total_amount) {
    throw new Error('Stripe 付款金額與訂單不一致。')
  }

  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || ''

  const { error: updateError } = await supabaseAdmin
    .from('shop_orders')
    .update({
      status: 'approved',
      payment_method: 'card',
      payment_submitted_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      review_note: 'Stripe 信用卡付款已驗證。',
      stripe_payment_intent_id: paymentIntent,
      inventory_reserved: true,
    })
    .eq('id', orderId)
    .eq('stripe_session_id', session.id)

  if (updateError) throw new Error(updateError.message)
}

async function releaseExpiredOrder(session: Stripe.Checkout.Session) {
  if (!supabaseAdmin) throw new Error('Supabase 尚未設定。')

  const orderId = session.metadata?.orderId || session.client_reference_id
  if (!orderId) return

  const { error } = await supabaseAdmin.rpc('release_shop_order_inventory', {
    p_order_id: orderId,
    p_stripe_session_id: session.id,
  })

  if (error) throw new Error(error.message)
}

export async function POST(request: Request) {
  if (!isShopCardPaymentEnabled()) {
    return NextResponse.json({ error: '信用卡付款尚未開放。' }, { status: 503 })
  }

  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const signature = request.headers.get('stripe-signature')

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook 尚未設定。' }, { status: 503 })
  }

  if (!signature) {
    return NextResponse.json({ error: '缺少 Stripe 簽章。' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Stripe 簽章驗證失敗。' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status === 'paid') await markOrderPaid(session)
    }

    if (event.type === 'checkout.session.expired') {
      await releaseExpiredOrder(event.data.object as Stripe.Checkout.Session)
    }
  } catch (error) {
    console.error('Stripe webhook processing failed:', error)
    return NextResponse.json({ error: 'Stripe 事件處理失敗。' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
