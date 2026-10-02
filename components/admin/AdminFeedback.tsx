'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Inbox, Loader2, MessageCircleWarning, RefreshCw, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { feedbackCategories, feedbackStatuses, type FeedbackSummary, type SiteFeedback } from '@/lib/site-feedback'
import { confirmAdminWorkspaceChange, useAdminUnsavedChanges } from '@/lib/admin-unsaved-changes'

async function request<T>(url: string, body?: unknown): Promise<T> {
  const token=(await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('請先登入超級管理員帳號。')
  const response=await fetch(url,{method:body?'PATCH':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const value=await response.json()
  if (!response.ok) throw new Error(value.error || '讀取問題回報失敗。')
  return value as T
}
function changed() { window.dispatchEvent(new Event('site-feedback-updated')) }
export function useFeedbackSummary(enabled: boolean) {
  const [summary,setSummary]=useState<FeedbackSummary|null>(null)
  useEffect(()=>{
    if (!enabled) return
    let active=true
    const refresh=()=>{request<{summary:FeedbackSummary}>('/api/admin/feedback?summary=1').then(value=>{if(active)setSummary(value.summary)}).catch(()=>{if(active)setSummary(null)})}
    refresh()
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible') refresh()},60000)
    window.addEventListener('site-feedback-updated',refresh)
    return ()=>{active=false;clearInterval(timer);window.removeEventListener('site-feedback-updated',refresh)}
  },[enabled])
  return summary
}
export function FeedbackOverview({summary,onOpen}:{summary:FeedbackSummary|null;onOpen:()=>void}) {
  return <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><MessageCircleWarning className="h-6 w-6 text-blue-700" /><div><h2 className="font-bold text-[#092d3a]">問題回報</h2><p className="mt-1 text-xs text-slate-500">{summary ? summary.pending+' 則待處理 · '+summary.unread+' 則未讀' : '回報統計暫時無法讀取，請進入查看。'}</p></div></div><button type="button" onClick={onOpen} className="min-h-11 rounded-full bg-blue-50 px-4 text-sm font-bold text-blue-700">查看回報</button></div>
  </section>
}
const tone:Record<string,string>={'待處理':'bg-amber-50 text-amber-800','處理中':'bg-blue-50 text-blue-700','已解決':'bg-emerald-50 text-emerald-700'}
function date(value:string) { return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)) }

function Detail({item,onBack,onSaved}:{item:SiteFeedback;onBack:()=>void;onSaved:(item:SiteFeedback)=>void}) {
  const [note,setNote]=useState(item.note)
  const [status,setStatus]=useState(item.status)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [saved,setSaved]=useState(false)
  const dirty=note!==item.note || status!==item.status
  useAdminUnsavedChanges(dirty || saving)
  async function save() {
    if(saving)return
    setSaving(true);setError('')
    try {
      const result=await request<{item:SiteFeedback}>('/api/admin/feedback',{id:item.id,status,note,updated_at:item.updated_at})
      setNote(result.item.note);setSaved(true)
      onSaved({...result.item,attachments:item.attachments})
      changed()
    } catch(failure) {setError(failure instanceof Error?failure.message:'儲存失敗，請重試。')}
    finally{setSaving(false)}
  }
  return <section aria-label="回報詳情" className="min-w-0 rounded-2xl border border-slate-200 bg-white">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5"><button type="button" disabled={saving} onClick={()=>{if(confirmAdminWorkspaceChange())onBack()}} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />返回列表</button><span className={'rounded-full px-3 py-1 text-xs font-bold '+tone[item.status]}>{item.status}</span></div>
    <div className="space-y-6 p-5"><div><p className="text-xs font-bold text-blue-700">{item.category}</p><h2 className="mt-2 break-words text-lg font-bold leading-8 text-[#092d3a]">{item.description.slice(0,35)}{item.description.length>35?'…':''}</h2><p className="mt-2 text-xs text-slate-500">{date(item.created_at)} · 匿名回報</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="text-xs font-bold text-slate-500">回報內容</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{item.description}</p>{item.related&&<p className="mt-4 border-t pt-3 text-sm">相關班級／課次：{item.related}</p>}</div>
      <dl className="grid grid-cols-2 gap-4 text-xs"><div><dt className="text-slate-500">回報來源</dt><dd className="mt-2 break-all">{item.source==='/'?'首頁':item.source}</dd></div><div><dt className="text-slate-500">使用裝置</dt><dd className="mt-2">{item.device}</dd></div></dl>
      {item.attachments.length>0&&<div><h3 className="mb-3 text-sm font-bold">附圖 · {item.attachments.length} 張</h3><div className="flex flex-wrap gap-3">{item.attachments.map(file=><a key={file.path} href={file.url} target="_blank" rel="noreferrer" aria-label={'開啟截圖 '+file.name} className="relative block h-24 w-24 overflow-hidden rounded-xl border border-slate-200"><Image src={file.url!} alt={file.name} fill sizes="96px" unoptimized className="object-cover" /></a>)}</div><p className="mt-2 text-xs text-slate-500">圖片連結 10 分鐘後失效，重新開啟回報即可更新。</p></div>}
      <div className="space-y-4 border-t pt-5"><h3 className="text-sm font-bold">內部處理</h3><label className="block text-sm">處理狀態<select disabled={saving} value={status} onChange={event=>{setStatus(event.target.value as SiteFeedback['status']);setSaved(false)}} className="apple-input mt-2 min-h-11">{feedbackStatuses.map(value=><option key={value}>{value}</option>)}</select></label><label className="block text-sm">內部備註<textarea disabled={saving} value={note} maxLength={2000} rows={4} onChange={event=>{setNote(event.target.value);setSaved(false)}} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-base leading-7 focus:outline-blue-600" placeholder="記錄處理進度、處理方式或需要追蹤的事項。" /></label><p className="text-xs text-slate-500">僅供超級管理員查看，不會通知使用者。</p>
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><span role="status" className="text-xs text-slate-500">{dirty?'有尚未儲存的變更':saved?'已儲存內部處理紀錄':''}</span><button type="button" disabled={!dirty||saving} onClick={save} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#092d3a] px-5 text-sm font-bold text-white disabled:opacity-40">{saving?<Loader2 className="h-4 w-4 animate-spin" />:<Check className="h-4 w-4" />}{saving?'儲存中…':'儲存變更'}</button></div></div>
    </div>
  </section>
}

export default function AdminFeedback() {
  const [items,setItems]=useState<SiteFeedback[]>([])
  const [total,setTotal]=useState(0)
  const [summary,setSummary]=useState<FeedbackSummary|null>(null)
  const [status,setStatus]=useState('')
  const [category,setCategory]=useState('')
  const [query,setQuery]=useState('')
  const [page,setPage]=useState(0)
  const [revision,setRevision]=useState(0)
  const [loading,setLoading]=useState(true)
  const [opening,setOpening]=useState(false)
  const [error,setError]=useState('')
  const [selected,setSelected]=useState<SiteFeedback|null>(null)
  const sequence=useRef(0)
  const alive=useRef(true)
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
  const reload=useCallback(()=>setRevision(value=>value+1),[])
  useEffect(()=>{
    const id=++sequence.current
    let cancelled=false
    setLoading(true);setError('')
    const timer=window.setTimeout(()=>{
      const params=new URLSearchParams({q:query,status,category,page:String(page)})
      request<{items:SiteFeedback[];total:number;summary:FeedbackSummary}>('/api/admin/feedback?'+params).then(value=>{
        if(cancelled||!alive.current||id!==sequence.current)return
        setItems(value.items);setTotal(value.total);setSummary(value.summary)
      }).catch(failure=>{if(!cancelled&&alive.current&&id===sequence.current)setError(failure.message)}).finally(()=>{if(!cancelled&&alive.current&&id===sequence.current)setLoading(false)})
    },200)
    return ()=>{clearTimeout(timer);cancelled=true}
  },[query,status,category,page,revision])
  async function choose(item:SiteFeedback) {
    if(opening||!confirmAdminWorkspaceChange())return
    setOpening(true);setError('')
    try {
      const result=await request<{item:SiteFeedback}>('/api/admin/feedback?id='+item.id)
      await request('/api/admin/feedback',{id:item.id,intent:'read'})
      if(!alive.current)return
      setSelected(result.item);reload();changed()
    } catch(failure) {if(alive.current)setError(failure instanceof Error?failure.message:'讀取失敗。')}
    finally {if(alive.current)setOpening(false)}
  }
  function clear() {if(!confirmAdminWorkspaceChange())return;setSelected(null);setQuery('');setStatus('');setCategory('');setPage(0)}
  return <div className="min-w-0 space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-[#092d3a]">問題回報</h2><p className="mt-1 text-xs text-slate-500">集中查看問題與內部處理紀錄</p></div><button type="button" onClick={()=>{if(confirmAdminWorkspaceChange()){setSelected(null);reload();changed()}}} aria-label="重新整理回報" className="flex h-11 w-11 items-center justify-center rounded-full border bg-white"><RefreshCw className={'h-4 w-4 '+(loading?'animate-spin':'')} /></button></div>
    <div className={selected?'hidden xl:block space-y-4':'space-y-4'}>
      <div className="grid grid-cols-3 gap-2">{feedbackStatuses.map((value,index)=><button type="button" key={value} onClick={()=>{if(!confirmAdminWorkspaceChange())return;setStatus(value);setPage(0);setSelected(null)}} aria-pressed={status===value} className={'rounded-xl border bg-white p-3 text-left '+(status===value?'border-blue-600 ring-1 ring-blue-600':'border-slate-200')}><span className="text-xs text-slate-500">{value}</span><strong className="mt-2 block text-2xl text-[#092d3a]">{summary?[summary.pending,summary.inProgress,summary.resolved][index]:'—'}</strong></button>)}</div>
      <div className="flex flex-wrap gap-2"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input aria-label="搜尋回報" value={query} onChange={event=>{setQuery(event.target.value);setPage(0)}} placeholder="搜尋內容或班級" className="h-11 w-full min-w-36 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-base" /></label><select aria-label="篩選回報類型" value={category} onChange={event=>{setCategory(event.target.value);setPage(0)}} className="h-11 max-w-full rounded-xl border bg-white px-3 text-sm"><option value="">全部類型</option>{feedbackCategories.map(value=><option key={value}>{value}</option>)}</select></div>
      <div className="flex items-center justify-between text-xs text-slate-500"><button type="button" onClick={clear} className="min-h-10 rounded-full bg-[#092d3a] px-4 text-white">全部回報</button><span>{loading?'讀取中…':total+' 則符合條件'} · {summary?.unread ?? '—'} 則未讀</span></div>
    </div>
    {error&&<div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button className="ml-3 underline" type="button" onClick={reload}>重試</button></div>}
    {opening&&<p role="status" className="text-sm text-slate-500">正在開啟回報…</p>}
    <div className={'grid min-w-0 items-start gap-4 '+(selected?'xl:grid-cols-2':'')}>
      <section aria-label="回報列表" className={'overflow-hidden rounded-2xl border border-slate-200 bg-white '+(selected?'hidden xl:block':'')}>
        {loading?<p role="status" className="p-10 text-center text-sm text-slate-500">正在讀取回報…</p>:!error&&items.length===0?<div className="p-10 text-center"><Inbox className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-4 font-bold">目前沒有符合條件的回報</h3><button type="button" onClick={clear} className="mt-4 min-h-11 text-sm font-bold text-blue-700">顯示全部回報</button></div>:<div className="divide-y">{items.map(item=><button key={item.id} type="button" disabled={opening} onClick={()=>choose(item)} aria-label={'查看回報：'+item.description} className={'w-full p-5 text-left hover:bg-slate-50 '+(selected?.id===item.id?'bg-blue-50/60':'')}><div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-xs text-slate-500">{!item.read_at&&<span aria-label="未讀" className="h-2 w-2 rounded-full bg-blue-600" />}{item.category}</span><span className={'rounded-full px-2 py-1 text-xs '+tone[item.status]}>{item.status}</span></div><p className="mt-3 line-clamp-2 break-words text-sm font-semibold leading-6 text-[#092d3a]">{item.description}</p><p className="mt-3 text-xs text-slate-500">{date(item.created_at)} · {item.device}{item.attachments.length>0?' · '+item.attachments.length+' 張附圖':''}</p></button>)}</div>}
        {total>30&&<div className="flex items-center justify-between border-t p-3 text-sm"><button type="button" aria-label="上一頁回報" disabled={page===0||loading} onClick={()=>setPage(page-1)} className="h-11 w-11 disabled:opacity-30"><ChevronLeft /></button><span>第 {page+1} / {Math.ceil(total/30)} 頁</span><button type="button" aria-label="下一頁回報" disabled={(page+1)*30>=total||loading} onClick={()=>setPage(page+1)} className="h-11 w-11 disabled:opacity-30"><ChevronRight /></button></div>}
      </section>
      {selected&&<Detail key={selected.id} item={selected} onBack={()=>setSelected(null)} onSaved={item=>{setSelected(item);reload()}} />}
    </div>
  </div>
}
