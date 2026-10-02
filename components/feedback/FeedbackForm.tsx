'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, CheckCircle2, ImagePlus, Lightbulb, Loader2, MessageSquareText, Monitor, ReceiptText, UsersRound, X } from 'lucide-react'
import { feedbackCategories as categories, type FeedbackCategory } from '@/lib/site-feedback'

type Attachment = { name: string; url: string; file: File }
export type FeedbackInput = { category: FeedbackCategory; description: string; related: string; attachments: Attachment[] }
const icons = [Monitor, ReceiptText, UsersRound, Lightbulb]

export default function FeedbackForm({ onSubmit, onClose }: { onSubmit: (input: FeedbackInput) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const created = useRef<string[]>([])
  const sending = useRef(false)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [description, setDescription] = useState('')
  const [related, setRelated] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  useEffect(() => {
    const element = dialog.current
    const urls = created.current
    element?.showModal()
    return () => { element?.close(); urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [])
  function close() {
    if (busy) return
    if (!success && (description.trim() || attachments.length) && !window.confirm('放棄尚未送出的內容？')) return
    onClose()
  }
  function addFiles(files: FileList | null) {
    if (!files?.length) return
    const selected = Array.from(files)
    if (selected.length + attachments.length > 3) { setError('最多可附上 3 張截圖，請移除一張後再加入。'); return }
    if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) { setError('請選擇 JPG、PNG 或 WebP 圖片。'); return }
    if (selected.some(file => file.size > 5 * 1024 * 1024)) { setError('每張截圖需小於 5 MB，請縮小圖片後再試。'); return }
    const next = selected.map(file => ({ name: file.name, url: URL.createObjectURL(file), file }))
    created.current.push(...next.map(file => file.url))
    setAttachments(current => [...current, ...next]); setError('')
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (sending.current) return
    if (!category) { setError('請先選擇回報類型。'); return }
    if (description.trim().length < 5) { setError('請再多描述一點，至少填寫 5 個字，讓我們了解遇到的情況。'); return }
    sending.current=true; setError(''); setBusy(true)
    try {
      await onSubmit({ category, description: description.trim(), related: ['報名與繳費','課程與教練'].includes(category) ? related.trim() : '', attachments })
      setSuccess(true)
    } catch (failure) { setError(failure instanceof Error ? failure.message : '這次沒有送出成功，內容已保留，請稍後再試。') }
    finally { sending.current=false; setBusy(false) }
  }
  return <dialog ref={dialog} aria-labelledby="feedback-title" onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) close() }} className="feedback-dialog m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45">
    {success ? <div className="px-6 py-10 text-center sm:px-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-9 w-9" /></div><h2 id="feedback-title" className="mt-6 text-2xl font-black">已收到，謝謝你的回饋</h2><p className="mt-3 text-sm leading-7 text-slate-500">好運團隊會查看你提供的內容，<br />作為後續處理與改善的依據。</p><button type="button" onClick={onClose} className="mt-8 min-h-12 w-full rounded-full bg-[#0066df] px-6 font-bold text-white hover:bg-[#0056bd]">完成</button></div> : <form onSubmit={submit}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-7"><div><p className="mb-2 flex items-center gap-2 text-xs font-bold text-[#0066df]"><MessageSquareText className="h-4 w-4" />好運跑班</p><h2 id="feedback-title" className="text-2xl font-black tracking-tight">問題回報</h2><p className="mt-2 text-xs leading-5 text-slate-500">免登入，也不需要填寫聯絡資料。</p></div><button type="button" disabled={busy} onClick={close} aria-label="關閉問題回報" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="space-y-5 px-5 py-5 sm:px-7">
        <fieldset disabled={busy}><legend className="mb-2.5 text-sm font-bold">回報類型 <span className="font-normal text-slate-400">必填</span></legend><div className="grid grid-cols-2 gap-2">{categories.map((item,index) => { const Icon=icons[index]; return <label key={item} className={`relative flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${category === item ? 'border-[#0066df] bg-blue-50 text-[#0057be]' : 'border-slate-200 hover:border-slate-400'}`}><input type="radio" name="feedback-category" className="peer sr-only" checked={category===item} onChange={() => { setCategory(item); setError('') }} /><span className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2" /><Icon className="h-4 w-4 shrink-0" /><span>{item}</span>{category===item && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}</label> })}</div></fieldset>
        <label className="block"><span className="text-sm font-bold">發生了什麼事？ <span className="font-normal text-slate-400">必填</span></span><textarea disabled={busy} value={description} onChange={event=>setDescription(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-base leading-7 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" placeholder="可以告訴我們在哪個頁面、做了什麼操作，以及遇到的情況。" /><span className="mt-1 flex justify-between gap-2 text-[11px] text-slate-400"><span>請勿填寫密碼或完整銀行帳號。</span><span>{description.length}/2000</span></span></label>
        {category && ['報名與繳費','課程與教練'].includes(category) && <label className="block"><span className="text-sm font-bold">相關班級或課次 <span className="font-normal text-slate-400">選填</span></span><input disabled={busy} value={related} onChange={event=>setRelated(event.target.value)} maxLength={100} className="apple-input mt-2 min-h-11" placeholder="例如：週三竹北夜跑班，10/7" /></label>}
        <div><p className="text-sm font-bold">附上截圖 <span className="font-normal text-slate-400">選填</span></p><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} onChange={event => { addFiles(event.target.files); event.target.value='' }} /><div className="mt-2 flex flex-wrap gap-2">{attachments.map(file=><div key={file.url} className="relative h-20 w-20 rounded-lg border border-slate-200"><Image src={file.url} alt={file.name} fill unoptimized className="rounded-lg object-cover" /><button disabled={busy} type="button" aria-label={`移除 ${file.name}`} onClick={()=>{ setAttachments(current=>current.filter(item=>item.url!==file.url)); URL.revokeObjectURL(file.url) }} className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white"><X className="h-4 w-4" /></button></div>)}{attachments.length<3 && <button type="button" disabled={busy} onClick={()=>input.current?.click()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-700"><ImagePlus className="h-5 w-5" />加入圖片</button>}</div><p className="mt-2 text-[11px] leading-5 text-slate-400">最多 3 張，每張 5 MB 以內。請先遮住圖片中的私人資訊。</p></div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}
      </div>
      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066df] px-6 font-bold text-white transition-colors hover:bg-[#0056bd] disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? '正在送出…' : '送出回報'}</button><p className="mt-2 text-center text-[11px] text-slate-400">內容僅供好運管理團隊查看。</p></div>
    </form>}
  </dialog>
}
