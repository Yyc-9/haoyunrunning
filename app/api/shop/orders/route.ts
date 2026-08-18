import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getCartProductId } from '@/lib/shop-products'
import { createOrderAccessToken, verifyOrderAccessToken } from '@/lib/order-access'

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
  accessToken?: string
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

  const { count: activePaymentAccounts, error: paymentAccountError } = await supabaseAdmin
    .from('shop_payment_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)

  if (paymentAccountError) {
    return NextResponse.json({ error: '目前無法確認商店匯款帳戶，請稍後再試。' }, { status: 503 })
  }
  if ((activePaymentAccounts ?? 0) < 1) {
    return NextResponse.json({ error: '目前尚未設定商店匯款帳戶，請透過官方 Instagram 聯絡好運。' }, { status: 503 })
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

  // The RPC only returns the account label. Fetch the assigned account with the
  // service role so the customer can complete the same bank-transfer workflow
  // as course enrolments, without exposing any account list or service secret.
  let paymentAccount: {
    label: string
    accountName: string
    bankName: string
    bankCode: string
    accountNumber: string
  } | null = null
  let paymentAccountId = cleanText(order.paymentAccountId ?? order.payment_account_id)
  let paymentReference = cleanText(order.paymentReference ?? order.payment_reference)
  let paymentChannelLabel = cleanText(order.paymentChannelLabel ?? order.payment_account_label)
  if (!paymentAccountId || !paymentReference) {
    const { data: savedOrder } = await supabaseAdmin
      .from('shop_orders')
      .select('payment_reference, payment_account_id, payment_account_label')
      .eq('id', orderId)
      .maybeSingle()
    paymentAccountId ||= cleanText(savedOrder?.payment_account_id)
    paymentReference ||= cleanText(savedOrder?.payment_reference)
    paymentChannelLabel ||= cleanText(savedOrder?.payment_account_label)
  }
  if (paymentAccountId) {
    const { data: account } = await supabaseAdmin
      .from('shop_payment_accounts')
      .select('label, account_name, bank_name, bank_code, account_number')
      .eq('id', paymentAccountId)
      .maybeSingle()
    if (account) {
      paymentAccount = {
        label: account.label,
        accountName: account.account_name,
        bankName: account.bank_name,
        bankCode: account.bank_code,
        accountNumber: account.account_number,
      }
    }
  }

  return NextResponse.json({
    order: {
      ...order,
      paymentReference,
      paymentChannelLabel,
      paymentAccount,
      accessToken,
    },
  })
}

export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as TransferBody
  const orderId = cleanText(body.orderId)
  const accessToken = cleanText(body.accessToken)
  const transferLastFive = cleanText(body.transferLastFive)

  if (!orderId) {
    return NextResponse.json({ error: '缺少訂單 ID。' }, { status: 400 })
  }

  if (!verifyOrderAccessToken(orderId, accessToken)) {
    return NextResponse.json({ error: '訂單安全憑證無效，請重新提交訂單。' }, { status: 403 })
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
