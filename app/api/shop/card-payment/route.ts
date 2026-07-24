import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyOrderAccessToken } from '@/lib/order-access'
import { getStripeClient } from '@/lib/stripe'
import { isShopCardPaymentEnabled } from '@/lib/payment-features'

type CardPaymentBody = {
  orderId?: string
  accessToken?: string
}

type ShopOrderForPayment = {
  id: string
  order_number: string
  customer_name: string
  email: string | null
  status: string
  total_amount: number | null
  stripe_session_id: string | null
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getSiteOrigin(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (siteUrl) return siteUrl.replace(/\/$/, '')
  return request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  if (!isShopCardPaymentEnabled()) {
    return NextResponse.json(
      { error: '信用卡付款尚未開放，目前請依網站提供的銀行匯款流程完成付款。' },
      { status: 503 }
    )
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: '信用卡安全收單通道尚未完成設定，本站不會自行收集卡號或 CVC。' },
      { status: 501 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as CardPaymentBody
  const orderId = cleanText(body.orderId)
  const accessToken = cleanText(body.accessToken)

  if (!orderId) {
    return NextResponse.json({ error: '缺少訂單 ID。' }, { status: 400 })
  }

  if (!verifyOrderAccessToken(orderId, accessToken)) {
    return NextResponse.json({ error: '訂單安全憑證無效，請重新提交訂單。' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .select('id, order_number, customer_name, email, status, total_amount, stripe_session_id')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || '找不到訂單。' }, { status: 404 })
  }

  const order = data as ShopOrderForPayment
  if (!['pending_transfer', 'pending_review'].includes(order.status)) {
    return NextResponse.json({ error: '此訂單目前不可啟動付款。' }, { status: 400 })
  }

  if (!order.total_amount || order.total_amount <= 0) {
    return NextResponse.json({ error: '此訂單金額仍待確認，暫時無法啟用信用卡付款。' }, { status: 400 })
  }

  if (order.stripe_session_id) {
    const existingSession = await stripe.checkout.sessions.retrieve(order.stripe_session_id).catch(() => null)
    if (existingSession?.status === 'open' && existingSession.url) {
      return NextResponse.json({ sessionId: existingSession.id, url: existingSession.url })
    }
  }

  const origin = getSiteOrigin(request)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    client_reference_id: order.id,
    customer_email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email || '') ? order.email || undefined : undefined,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'twd',
          unit_amount: order.total_amount,
          product_data: { name: `好運商店訂單 ${order.order_number}` },
        },
      },
    ],
    success_url: `${origin}/checkout?payment=success&session_id={CHECKOUT_SESSION_ID}&order=${encodeURIComponent(order.order_number)}`,
    cancel_url: `${origin}/checkout?payment=cancelled&order=${encodeURIComponent(order.order_number)}`,
    metadata: {
      orderId: order.id,
      orderNumber: order.order_number,
    },
  })

  if (!session.url) {
    return NextResponse.json({ error: '信用卡安全付款建立失敗。' }, { status: 500 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('shop_orders')
    .update({ payment_method: 'card', stripe_session_id: session.id })
    .eq('id', order.id)

  if (updateError) {
    await stripe.checkout.sessions.expire(session.id).catch(() => null)
    return NextResponse.json({ error: '付款工作階段無法綁定訂單，請稍後再試。' }, { status: 500 })
  }

  return NextResponse.json({
    sessionId: session.id,
    url: session.url,
  })
}
