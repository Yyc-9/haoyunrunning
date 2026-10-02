import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { feedbackCategories, feedbackStatuses, isFeedbackId, type FeedbackAttachment } from '@/lib/site-feedback'
export const runtime='nodejs'
function json(body: unknown,status=200) { return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}}) }
async function auth(request: NextRequest) {
  if (!supabaseAdmin) return {error:json({error:'回報服務尚未設定。'},503)}
  const user=await getAuthedUser(request.headers.get('authorization'))
  if (!user) return {error:json({error:'請先登入管理員帳號。'},401)}
  const admin=await getAdminProfile(user)
  if (!admin) return {error:json({error:'只有超級管理員可以查看問題回報。'},403)}
  return {admin}
}
async function summary() {
  const results=await Promise.all([
    ...feedbackStatuses.map(status=>supabaseAdmin!.from('site_feedback').select('id',{count:'exact',head:true}).eq('status',status)),
    supabaseAdmin!.from('site_feedback').select('id',{count:'exact',head:true}).is('read_at',null),
  ])
  if (results.some(result=>result.error)) throw new Error('summary failed')
  return {pending:results[0].count || 0,inProgress:results[1].count || 0,resolved:results[2].count || 0,unread:results[3].count || 0}
}
export async function GET(request: NextRequest) {
  try {
    const access=await auth(request); if (access.error) return access.error
    const params=request.nextUrl.searchParams
    if (params.get('summary')==='1') return json({summary:await summary()})
    const id=params.get('id')
    if (id) {
      if (!isFeedbackId(id)) return json({error:'回報編號有誤。'},400)
      const {data,error}=await supabaseAdmin!.from('site_feedback').select('*').eq('id',id).maybeSingle()
      if (error) throw error
      if (!data) return json({error:'找不到這則回報。'},404)
      const attachments=await Promise.all((data.attachments as FeedbackAttachment[]).map(async file=>{
        if (!file.path.startsWith(id+'/')) throw new Error('invalid attachment')
        const signed=await supabaseAdmin!.storage.from('site-feedback').createSignedUrl(file.path,600)
        if (signed.error) throw signed.error
        return {...file,url:signed.data.signedUrl}
      }))
      return json({item:{...data,attachments}})
    }
    const page=Math.max(0,Math.min(100000,Number(params.get('page')) || 0))
    const status=params.get('status'), category=params.get('category')
    let query=supabaseAdmin!.from('site_feedback').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id').range(page*30,page*30+29)
    if (feedbackStatuses.includes(status as typeof feedbackStatuses[number])) query=query.eq('status',status)
    if (feedbackCategories.includes(category as typeof feedbackCategories[number])) query=query.eq('category',category)
    const search=(params.get('q') || '').slice(0,100).replace(/[%_,()."\\]/g,' ').trim()
    if (search) query=query.or('description.ilike.%'+search+'%,related.ilike.%'+search+'%')
    const [{data,error,count},counts]=await Promise.all([query,summary()])
    if (error) throw error
    return json({items:data || [],total:count || 0,summary:counts})
  } catch { return json({error:'讀取回報失敗，請稍後重試。'},503) }
}
export async function PATCH(request: NextRequest) {
  try {
    const access=await auth(request); if (access.error) return access.error
    const body=await request.json().catch(()=>null)
    if (!body || !isFeedbackId(body.id)) return json({error:'回報編號有誤。'},400)
    if (body.intent==='read') {
      const {error}=await supabaseAdmin!.from('site_feedback').update({read_at:new Date().toISOString()}).eq('id',body.id).is('read_at',null)
      if (error) throw error
      return json({ok:true})
    }
    if (!feedbackStatuses.includes(body.status) || typeof body.note!=='string' || body.note.length>2000 || typeof body.updated_at!=='string') return json({error:'處理狀態或備註格式有誤。'},400)
    const {data,error}=await supabaseAdmin!.from('site_feedback').update({
      status:body.status,note:body.note.trim(),updated_at:new Date().toISOString(),updated_by:access.admin!.id,
    }).eq('id',body.id).eq('updated_at',body.updated_at).select('*').maybeSingle()
    if (error) throw error
    if (!data) return json({error:'這則回報已被更新，請保留備註並重新讀取後再儲存。'},409)
    return json({item:data})
  } catch { return json({error:'儲存失敗，請稍後重試。'},503) }
}

