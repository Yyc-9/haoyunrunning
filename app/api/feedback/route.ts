import { createHmac, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { FEEDBACK_BODY_LIMIT, FEEDBACK_FILE_LIMIT, isFeedbackId, isFeedbackImage, validateFeedback } from '@/lib/site-feedback'
export const runtime = 'nodejs'
export const maxDuration = 60
function json(body: unknown, status=200) { return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}}) }
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) return json({error:'回報服務暫時無法使用，請稍後再試。'},503)
  const origin=request.headers.get('origin')
  // Next's internal request URL can use localhost behind a reverse proxy.
  let sameOrigin=false
  try {
    const source=new URL(origin || '')
    sameOrigin=source.host===request.headers.get('host') && ['https:','http:'].includes(source.protocol)
  } catch { /* Invalid origins are rejected below. */ }
  if (!sameOrigin) return json({error:'請從好運網站送出回報。'},403)
  if (Number(request.headers.get('content-length') || 0)>FEEDBACK_BODY_LIMIT) return json({error:'附件過大，請縮小圖片後再試。'},413)
  const uploaded: string[]=[]
  let submissionId=''
  let committed=false
  try {
    // Bound the streamed request too; do not trust Content-Length.
    const reader=request.body?.getReader()
    if (!reader) return json({error:'缺少回報內容。'},400)
    let length=0
    const chunks: Uint8Array[]=[]
    while (true) {
      const {done,value}=await reader.read()
      if (done) break
      length+=value.length
      if (length>FEEDBACK_BODY_LIMIT) { await reader.cancel(); return json({error:'附件過大，請縮小圖片後再試。'},413) }
      chunks.push(value)
    }
    const form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type') || ''}}).formData()
    const id=form.get('id')
    if (!isFeedbackId(id)) return json({error:'回報格式有誤，請重新開啟表單。'},400)
    submissionId=id
    const category=form.get('category'), description=form.get('description'), related=form.get('related') || ''
    const invalid=validateFeedback({category,description,related})
    if (invalid) return json({error:invalid},400)
    if (form.get('website')) return json({ok:true})
    const files=form.getAll('files')
    if (files.length>3 || files.some(file=>!(file instanceof File) || file.size<=0 || file.size>FEEDBACK_FILE_LIMIT)) return json({error:'最多 3 張截圖，請縮小圖片後再試。'},400)
    const imageFiles=files as File[]
    const imageBytes=await Promise.all(imageFiles.map(async file=>new Uint8Array(await file.arrayBuffer())))
    if (imageFiles.some((file,i)=>!isFeedbackImage(imageBytes[i],file.type))) return json({error:'截圖必須為有效的 JPG、PNG 或 WebP 圖片。'},400)
    const {data:existing,error:lookupError}=await supabaseAdmin.from('site_feedback').select('id').eq('id',id).maybeSingle()
    if (lookupError) throw lookupError
    if (existing) return json({ok:true})
    const ip=(request.headers.get(process.env.VERCEL ? 'x-vercel-forwarded-for' : 'x-forwarded-for') || 'unknown').split(',')[0].trim()
    const secret=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    const key=createHmac('sha256',secret).update('site-feedback:'+ip).digest('hex')
    const {data:allowed,error:quotaError}=await supabaseAdmin.rpc('consume_feedback_quota',{p_key:key})
    if (quotaError) throw quotaError
    if (!allowed) return json({error:'回報次數較多，請一小時後再試。內容仍保留在此表單。'},429)
    const attachments=[]
    for (let i=0;i<imageFiles.length;i++) {
      const file=imageFiles[i]
      const extension=file.type==='image/png'?'png':file.type==='image/jpeg'?'jpg':'webp'
      const path=id+'/'+randomUUID()+'.'+extension
      const {error}=await supabaseAdmin.storage.from('site-feedback').upload(path,imageBytes[i],{contentType:file.type,upsert:false})
      if (error) throw error
      uploaded.push(path)
      attachments.push({path,name:file.name.slice(0,120)})
    }
    const source=String(form.get('source') || '/').split(/[?#]/)[0]
    const {error}=await supabaseAdmin.from('site_feedback').insert({
      id,category,description:String(description).trim(),related:String(related).trim(),
      source:source.startsWith('/') && !source.startsWith('//')?source.slice(0,200):'/',
      device:form.get('device')==='手機'?'手機':'電腦',attachments,
    })
    if (error) {
      if (error.code==='23505') return json({ok:true})
      throw error
    }
    committed=true
    return json({ok:true},201)
  } catch {
    return json({error:'這次沒有送出成功，內容已保留，請稍後再試。'},503)
  } finally {
    if (!committed && uploaded.length) {
      // A transport failure can happen after an INSERT commits. Never remove referenced files.
      const {data,error}=await supabaseAdmin.from('site_feedback').select('attachments').eq('id',submissionId).maybeSingle()
      if (!error) {
        const referenced=new Set((data?.attachments || []).map((file: {path:string})=>file.path))
        const unused=uploaded.filter(path=>!referenced.has(path))
        if (unused.length) await supabaseAdmin.storage.from('site-feedback').remove(unused).catch(()=>undefined)
      }
    }
  }
}
