'use client'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/app/language-context'
import { supabase } from '@/lib/supabase'
import { toEnglishWebsiteText } from '@/lib/english-website'
import { useAdminUnsavedChanges } from '@/lib/admin-unsaved-changes'

type Fields = { name:string; phone:string; pb:string; goal:string; adminNote:string }
type Details = { student:Fields & { email:string }; fingerprint:string; audit:Array<{id:string;reason:string;actor_name:string;created_at:string}> }
async function detailsFetch(studentId:string,body?:Record<string,unknown>) {
  const {data}=supabase ? await supabase.auth.getSession() : {data:{session:null}}
  if(!data.session) throw new Error('請重新登入。')
  const response=await fetch(`/api/admin/student-details${body?'':`?studentId=${encodeURIComponent(studentId)}`}`,{
    method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify({studentId,...body})}:{}),
  })
  const result=await response.json()
  if(!response.ok) throw new Error(result.error || '學員資料管理暫時無法使用，請稍後重試。')
  return result
}
export default function AdminStudentEditor({studentId,onSaved}:{studentId:string;onSaved:()=>Promise<void>}) {
  const {language}=useLanguage(); const en=language==='en'
  const [details,setDetails]=useState<Details|null>(null)
  const [fields,setFields]=useState<Fields>({name:'',phone:'',pb:'',goal:'',adminNote:''})
  const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('')
  const saving=useRef(false);const mounted=useRef(true)
  useAdminUnsavedChanges(Boolean(details && (reason || (Object.keys(fields) as Array<keyof Fields>).some(key=>fields[key]!==details.student[key]))))
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
  const t=(zh:string,english:string)=>en?english:zh
  const report=(cause:unknown)=>setError(cause instanceof Error?cause.message:String(cause))
  async function load() {
    setBusy(true);setError('');setMessage('')
    try {const next=await detailsFetch(studentId) as Details;if(!mounted.current)return;setDetails(next);setFields({name:next.student.name,phone:next.student.phone,pb:next.student.pb,goal:next.student.goal,adminNote:next.student.adminNote});setReason('')}
    catch(cause){if(mounted.current)report(cause)}finally{if(mounted.current)setBusy(false)}
  }
  async function save() {
    if(saving.current||!details||!reason.trim())return
    saving.current=true;setBusy(true);setError('');setMessage('')
    try {
      await detailsFetch(studentId,{changes:fields,reason:reason.trim(),fingerprint:details.fingerprint})
      if(!mounted.current)return
      setDetails(null);setReason('');setMessage(t('學員資料與內部備註已儲存。','Student details and internal notes saved.'))
      await onSaved()
    }catch(cause){if(mounted.current)report(cause)}finally{saving.current=false;if(mounted.current)setBusy(false)}
  }
  return <section className="space-y-3 rounded-xl border bg-white p-4">
    <h3 className="font-bold">{t('學員資料與內部備註','Student details and internal notes')}</h3>
    <p className="text-sm leading-6">{t('修改網站帳號的聯絡與跑步資料。內部備註只供管理員使用；報名、付款及登入信箱維持各自的管理流程。','Edit the account contact and running details. Internal notes are visible only to administrators; enrollment, payment and sign-in email use their own workflows.')}</p>
    {!details?<button type="button" disabled={busy} className="apple-button-outline" onClick={()=>void load()}>{t('讀取並編輯資料','Load details to edit')}</button>:<form className="space-y-3" onSubmit={event=>{event.preventDefault();void save()}}>
      <p className="break-all text-sm">{details.student.email}</p>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        {([['name','姓名','Name',120],['phone','電話','Phone',80],['pb','最佳成績','Personal best',120]] as const).map(([key,zh,english,max])=><label key={key} className="grid gap-2 text-sm font-bold">{t(zh,english)}<input className="apple-input" required={key==='name'} maxLength={max} value={fields[key]} onChange={event=>setFields(current=>({...current,[key]:event.target.value}))}/></label>)}
        <label className="grid gap-2 text-sm font-bold">{t('跑步目標','Running goal')}<textarea className="apple-input" maxLength={300} value={fields.goal} onChange={event=>setFields(current=>({...current,goal:event.target.value}))}/></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{t('管理員內部備註','Internal admin notes')}<textarea className="apple-input" maxLength={2000} value={fields.adminNote} onChange={event=>setFields(current=>({...current,adminNote:event.target.value}))}/></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{t('修改原因','Reason for change')}<textarea required className="apple-input" maxLength={800} value={reason} onChange={event=>setReason(event.target.value)}/></label>
      </fieldset>
      <div className="flex flex-wrap gap-2"><button className="apple-button-primary" disabled={busy||!reason.trim()||!fields.name.trim()} type="submit">{t('儲存學員資料','Save student details')}</button><button type="button" disabled={busy} className="apple-button-outline" onClick={()=>{if(window.confirm(t('重新讀取會放棄尚未儲存的編輯，是否繼續？','Reload and discard unsaved edits?')))void load()}}>{t('重新讀取','Reload')}</button></div>
      <details><summary className="cursor-pointer text-sm font-bold">{t('最近修改紀錄','Recent changes')}</summary>{details.audit.map(entry=><p key={entry.id} className="mt-2 text-sm">{entry.reason} · {entry.actor_name||'—'} · {new Date(entry.created_at).toLocaleString(language)}</p>)}</details>
    </form>}
    {message?<p role="status" className="text-sm text-emerald-700">{message}</p>:null}
    {error?<p role="alert" className="text-sm text-red-700">{en?toEnglishWebsiteText(error):error}</p>:null}
  </section>
}
