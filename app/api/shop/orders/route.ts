import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type OrderItemInput = {
  id?: string
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

function cleanText(value: string | undefined) {
  return value?.trim() ?? ''
}

function createOrderNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `HY${stamp}${suffix}`
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未设置。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization')).catch(() => null)
  const body = (await request.json().catch(() => ({}))) as OrderBody
  const customerName = cleanText(body.customerName)
  const contact = cleanText(body.contact)
  const email = cleanText(body.email)
  const fulfillmentNote = cleanText(body.fulfillmentNote)
  const items = (body.items ?? [])
    .map((item) => ({
      product_id: cleanText(item.id),
      name: cleanText(item.name),
      price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
      quantity: Number.isInteger(item.quantity) && item.quantity! > 0 ? item.quantity! : 0,
      image: cleanText(item.image),
    }))
    .filter((item) => item.product_id && item.name && item.quantity > 0)

  if (!customerName || !contact) {
    return NextResponse.json({ error: '请填写姓名和联系方式。' }, { status: 400 })
  }

  if (items.length === 0) {
    return NextResponse.json({ error: '购物车没有可提交的商品。' }, { status: 400 })
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('shop_orders')
    .insert({
      order_number: createOrderNumber(),
      user_id: user?.id ?? null,
      customer_name: customerName,
      contact,
      email,
      fulfillment_note: fulfillmentNote,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      status: 'new',
    })
    .select('*')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message || '订单提交失败。' }, { status: 500 })
  }

  const { error: itemsError } = await supabaseAdmin
    .from('shop_order_items')
    .insert(items.map((item) => ({ ...item, order_id: order.id })))

  if (itemsError) {
    await supabaseAdmin.from('shop_orders').delete().eq('id', order.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.order_number,
      itemCount: order.item_count,
      status: order.status,
    },
  })
}
