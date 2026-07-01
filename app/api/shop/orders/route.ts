import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getCartProductId } from '@/lib/shop-products'

type OrderItemInput = {
  id?: string
  productId?: string
  variantId?: string
  size?: string
  name?: string
  price?: number
  quantity?: number
  image?: string
}

type OrderBody = {
  customerName?: string
  contact?: string
  email?: string
  fulfillmentNote?: string
  items?: OrderItemInput[]
}

type TransferBody = {
  orderId?: string
  transferLastFive?: string
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function createOrderNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `HY${stamp}${suffix}`
}

function isSetupError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false

  return (
    error.code === '42883' ||
    error.code === '42P01' ||
    error.code === '42703' ||
    /schema cache|does not exist|function .* does not exist|column .* does not exist/i.test(error.message ?? '')
  )
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization')).catch(() => null)
  const body = (await request.json().catch(() => ({}))) as OrderBody
  const customerName = cleanText(body.customerName)
  const contact = cleanText(body.contact)
  const email = cleanText(body.email)
  const fulfillmentNote = cleanText(body.fulfillmentNote)
  const items = (body.items ?? [])
    .map((item) => ({
      productId: cleanText(item.productId) || getCartProductId(cleanText(item.id)),
      variantId: cleanText(item.variantId),
      size: cleanText(item.size),
      quantity: Number.isInteger(item.quantity) && item.quantity! > 0 ? item.quantity! : 0,
    }))
    .filter((item) => item.productId && item.quantity > 0)

  if (!customerName || !contact) {
    return NextResponse.json({ error: '請填寫姓名和聯絡方式。' }, { status: 400 })
  }

  if (items.length === 0) {
    return NextResponse.json({ error: '購物車沒有可提交的商品。' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.rpc('create_shop_order_with_stock', {
    p_order_number: createOrderNumber(),
    p_user_id: user?.id ?? null,
    p_customer_name: customerName,
    p_contact: contact,
    p_email: email,
    p_fulfillment_note: fulfillmentNote,
    p_items: items,
  })

  if (error || !data) {
    if (isSetupError(error)) {
      return NextResponse.json(
        { error: '商城資料庫尚未完成升級，請先執行 supabase/shop-orders.sql。' },
        { status: 500 }
      )
    }

    const message = error?.message || '訂單提交失敗。'
    return NextResponse.json({ error: message }, { status: /庫存不足/.test(message) ? 409 : 500 })
  }

  return NextResponse.json({
    order: data,
  })
}

export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as TransferBody
  const orderId = cleanText(body.orderId)
  const transferLastFive = cleanText(body.transferLastFive)

  if (!orderId) {
    return NextResponse.json({ error: '缺少訂單 ID。' }, { status: 400 })
  }

  if (!/^\d{5}$/.test(transferLastFive)) {
    return NextResponse.json({ error: '銀行帳號後五碼必須是 5 位數字。' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .update({
      transfer_last_five: transferLastFive,
      payment_submitted_at: new Date().toISOString(),
      status: 'pending_review',
    })
    .eq('id', orderId)
    .in('status', ['pending_transfer', 'pending_review'])
    .select('id, order_number, status, transfer_last_five, payment_submitted_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || '訂單付款資料更新失敗。' }, { status: 500 })
  }

  return NextResponse.json({
    order: {
      id: data.id,
      orderNumber: data.order_number,
      status: data.status,
      transferLastFive: data.transfer_last_five,
      paymentSubmittedAt: data.payment_submitted_at,
    },
  })
}
