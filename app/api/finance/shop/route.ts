import { NextRequest, NextResponse } from 'next/server'
import { authenticateFinanceRequest, financeNoStoreHeaders } from '@/lib/finance-access'
import { supabaseAdmin } from '@/lib/supabase-server'
import { financeShopMonthRange, shopFinanceStates, validateShopReview } from '@/lib/finance-shop'

export const runtime = 'nodejs'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: financeNoStoreHeaders() })
const fields = 'id,order_number,customer_name,email,contact,total_amount,status,transfer_last_five,created_at,updated_at,payment_submitted_at,payment_account_label,payment_method,reviewed_at,review_note,pickup_class_name,pickup_status,inventory_reserved,shop_order_items(id,name,quantity,price,size,variant_id,is_preorder,selected_specifications)'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const auth = await authenticateFinanceRequest(request)
  if ('response' in auth) return auth.response
  try {
    const params = new URL(request.url).searchParams
    const id = params.get('orderId')
    if (id) {
      if (!uuid.test(id)) return json({ error: '無效的訂單 ID。' }, 400)
      const { data: order, error } = await supabaseAdmin!.from('shop_orders').select(fields).eq('id', id).in('payment_method', ['bank_transfer', 'manual_review']).maybeSingle()
      if (error) throw error
      if (!order) return json({ error: '找不到匯款訂單。' }, 404)
      const { data: audit, error: auditError } = await supabaseAdmin!.from('finance_shop_review_audit').select('id,actor_id,action,reason,created_at').eq('order_id', id).order('created_at', { ascending: false }).limit(100)
      if (auditError) throw auditError
      return json({ order, audit: audit ?? [] })
    }
    const page = Number(params.get('page') || 1)
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) return json({ error: '頁碼無效。' }, 400)
    const status = params.get('status') || 'all'
    if (status !== 'all' && !Object.hasOwn(shopFinanceStates, status)) return json({ error: '狀態無效。' }, 400)
    const month = params.get('month') || ''
    const range = month ? financeShopMonthRange(month) : null
    if (month && !range) return json({ error: '月份無效。' }, 400)
    let query = supabaseAdmin!.from('shop_orders').select(fields, { count: 'exact' }).in('payment_method', ['bank_transfer', 'manual_review'])
    if (status !== 'all') query = query.eq('status', status)
    if (range) query = query.gte('created_at', range.from).lt('created_at', range.to)
    const search = (params.get('search') || '').replace(/[,()%_*"'\\]/g, ' ').trim().slice(0, 100)
    if (search) query = query.or(['customer_name', 'email', 'order_number', 'transfer_last_five'].map(column => `${column}.ilike.*${search}*`).join(','))
    const { data: orders, error, count } = await query.order('created_at', { ascending: false }).order('id').range((page - 1) * 25, page * 25 - 1)
    if (error) throw error
    return json({ orders: orders ?? [], total: count ?? 0, page, pageSize: 25 })
  } catch {
    return json({ error: '讀取商城匯款資料失敗，請稍後重試。' }, 500)
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateFinanceRequest(request)
  if ('response' in auth) return auth.response
  if (auth.readOnly) return json({ error: '此帳號僅供查閱。' }, 403)
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: '請提供有效的核帳資料。' }, 400)
  const invalid = validateShopReview(body)
  if (invalid) return json({ error: invalid }, 400)
  const { data, error } = await supabaseAdmin!.rpc('finance_review_shop_order', {
    p_actor_id: auth.user.id, p_order_id: body.orderId, p_status: body.status,
    p_reason: body.reason.trim(), p_confirm_receipt: body.confirmReceipt === true, p_expected_updated_at: body.updatedAt,
  })
  if (error) {
    const errors: Record<string, [number, string]> = {
      order_changed: [409, '訂單已被更新，請重新開啟訂單，核對最新資料後再操作。'],
      already_approved: [409, '此筆已確認入帳，不能再次核帳或退回。'],
      order_not_found: [404, '找不到訂單。'], finance_required: [403, '此帳號沒有財務權限。'],
      not_bank_transfer: [409, '此筆不是銀行匯款訂單，不能人工核帳。'],
      inventory_review_required: [409, '此訂單的金額或庫存保留狀態需由管理員檢查，尚未更改入帳狀態。'],
    }
    const [status, message] = errors[error.message] ?? [500, '核帳未完成，請重新整理後確認狀態。']
    return json({ error: message }, status)
  }
  return json({ order: data, message: body.status === 'approved' ? '已確認商城匯款入帳。' : '已標記待補資料，請聯絡學員確認匯款資訊。' })
}
