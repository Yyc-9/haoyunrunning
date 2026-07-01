import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

type CardPaymentBody = {
  orderId?: string
}

type ShopOrderForPayment = {
  id: string
  order_number: string
  customer_name: string
  email: string | null
  status: string
  total_amount: number | null
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
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: '信用卡安全收單通道尚未設定。請先設定 STRIPE_SECRET_KEY，本站不會自行收集卡號或 CVV。' },
      { status: 501 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as CardPaymentBody
  const orderId = cleanText(body.orderId)

  if (!orderId) {
    return NextResponse.json({ error: '缺少訂單 ID。' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .select('id, order_number, customer_name, email, status, total_amount')
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

  const origin = getSiteOrigin(request)
  const form = new URLSearchParams()
  form.set('mode', 'payment')
  form.set('payment_method_types[0]', 'card')
  form.set('line_items[0][quantity]', '1')
  form.set('line_items[0][price_data][currency]', 'twd')
  form.set('line_items[0][price_data][unit_amount]', String(order.total_amount))
  form.set('line_items[0][price_data][product_data][name]', `好運商店訂單 ${order.order_number}`)
  form.set('success_url', `${origin}/checkout?payment=success&order=${encodeURIComponent(order.order_number)}`)
  form.set('cancel_url', `${origin}/checkout?payment=cancelled&order=${encodeURIComponent(order.order_number)}`)
  form.set('metadata[orderId]', order.id)
  form.set('metadata[orderNumber]', order.order_number)
  if (order.email) form.set('customer_email', order.email)

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string
    url?: string
    error?: { message?: string }
  }

  if (!response.ok || !payload.url) {
    return NextResponse.json(
      { error: payload.error?.message || '信用卡安全付款建立失敗。' },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json({
    sessionId: payload.id,
    url: payload.url,
  })
}
