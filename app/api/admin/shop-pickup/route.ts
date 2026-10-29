import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
const headers = { 'Cache-Control':'private, no-store' }
const uuid = (v:unknown):v is string => typeof v==='string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v)
async function handle(request:NextRequest,write:boolean) {
  try {
    if (!supabaseAdmin) throw new Error('unavailable')
    const user = await getAuthedUser(request.headers.get('authorization'))
    if (!user) return NextResponse.json({error:'請先登入。'},{status:401,headers})
    if (!await getAdminProfile(user)) return NextResponse.json({error:'只有超級管理員可以管理配貨。'},{status:403,headers})
    if (write) {
      const body = await request.json().catch(()=>null)
      if (!uuid(body?.orderId) || (body.courseId !== null && !uuid(body.courseId)) || !['pending','packed','collected'].includes(body.status) || typeof body.updatedAt!=='string' || !Number.isFinite(Date.parse(body.updatedAt))) {
        return NextResponse.json({error:'配貨資料格式無效。'},{status:400,headers})
      }
      const {error} = await supabaseAdmin.rpc('admin_set_shop_pickup',{p_actor_id:user.id,p_order_id:body.orderId,p_course_id:body.courseId,p_status:body.status,p_expected_updated_at:body.updatedAt})
      if(error) {
        const messages:Record<string,string> = { order_changed:'訂單已被更新，請重新整理後再操作。', pickup_requires_class:'請先指定取貨班級。', invalid_pickup_class:'班級已變更，請重新整理。', order_not_found:'訂單不存在。' }
        return NextResponse.json({error:messages[error.message] || '配貨更新未完成，請重新整理後再試。'},{status:409,headers})
      }
      return NextResponse.json({ok:true},{headers})
    }
    const orders = []
    for(let from=0;;from+=500) {
      const {data,error} = await supabaseAdmin.from('shop_orders').select('id,order_number,user_id,customer_name,email,contact,status,updated_at,pickup_course_id,pickup_class_name,pickup_status,pickup_match_source,shop_order_items(product_id,name,quantity,size,variant_id,selected_specifications,is_preorder)').order('created_at',{ascending:false}).order('id').range(from,from+499)
      if(error) throw error
      orders.push(...(data??[]))
      if(!data || data.length<500) break
    }
    const {data:seasons,error:seasonError} = await supabaseAdmin.from('course_seasons').select('id,code').in('status',['active','enrolling'])
    if(seasonError) throw seasonError
    const {data:classes,error:classError} = await supabaseAdmin.from('course_season_courses').select('id,season_id,course_slug,course_data').in('season_id',(seasons??[]).map(s=>s.id))
    if(classError) throw classError
    const options=(classes??[]).map(c=>({id:c.id,name:(seasons??[]).find(s=>s.id===c.season_id)?.code+' '+(c.course_data?.name||c.course_slug)}))
    const candidates = new Map<string,Array<{id:string;name:string}>>()
    const accountEmails = new Map<string,string>()
    const result = []
    for(const order of orders) {
      let email=(order.email??'').trim().toLowerCase()
      if(order.user_id && !order.pickup_course_id && order.pickup_match_source==='unmatched') {
        if(!accountEmails.has(order.user_id)) {
          const {data,error}=await supabaseAdmin.auth.admin.getUserById(order.user_id)
          if(error) throw error
          accountEmails.set(order.user_id,data.user?.email_confirmed_at ? data.user.email??'' : '')
        }
        email=accountEmails.get(order.user_id)||email
      }
      if(!order.pickup_course_id && order.pickup_match_source==='unmatched' && email && !candidates.has(email)) {
        const {data,error}=await supabaseAdmin.rpc('shop_pickup_candidates',{p_email:email})
        if(error) throw error
        candidates.set(email,data??[])
      }
      const {user_id: _userId,...publicOrder}=order
      void _userId
      result.push({...publicOrder,candidates:!order.pickup_course_id && order.pickup_match_source==='unmatched' ? candidates.get(email)??[] : []})
    }
    return NextResponse.json({orders:result,options},{headers})
  } catch {
    return NextResponse.json({error:'配貨資料暫時無法讀取，請確認資料庫更新已完成後重試。'},{status:503,headers})
  }
}
export async function GET(request:NextRequest) { return handle(request,false) }
export async function PATCH(request:NextRequest) { return handle(request,true) }

