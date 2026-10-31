import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { readShopInvoice } from '@/lib/shop-invoice'
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const user = await getAuthedUser(request.headers.get('authorization'))
    if (!user?.email_confirmed_at || !user.email) return NextResponse.json({ options: [] }, { headers })
    if (!supabaseAdmin) throw new Error('unavailable')
    const { data, error } = await supabaseAdmin.rpc('shop_pickup_candidates', { p_email: user.email })
    if (error) throw error
    // Only a verified session can retrieve its own prior registration details.
    // Project individual invoice fields, never return the full registration payload.
    const { data: registration, error: registrationError } = await supabaseAdmin.from('signup_leads')
      .select('name,phone,invoiceDelivery:payload->>invoiceDelivery,invoiceDetail:payload->>invoiceDetail,taxInvoiceInfo:payload->>taxInvoiceInfo')
      .eq('source', 'course_payment').eq('email', user.email.trim().toLowerCase())
      .or('registration_status.eq.active,and(registration_status.is.null,status.neq.rejected)')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle()
    if (registrationError) throw registrationError
    const invoice = readShopInvoice(registration)
    if (!invoice.invoiceDelivery) { invoice.invoiceDelivery = 'email'; invoice.invoiceDetail = user.email }
    return NextResponse.json({ options: data ?? [], defaults: {
      customerName: registration?.name ?? '', contact: registration?.phone ?? '', email: user.email,
      ...invoice,
    } }, { headers })
  } catch {
    return NextResponse.json({ error: '取貨班級暫時無法讀取，請稍後重試。' }, { status: 503, headers })
  }
}
