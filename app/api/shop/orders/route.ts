import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getCartProductId } from '@/lib/shop-products'
import { createOrderAccessToken } from '@/lib/order-access'

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
  transferLastFive?: string
  items?: OrderItemInput[]
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
  const transferLastFive = cleanText(body.transferLastFive).replace(/\D/g, '').slice(-5)
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

  if (!/^\d{5}$/.test(transferLastFive)) {
    return NextResponse.json({ error: '請填寫正確的匯款帳號後五碼。' }, { status: 400 })
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

  const order = data as Record<string, unknown>
  const orderId = cleanText(order.id)
  const accessToken = createOrderAccessToken(orderId)

  if (!orderId || !accessToken) {
    return NextResponse.json({ error: '訂單已建立，但安全憑證產生失敗，請聯絡客服。' }, { status: 500 })
  }

  const paymentSubmittedAt = new Date().toISOString()
  const paymentReference = cleanText(order.orderNumber)

  // Keep the inventory-aware database function compatible, then attach the
  // transfer proof collected at checkout. Fulfillment remains running-class pickup.
  const { error: pickupUpdateError } = await supabaseAdmin
    .from('shop_orders')
    .update({
      status: 'pending_review',
      transfer_last_five: transferLastFive,
      payment_submitted_at: paymentSubmittedAt,
      payment_method: 'bank_transfer',
      payment_reference: paymentReference,
      payment_account_id: null,
      payment_account_label: '好運跑班官方匯款帳戶',
    })
    .eq('id', orderId)
  if (pickupUpdateError) {
    return NextResponse.json({ error: '訂單已建立，但匯款資料寫入失敗，請聯絡好運協助處理。' }, { status: 500 })
  }

  return NextResponse.json({
    order: {
      ...order,
      status: 'pending_review',
      transferLastFive,
      paymentSubmittedAt,
      paymentMethod: 'bank_transfer',
      paymentReference,
      paymentChannelLabel: '好運跑班官方匯款帳戶',
      fulfillmentMethod: 'pickup',
      accessToken,
    },
  })
}

export async function PATCH() {
  return NextResponse.json({ error: '商城匯款資料請在結帳時一併提交。' }, { status: 410 })
}
