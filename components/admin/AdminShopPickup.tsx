'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { effectivePickup, packingSummary, pickupLabels, type PickupOrder, type PickupOption, type PickupStatus } from '@/lib/shop-pickup'
import { rosterCsv } from '@/lib/enrollment-export'

async function requestPickup(method='GET', body?:unknown) {
  const session=supabase ? (await supabase.auth.getSession()).data.session : null
  const response=await fetch('/api/admin/shop-pickup',{method,cache:'no-store',headers:{
    'Content-Type':'application/json',...(session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{})
  },...(body?{body:JSON.stringify(body)}:{})})
  const payload=await response.json()
  if(!response.ok) throw new Error(payload.error||'配貨操作失敗。')
  return payload
}
function PickupCard({order,options,onSaved}:{order:PickupOrder;options:PickupOption[];onSaved:()=>Promise<void>}) {
  const matched=effectivePickup(order)
  const [courseId,setCourseId]=useState(matched?.id??'')
  const [status,setStatus]=useState<PickupStatus>(order.pickup_status)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const choices=[...options]
  if(matched && !choices.some(c=>c.id===matched.id)) choices.push(matched)
  async function save() {
    setBusy(true);setError('')
    try {
      await requestPickup('PATCH',{orderId:order.id,courseId:courseId||null,status,updatedAt:order.updated_at})
      await onSaved()
    } catch(error) {setError(error instanceof Error?error.message:'儲存失敗。')}
    finally {setBusy(false)}
  }
  const paymentLabels:Record<string,string>={approved:'已確認入帳',pending_review:'待核帳',pending_transfer:'待匯款',rejected:'待補件'}
  return <article className="rounded-xl border border-black/10 bg-white p-4">
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-bold">{order.customer_name} · {order.order_number}</h4><span className="text-sm">{paymentLabels[order.status]??order.status}／{pickupLabels[order.pickup_status]}</span></div>
    <p className="mt-1 break-all text-sm text-apple-gray-600">{order.email} · {order.contact}</p>
    <p className="mt-2 text-sm font-bold">{matched?.name??'待確認取貨班級'}{!order.pickup_course_id && matched ? '（自動匹配，儲存後固定）' : ''}</p>
    {!matched && order.candidates.length>1 ? <p className="mt-1 text-sm text-amber-800">匹配到多班：{order.candidates.map(c=>c.name).join('、')}，請確認取貨班級。</p>:null}
    <ul className="mt-3 space-y-1 text-sm">{order.shop_order_items.map((item,index)=><li key={index}>{item.name} · {item.size||'無尺碼'}{item.variant_id?' · '+item.variant_id:''} · {(item.selected_specifications??[]).map(s=>s.label+'：'+s.value).join('／')} × {item.quantity}{item.is_preorder?'（預購）':''}</li>)}</ul>
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
      <label className="text-sm">取貨班級<select className="apple-input mt-1" value={courseId} onChange={e=>setCourseId(e.target.value)} disabled={busy}><option value="">待確認</option>{choices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="text-sm">配貨狀態<select className="apple-input mt-1" value={status} onChange={e=>setStatus(e.target.value as PickupStatus)} disabled={busy}>{Object.entries(pickupLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <button className="apple-button-primary min-h-11 self-end px-4" disabled={busy} onClick={()=>void save()}>{busy?'儲存中…':'儲存配貨'}</button>
    </div>
    {error?<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>:null}
  </article>
}
export default function AdminShopPickup({refreshKey}:{refreshKey:string}) {
  const [orders,setOrders]=useState<PickupOrder[]>([])
  const [options,setOptions]=useState<PickupOption[]>([])
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [classId,setClassId]=useState('all')
  const [status,setStatus]=useState('all')
  const [query,setQuery]=useState('')
  const [page,setPage]=useState(1)
  const load=useCallback(async()=>{
    setLoading(true);setError('')
    try {const payload=await requestPickup();setOrders(payload.orders);setOptions(payload.options)}
    catch(error){setError(error instanceof Error?error.message:'讀取失敗。')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load,refreshKey])
  const choices=useMemo(()=>{
    const all=new Map(options.map(c=>[c.id,c]))
    for(const order of orders){const c=effectivePickup(order);if(c&&!all.has(c.id))all.set(c.id,c)}
    return [...all.values()]
  },[orders,options])
  const filtered=useMemo(()=>orders.filter(order=>{
    const pickup=effectivePickup(order)
    return (classId==='all'||(classId==='unmatched'?!pickup:pickup?.id===classId))
      && (status==='all'||status===order.pickup_status)
      && (!query.trim()||[order.customer_name,order.email,order.order_number,pickup?.name??''].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  }),[orders,classId,status,query])
  const summary=useMemo(()=>packingSummary(filtered),[filtered])
  const pages=Math.max(1,Math.ceil(filtered.length/25))
  const currentPage=Math.min(page,pages)
  function exportPacking() {
    const csv=rosterCsv(['班級','商品','尺碼','款式','規格','預購','數量'],summary.map(r=>[r.className,r.name,r.size,r.variant,r.specs,r.preorder?'是':'否',String(r.quantity)]))
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a');link.href=url;link.download='跑班配貨清單.csv';link.click();URL.revokeObjectURL(url)
  }
  return <section className="space-y-4 rounded-xl border border-black/10 bg-apple-gray-50 p-4 sm:p-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-black">跑班自取與配貨</h3><p className="mt-1 text-sm text-apple-gray-600">配貨狀態與核帳分開管理；未指定班級的訂單請先確認。</p></div><button className="apple-button-outline min-h-11 px-4" disabled={loading} onClick={()=>void load()}>重新整理</button></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">班級<select className="apple-input mt-1" value={classId} onChange={e=>{setClassId(e.target.value);setPage(1)}}><option value="all">全部班級</option><option value="unmatched">待確認</option>{choices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="text-sm">狀態<select className="apple-input mt-1" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="all">全部狀態</option>{Object.entries(pickupLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label className="text-sm">搜尋<input className="apple-input mt-1" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="姓名、信箱或訂單編號" /></label>
    </div>
    {error?<p role="alert" className="text-red-700">{error}</p>:loading?<p role="status">讀取配貨資料中…</p>:<>
      <details className="rounded-lg bg-white p-4"><summary className="min-h-11 cursor-pointer font-bold">各班待配貨數量（僅已入帳、尚未配貨）</summary>
        <button className="apple-button-outline my-3 min-h-11 px-4" onClick={exportPacking} disabled={!summary.length}>匯出配貨 CSV</button>
        {summary.length?<ul className="space-y-2 text-sm">{summary.map((r,i)=><li key={i}>{r.className}／{r.name}／{r.size}／{r.variant}／{r.specs} {r.preorder?'（預購）':''}：<strong>{r.quantity} 件</strong></li>)}</ul>:<p>沒有符合條件的待配貨商品。</p>}
      </details>
      <p className="text-sm">共 {filtered.length} 筆訂單</p>
      {filtered.slice((currentPage-1)*25,currentPage*25).map(order=><PickupCard key={order.id+order.updated_at} order={order} options={choices} onSaved={load}/>)}
      {!filtered.length?<p>沒有符合條件的訂單。</p>:null}
      <div className="flex items-center justify-between"><button className="apple-button-outline min-h-11 px-4" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>上一頁</button><span>{currentPage} / {pages}</span><button className="apple-button-outline min-h-11 px-4" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>下一頁</button></div>
    </>}
  </section>
}

