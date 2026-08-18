'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  MessageCircle,
  Send,
  Store,
} from 'lucide-react'
import { useCart } from '@/app/cart-provider'
import { useSiteContent } from '@/app/site-content-provider'
import { supabase } from '@/lib/supabase'

type CreatedOrder = {
  id: string
  orderNumber: string
  itemCount: number
  status: string
  subtotal?: number
  totalAmount?: number
  accessToken: string
}

export default function CheckoutPage() {
  const { items, itemCount, total, clear } = useCart()
  const { brand } = useSiteContent()
  const [form, setForm] = useState({ customerName: '', contact: '', email: '' })
  const [customerNote, setCustomerNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<CreatedOrder | null>(null)

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const submitOrder = async () => {
    setError('')
    setOrder(null)

    if (items.length === 0) {
      setError('購物車沒有商品。')
      return
    }
    if (!form.customerName.trim() || !form.contact.trim()) {
      setError('請填寫姓名和聯絡方式。')
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data: { session },
      } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      const fulfillmentNote = [
        '取貨方式：跑班自取',
        customerNote.trim() ? `備註：${customerNote.trim()}` : '',
      ].filter(Boolean).join('\n')

      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ ...form, fulfillmentNote, items }),
      })
      const payload = (await response.json().catch(() => ({}))) as { order?: CreatedOrder; error?: string }

      if (!response.ok || !payload.order?.orderNumber || !payload.order?.id || !payload.order?.accessToken) {
        throw new Error(payload.error || '訂單提交失敗。')
      }

      setOrder(payload.order)
      clear()
      setForm({ customerName: '', contact: '', email: '' })
      setCustomerNote('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '訂單提交失敗。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">商店結帳</p>
            <h1 className="mb-4 text-4xl font-black text-apple-gray-900 md:text-5xl">確認訂單</h1>
            <p className="text-lg leading-8 text-apple-gray-600">
              填寫聯絡資料，確認商品與數量後提交跑班自取訂單。訂單成立後，團隊會透過你填寫的聯絡方式確認取貨時間與地點。
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <section className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <Store className="h-5 w-5 text-apple-gray-700" />
                <h2 className="text-xl font-bold text-apple-gray-900">聯絡與取貨資料</h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">姓名</span>
                  <input className="apple-input" value={form.customerName} onChange={(event) => updateField('customerName', event.target.value)} autoComplete="name" placeholder="收件人姓名" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">聯絡方式</span>
                  <input className="apple-input" value={form.contact} onChange={(event) => updateField('contact', event.target.value)} autoComplete="tel" placeholder="手機號碼或 LINE ID" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">電子信箱</span>
                  <input type="email" className="apple-input" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" placeholder="用於接收訂單通知（選填）" />
                </label>

                <div className="rounded-lg border border-black/10 bg-apple-gray-50 p-4 text-sm leading-6 text-apple-gray-600 sm:col-span-2">
                  目前商城僅提供跑班自取，網站不處理線上付款或銀行匯款；團隊會透過你填寫的聯絡方式確認自取時間與地點。
                </div>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">訂單備註</span>
                  <textarea className="apple-input min-h-24 resize-y" value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder="尺寸或其他需求（選填）" />
                </label>
              </div>
            </section>

            <aside className="apple-card p-6 md:p-8 lg:sticky lg:top-28">
              <h2 className="mb-6 text-xl font-bold text-apple-gray-900">訂單摘要</h2>
              {items.length > 0 ? (
                <div className="mb-6 space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-6 text-apple-gray-900">{item.name}</h3>
                        <p className="mt-1 text-sm text-apple-gray-500">{item.size ? `尺寸 ${item.size} · ` : ''}數量 {item.quantity}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-apple-gray-700">NT$${((item.price * item.quantity) / 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-6 rounded-lg bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-600">購物車沒有商品。</div>
              )}

              <div className="mb-5 rounded-lg bg-black p-5 text-white">
                <div className="flex items-center justify-between text-sm text-white/65"><span>商品數量</span><span>{itemCount}</span></div>
                <div className="mt-3 flex items-end justify-between"><span className="text-sm text-white/65">小計</span><span className="text-2xl font-black">NT${(total / 100).toFixed(0)}</span></div>
              </div>

              <div className="mb-5 flex items-start gap-3 rounded-lg border border-black/10 bg-apple-gray-50 p-4 text-sm leading-6 text-apple-gray-700">
                <Store className="mt-0.5 h-5 w-5 shrink-0" />
                <span>目前商城僅提供跑班自取，網站不處理線上付款或銀行匯款；團隊會另行通知取貨安排。</span>
              </div>

              {order ? (
                <div className="mb-4 flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">跑班自取訂單已建立</p>
                    <p className="mt-1 text-sm">訂單編號：{order.orderNumber}</p>
                    <p className="mt-2 text-sm leading-6">團隊會透過你填寫的聯絡方式確認自取時間與地點。</p>
                    <a href={brand.instagramUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold underline underline-offset-4"><MessageCircle className="h-4 w-4" />需要協助請聯絡官方 Instagram</a>
                  </div>
                </div>
              ) : null}

              {error ? <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{error}</div> : null}

              <button type="button" onClick={submitOrder} disabled={isSubmitting || items.length === 0} className="apple-button-primary mb-3 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                <Send className="h-4 w-4" />
                {isSubmitting ? '正在建立自取訂單...' : '提交跑班自取訂單'}
              </button>
              <Link href="/shop" className="apple-button-outline w-full gap-2">返回商店</Link>
            </aside>
          </div>
        </div>
      </section>

    </main>
  )
}
