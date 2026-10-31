import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getCartProductId } from '@/lib/shop-products'
import { createOrderAccessToken } from '@/lib/order-access'
import { readSelectedSpecifications } from '@/lib/product-specifications'
import { readShopInvoice, shopInvoiceError } from '@/lib/shop-invoice'

type OrderItemInput = {
  id?: string
  productId?: string
  variantId?: string
  size?: string
  selectedSpecifications?: unknown
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
  pickupCourseId?: string
  invoice?: unknown
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
  const parsedBody = await request.json().catch(() => null)
  const body = (parsedBody && typeof parsedBody === 'object' ? parsedBody : {}) as OrderBody
  const customerName = cleanText(body.customerName)
  const contact = cleanText(body.contact)
  const email = cleanText(body.email).toLowerCase()
  const verifiedEmail = user?.email_confirmed_at ? user.email : undefined
  const pickupCourseId = cleanText(body.pickupCourseId)
  if (pickupCourseId && (!verifiedEmail || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(pickupCourseId))) {
    return NextResponse.json({ error: '請登入後重新確認取貨班級。' }, { status: 400 })
  }
  const fulfillmentNote = cleanText(body.fulfillmentNote)
  if (!body.invoice) return NextResponse.json({ error: '結帳頁已更新，請重新整理後確認發票資料，暫勿重複匯款。' }, { status: 409 })
  const invoice = readShopInvoice(body.invoice)
  const invoiceError = shopInvoiceError(invoice)
  if (invoiceError) return NextResponse.json({ error: invoiceError }, { status: 400 })
  const transferLastFive = cleanText(body.transferLastFive).replace(/\D/g, '').slice(-5)
  if (!Array.isArray(body.items) || body.items.length > 100 || body.items.some((item) => !item || typeof item !== 'object')) {
    return NextResponse.json({ error: '購物車資料格式無效。' }, { status: 400 })
  }
  if (body.items.some((item) => readSelectedSpecifications(item.selectedSpecifications) === null)) {
    return NextResponse.json({ error: '商品規格格式無效，請回商品頁重新選擇。' }, { status: 400 })
  }
  const items = body.items
    .map((item) => ({
      productId: cleanText(item.productId) || getCartProductId(cleanText(item.id)),
      variantId: cleanText(item.variantId),
      size: cleanText(item.size),
      selectedSpecifications: readSelectedSpecifications(item.selectedSpecifications)!,
      quantity: Number.isInteger(item.quantity) && item.quantity! > 0 ? item.quantity! : 0,
    }))
  if (items.some((item) => !item.productId || item.quantity <= 0)) {
    return NextResponse.json({ error: '購物車包含無效商品，請重新確認。' }, { status: 400 })
  }

  if (!customerName || !contact) {
    return NextResponse.json({ error: '請填寫姓名和聯絡方式。' }, { status: 400 })
  }

  if (items.length === 0) {
    return NextResponse.json({ error: '購物車沒有可提交的商品。' }, { status: 400 })
  }

  if (!/^\d{5}$/.test(transferLastFive)) {
    return NextResponse.json({ error: '請填寫正確的匯款帳號後五碼。' }, { status: 400 })
  }

  // A versioned RPC fails closed if the specification migration has not been applied.
  const { data, error } = await supabaseAdmin.rpc('create_shop_order_with_invoice', {
    p_order_number: createOrderNumber(),
    p_user_id: user?.id ?? null,
    p_customer_name: customerName,
    p_contact: contact,
    p_email: email,
    p_fulfillment_note: fulfillmentNote,
    p_items: items,
    p_match_email: verifiedEmail || email,
    p_pickup_course_id: pickupCourseId || null,
    p_transfer_last_five: transferLastFive,
    p_require_selection: Boolean(verifiedEmail),
    p_invoice: invoice,
  })

  if (error || !data) {
    if (isSetupError(error)) {
      return NextResponse.json(
        { error: '商城規格功能尚未完成資料庫升級，請聯絡好運協助，暫勿重複匯款。' },
        { status: 500 }
      )
    }

    const message = error?.message || '訂單提交失敗。'
    return NextResponse.json({ error: message }, { status: error?.code === '22023' ? 400 : /庫存不足/.test(message) ? 409 : 500 })
  }

  const order = data as Record<string, unknown>
  const orderId = cleanText(order.id)
  const accessToken = createOrderAccessToken(orderId)

  if (!orderId || !accessToken) {
    return NextResponse.json({ error: '訂單已建立，但安全憑證產生失敗，請聯絡客服。' }, { status: 500 })
  }

  const paymentSubmittedAt = new Date().toISOString()
  const paymentReference = cleanText(order.orderNumber)

  // Inventory, transfer proof and pickup assignment commit together in the RPC.

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
