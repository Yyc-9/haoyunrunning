'use client'

import { useRef, useState } from 'react'
import { MessageCircleWarning } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { FeedbackInput } from './FeedbackForm'
const FeedbackForm = dynamic(() => import('./FeedbackForm'), { ssr: false })

// Re-encoding strips image metadata and keeps the entire request below the host's body limit.
async function prepareImage(file: File) {
  const url=URL.createObjectURL(file)
  try {
    const image=new Image()
    image.src=url
    await image.decode()
    let edge=2000
    for (let attempt=0;attempt<4;attempt++) {
      const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight))
      const canvas=document.createElement('canvas')
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale))
      canvas.height=Math.max(1,Math.round(image.naturalHeight*scale))
      const context=canvas.getContext('2d')
      if (!context) throw new Error('無法處理截圖，請換一張圖片後再試。')
      context.drawImage(image,0,0,canvas.width,canvas.height)
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.85-attempt*0.1))
      if (blob && blob.size<=1024*1024) return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.'+(blob.type==='image/webp'?'webp':'png'),{type:blob.type})
      edge=Math.round(edge*0.7)
    }
    throw new Error('截圖仍然過大，請裁切圖片後再試。')
  } finally { URL.revokeObjectURL(url) }
}

export default function FeedbackButton() {
  const [open,setOpen]=useState(false)
  const requestId=useRef('')
  async function submit(input: FeedbackInput) {
    const form=new FormData()
    form.set('id',requestId.current)
    form.set('category',input.category)
    form.set('description',input.description)
    form.set('related',input.related)
    form.set('source',window.location.pathname)
    form.set('device',window.innerWidth<768?'手機':'電腦')
    for (const attachment of input.attachments) form.append('files',await prepareImage(attachment.file))
    const response=await fetch('/api/feedback',{method:'POST',body:form})
    const result=await response.json().catch(()=>({}))
    if (!response.ok) throw new Error(result.error || '這次沒有送出成功，內容已保留，請稍後再試。')
  }
  return <>
    <button type="button" aria-label="問題回報" title="問題回報" onClick={()=>{requestId.current=crypto.randomUUID();setOpen(true)}} className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100 transition-colors group-hover:bg-blue-100"><MessageCircleWarning className="h-5 w-5" aria-hidden="true" /></span></button>
    {open&&<FeedbackForm onSubmit={submit} onClose={()=>setOpen(false)} />}
  </>
}
