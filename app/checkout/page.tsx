'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Copy,
  Landmark,
  MapPin,
  MessageCircle,
  Send,
  Store,
  Truck,
  X,
} from 'lucide-react'
import { useCart } from '@/app/cart-provider'
import { useSiteContent } from '@/app/site-content-provider'
import { useToast } from '@/app/toast-provider'
import { supabase } from '@/lib/supabase'

type CreatedOrder = {
  id: string
  orderNumber: string
  itemCount: number
  status: string
  subtotal?: number
  totalAmount?: number
  paymentReference?: string
  paymentChannelLabel?: string
  transferLastFive?: string
  paymentSubmittedAt?: string
  paymentAccount?: {
    label: string
    accountName: string
    bankName: string
    bankCode: string
    accountNumber: string
  } | null
  accessToken: string
}

type PaymentReadiness = {
  cardConfigured: boolean
  manualTransferConfigured: boolean
  taiwanGatewayConfigured: boolean
}

type FulfillmentMethod = 'delivery' | 'pickup'

export default function CheckoutPage() {
  const { items, itemCount, total, clear } = useCart()
  const { brand } = useSiteContent()
  const { showToast } = useToast()
  const [form, setForm] = useState({ customerName: '', contact: '', email: '' })
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('delivery')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false)
  const [error, setError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [transferLastFive, setTransferLastFive] = useState('')
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentReadiness, setPaymentReadiness] = useState<PaymentReadiness | null>(null)

  useEffect(() => {
    let active = true

    fetch('/api/payments/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: PaymentReadiness) => {
        if (active) setPaymentReadiness(payload)
      })
      .catch(() => {
        if (active) setPaymentReadiness({ cardConfigured: false, manualTransferConfigured: false, taiwanGatewayConfigured: false })
      })

    return () => {
      active = false
    }
  }, [])

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const copyOrderSummary = async () => {
    const lines = [
      '好運商店購物清單',
      ...items.map((item) => `${item.name}${item.size ? ` / 尺寸 ${item.size}` : ''} x ${item.quantity}｜NT$${((item.price * item.quantity) / 100).toFixed(0)}`),
      `合計：NT$${(total / 100).toFixed(0)}`,
    ]

    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      showToast('購物清單已複製', 'success')
    } catch {
      showToast('無法自動複製，請截圖購物清單後聯絡好運', 'info')
    }
  }

  const submitOrder = async () => {
    setError('')
    setPaymentError('')
    setOrder(null)

    if (items.length === 0) {
      setError('購物車沒有商品。')
      return
    }
    if (!paymentReadiness?.manualTransferConfigured) {
      setError('目前尚未設定商店匯款帳戶，請透過官方 Instagram 聯絡好運。')
      return
    }
    if (!form.customerName.trim() || !form.contact.trim()) {
      setError('請填寫姓名和聯絡方式。')
      return
    }
    if (fulfillmentMethod === 'delivery' && !deliveryAddress.trim()) {
      setError('請填寫配送地址。')
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data: { session },
      } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      const fulfillmentNote = [
        `取貨方式：${fulfillmentMethod === 'delivery' ? '配送' : '跑班自取'}`,
        fulfillmentMethod === 'delivery' ? `配送地址：${deliveryAddress.trim()}` : '',
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
      setIsPaymentModalOpen(true)
      clear()
      setForm({ customerName: '', contact: '', email: '' })
      setDeliveryAddress('')
      setCustomerNote('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '訂單提交失敗。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitTransfer = async () => {
    setPaymentError('')

    if (!order?.id || !order.accessToken) {
      setPaymentError('訂單憑證無效，請聯絡好運協助處理。')
      return
    }

    if (!/^\d{5}$/.test(transferLastFive)) {
      setPaymentError('請輸入匯款帳號後五碼（5 位數字）。')
      return
    }

    setIsSubmittingTransfer(true)

    try {
      const response = await fetch('/api/shop/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, accessToken: order.accessToken, transferLastFive }),
      })
      const payload = (await response.json().catch(() => ({}))) as { order?: Partial<CreatedOrder>; error?: string }

      if (!response.ok || !payload.order?.id) {
        throw new Error(payload.error || '匯款資料提交失敗。')
      }
      setOrder((current) => current ? { ...current, ...payload.order } : current)
      showToast('已回報匯款資料，待人工核對', 'success')
    } catch (startError) {
      setPaymentError(startError instanceof Error ? startError.message : '匯款資料提交失敗。')
    } finally {
      setIsSubmittingTransfer(false)
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
              {paymentReadiness?.manualTransferConfigured
                ? '填寫聯絡與取貨資料，確認商品和數量後完成訂購。訂單成立後會顯示專屬匯款資料。'
                : paymentReadiness
                  ? '目前尚未設定商店匯款帳戶，請透過好運跑班官方 Instagram 聯絡。'
                  : '正在確認本次訂購方式。'}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            {paymentReadiness === null ? (
              <section className="apple-card p-6 md:p-8" aria-label="正在確認訂購方式">
                <div className="h-6 w-40 animate-pulse rounded bg-apple-gray-200" />
                <div className="mt-6 space-y-4"><div className="h-12 animate-pulse rounded-lg bg-apple-gray-100" /><div className="h-12 animate-pulse rounded-lg bg-apple-gray-100" /><div className="h-28 animate-pulse rounded-lg bg-apple-gray-100" /></div>
              </section>
            ) : paymentReadiness.manualTransferConfigured ? (
            <section className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <Truck className="h-5 w-5 text-apple-gray-700" />
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

                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-bold text-apple-gray-700">取貨方式</legend>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-apple-gray-100 p-1">
                    <button type="button" aria-pressed={fulfillmentMethod === 'delivery'} onClick={() => { setFulfillmentMethod('delivery'); setError('') }} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition ${fulfillmentMethod === 'delivery' ? 'bg-white text-apple-gray-950 shadow-sm' : 'text-apple-gray-600 hover:text-apple-gray-950'}`}>
                      <Truck className="h-4 w-4" />配送
                    </button>
                    <button type="button" aria-pressed={fulfillmentMethod === 'pickup'} onClick={() => { setFulfillmentMethod('pickup'); setError('') }} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition ${fulfillmentMethod === 'pickup' ? 'bg-white text-apple-gray-950 shadow-sm' : 'text-apple-gray-600 hover:text-apple-gray-950'}`}>
                      <Store className="h-4 w-4" />跑班自取
                    </button>
                  </div>
                </fieldset>

                {fulfillmentMethod === 'delivery' ? (
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-apple-gray-700">配送地址</span>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-apple-gray-400" />
                      <input className="apple-input pl-12" value={deliveryAddress} onChange={(event) => { setDeliveryAddress(event.target.value); setError('') }} autoComplete="street-address" placeholder="郵遞區號、縣市、區域與完整地址" />
                    </div>
                  </label>
                ) : (
                  <div className="rounded-lg border border-black/10 bg-apple-gray-50 p-4 text-sm leading-6 text-apple-gray-600 sm:col-span-2">團隊會透過你填寫的聯絡方式確認自取時間與地點。</div>
                )}

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">訂單備註</span>
                  <textarea className="apple-input min-h-24 resize-y" value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder="尺寸、配送或其他需求（選填）" />
                </label>
              </div>
            </section>
            ) : (
              <section className="apple-card p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-apple-gray-100 text-apple-gray-900"><Store className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-bold text-apple-blue">專人訂購</p>
                    <h2 className="mt-1 text-2xl font-black text-apple-gray-950">把購物清單傳給好運跑班</h2>
                    <p className="mt-3 text-sm leading-6 text-apple-gray-600">團隊會依序確認商品庫存、取貨方式與付款安排，並透過官方帳號回覆你。</p>
                  </div>
                </div>
                <ol className="mt-7 divide-y divide-black/10 border-y border-black/10">
                  {['確認右側購物清單與數量', '點擊下方按鈕複製購物清單', '前往官方 Instagram 傳送清單'].map((step, index) => (
                    <li key={step} className="flex items-center gap-4 py-4 text-sm font-bold text-apple-gray-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">{index + 1}</span>{step}</li>
                  ))}
                </ol>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={copyOrderSummary} disabled={items.length === 0} className="apple-button-secondary gap-2 disabled:cursor-not-allowed disabled:opacity-50"><Copy className="h-4 w-4" />複製購物清單</button>
                  <a href={brand.instagramUrl} target="_blank" rel="noreferrer" className="apple-button-primary gap-2"><MessageCircle className="h-4 w-4" />前往 Instagram</a>
                </div>
              </section>
            )}

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

              {paymentReadiness?.manualTransferConfigured ? (
                <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <Landmark className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>本站商店採銀行匯款與人工核對，訂單成立後請依指定帳戶匯款，再回報後五碼。</span>
                </div>
              ) : null}

              {order ? (
                <div className="mb-4 flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">訂單已建立</p>
                    <p className="mt-1 text-sm">訂單編號：{order.orderNumber}</p>
                    <button type="button" onClick={() => setIsPaymentModalOpen(true)} className="mt-3 text-sm font-bold underline underline-offset-4">查看匯款資料</button>
                  </div>
                </div>
              ) : null}

              {error ? <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{error}</div> : null}

              {paymentReadiness?.manualTransferConfigured ? (
                <button type="button" onClick={submitOrder} disabled={isSubmitting || items.length === 0} className="apple-button-primary mb-3 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                  <Send className="h-4 w-4" />
                  {isSubmitting ? '正在建立訂單...' : '提交訂單並查看匯款資料'}
                </button>
              ) : null}
              <Link href="/shop" className="apple-button-outline w-full gap-2">返回商店</Link>
            </aside>
          </div>
        </div>
      </section>

      {order && isPaymentModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="payment-title">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-black/10 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-apple-blue">銀行匯款</p>
                <h2 id="payment-title" className="mt-1 text-2xl font-black text-apple-gray-950">完成匯款與回報</h2>
                <p className="mt-1 text-sm text-apple-gray-500">訂單 {order.orderNumber}</p>
              </div>
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-apple-gray-700 transition hover:bg-apple-gray-100" aria-label="關閉付款界面">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <section className="rounded-lg bg-black p-5 text-white">
                <p className="text-sm text-white/65">應付金額</p>
                <p className="mt-1 text-3xl font-black">NT${((order.totalAmount || 0) / 100).toFixed(0)}</p>
              </section>

              <section className="rounded-lg border border-black/10 bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800"><Landmark className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-black text-apple-gray-950">請匯款至指定帳戶</h3>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">完成匯款後填寫後五碼，財務會依訂單編號與金額進行人工核對。</p>
                  </div>
                </div>
                {order.paymentAccount ? (
                  <dl className="mt-5 divide-y divide-black/10 rounded-lg border border-black/10 bg-apple-gray-50 text-sm">
                    {[
                      ['收款帳戶', order.paymentAccount.label],
                      ['銀行', `${order.paymentAccount.bankName}${order.paymentAccount.bankCode ? `（${order.paymentAccount.bankCode}）` : ''}`],
                      ['戶名', order.paymentAccount.accountName],
                      ['帳號', order.paymentAccount.accountNumber],
                      ['匯款備註', order.paymentReference || order.orderNumber],
                    ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 px-4 py-3"><dt className="shrink-0 font-bold text-apple-gray-500">{label}</dt><dd className="break-all text-right font-black text-apple-gray-900">{value || '請聯絡好運確認'}</dd></div>)}
                  </dl>
                ) : <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">此訂單尚未取得收款帳戶，請保留訂單編號並透過官方 Instagram 聯絡好運。</p>}
                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">匯款帳號後五碼</span>
                  <input inputMode="numeric" maxLength={5} pattern="[0-9]{5}" value={transferLastFive} onChange={(event) => { setTransferLastFive(event.target.value.replace(/\D/g, '').slice(0, 5)); setPaymentError('') }} className="apple-input" placeholder="請輸入 5 位數字" />
                </label>
                <button type="button" onClick={submitTransfer} disabled={isSubmittingTransfer || !order.paymentAccount} className="apple-button-primary mt-4 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                  <CheckCircle2 className="h-4 w-4" />
                  {isSubmittingTransfer ? '正在提交匯款資料...' : order.status === 'pending_review' ? '更新匯款後五碼' : '提交匯款後五碼'}
                </button>
                <p className="mt-3 text-xs leading-5 text-apple-gray-500">提交後狀態會顯示「已回報，待人工核對」；管理員確認銀行入帳後才會變更為「已確認入帳」。</p>
              </section>

              {paymentError ? <div className="rounded-lg bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{paymentError}</div> : null}
              <a href={brand.instagramUrl} target="_blank" rel="noreferrer" className="apple-button-outline w-full gap-2"><MessageCircle className="h-4 w-4" />付款需要協助</a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
