'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, CreditCard, ExternalLink, LockKeyhole, MessageCircle, PackageCheck, Send, ShieldCheck, Truck, X } from 'lucide-react'
import { useCart } from '@/app/cart-provider'
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
}

export default function CheckoutPage() {
  const { items, itemCount, total, clear } = useCart()
  const [form, setForm] = useState({
    customerName: '',
    contact: '',
    email: '',
    fulfillmentNote: '',
  })
  const [transferLastFive, setTransferLastFive] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false)
  const [error, setError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [transferMessage, setTransferMessage] = useState('')
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isStartingCardPayment, setIsStartingCardPayment] = useState(false)

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const submitOrder = async () => {
    setError('')
    setOrder(null)
    setTransferMessage('')
    setPaymentError('')

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

      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          items,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        order?: CreatedOrder
        error?: string
      }

      if (!response.ok || !payload.order?.orderNumber || !payload.order?.id) {
        throw new Error(payload.error || '訂單提交失敗。')
      }

      setOrder(payload.order)
      setIsPaymentModalOpen(true)
      clear()
      setForm({ customerName: '', contact: '', email: '', fulfillmentNote: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '訂單提交失敗。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitTransferDetails = async () => {
    setError('')
    setPaymentError('')
    setTransferMessage('')

    if (!order?.id) {
      setError('請先提交訂單。')
      return
    }

    if (!/^\d{5}$/.test(transferLastFive.trim())) {
      setError('請填寫 5 位銀行帳號後五碼。')
      return
    }

    setIsSubmittingTransfer(true)

    try {
      const response = await fetch('/api/shop/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          transferLastFive,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        order?: { status?: string }
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || '付款資料提交失敗。')
      }

      setOrder((current) => (current ? { ...current, status: payload.order?.status || 'pending_review' } : current))
      setTransferMessage('後五碼已送出，後台會進行人工核對。')
      setTransferLastFive('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '付款資料提交失敗。')
    } finally {
      setIsSubmittingTransfer(false)
    }
  }

  const startCardPayment = async () => {
    setPaymentError('')

    if (!order?.id) {
      setPaymentError('請先提交訂單。')
      return
    }

    if (!order.totalAmount || order.totalAmount <= 0) {
      setPaymentError('此訂單金額仍待確認，暫時無法啟用信用卡付款。')
      return
    }

    setIsStartingCardPayment(true)

    try {
      const response = await fetch('/api/shop/card-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string
        error?: string
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || '信用卡安全付款暫時無法啟動。')
      }

      window.location.href = payload.url
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : '信用卡安全付款暫時無法啟動。')
    } finally {
      setIsStartingCardPayment(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              商店結帳
            </p>
            <h1 className="mb-4 text-4xl font-black text-apple-gray-900 md:text-5xl">
              確認訂單
            </h1>
            <p className="text-lg leading-8 text-apple-gray-600">
              提交後會生成站內訂單、保留對應庫存，並分配一組後台收款通道用於人工對帳。
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="apple-card p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Truck className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="text-xl font-bold text-apple-gray-900">配送與聯絡資料</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className="apple-input"
                    value={form.customerName}
                    onChange={(event) => updateField('customerName', event.target.value)}
                    placeholder="姓名"
                  />
                  <input
                    className="apple-input"
                    value={form.contact}
                    onChange={(event) => updateField('contact', event.target.value)}
                    placeholder="手機 / LINE ID"
                  />
                  <input
                    className="apple-input sm:col-span-2"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="Email"
                  />
                  <input
                    className="apple-input sm:col-span-2"
                    value={form.fulfillmentNote}
                    onChange={(event) => updateField('fulfillmentNote', event.target.value)}
                    placeholder="配送地址或跑班自取備註"
                  />
                </div>
              </section>

              <section className="apple-card p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <PackageCheck className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="text-xl font-bold text-apple-gray-900">訂單與庫存</h2>
                </div>
                <div className="rounded-3xl bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-600">
                  訂單提交成功後，系統會立即扣除對應商品庫存。若後台標記付款異常，庫存會退回。
                </div>
              </section>

              <section className="apple-card p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="text-xl font-bold text-apple-gray-900">付款方式</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-black/10 bg-white p-5">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-apple-gray-100 text-apple-gray-900">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h3 className="font-black text-apple-gray-900">銀行轉帳 / 人工核對</h3>
                    <p className="mt-3 text-sm leading-6 text-apple-gray-600">
                      買家端不會顯示完整收款帳戶。請使用訂單編號作為付款備註，付款後填寫轉出帳戶後五碼。
                    </p>
                  </div>
                  <div className="rounded-3xl border border-black/10 bg-white p-5">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-apple-gray-100 text-apple-gray-900">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <h3 className="font-black text-apple-gray-900">客服確認</h3>
                    <p className="mt-3 text-sm leading-6 text-apple-gray-600">
                      若金額、配送或自取方式需要確認，可以先提交訂單，再透過 Instagram 聯絡好運。
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="apple-card h-fit p-6 md:p-8">
              <h2 className="mb-6 text-xl font-bold text-apple-gray-900">訂單摘要</h2>
              {items.length > 0 ? (
                <div className="mb-6 space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-black/10 pb-4">
                      <div>
                        <h3 className="font-semibold text-apple-gray-900">{item.name}</h3>
                        <p className="text-sm text-apple-gray-500">數量 {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-apple-gray-700">
                        {item.price > 0 ? `NT$${((item.price * item.quantity) / 100).toFixed(0)}` : '待確認'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-6 rounded-3xl bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-600">
                  購物車沒有商品。
                </div>
              )}

              <div className="mb-6 rounded-3xl bg-black p-5 text-white">
                <div className="mb-2 text-sm text-white/65">商品數量</div>
                <div className="text-3xl font-black">{itemCount}</div>
                <div className="mt-3 text-sm text-white/65">
                  {total > 0 ? `小計 NT$${(total / 100).toFixed(0)}` : '金額由後台/客服確認'}
                </div>
              </div>

              {order && (
                <div className="mb-4 space-y-4">
                  <div className="flex items-start gap-3 rounded-3xl bg-green-50 p-4 text-green-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-bold">訂單已同步</p>
                    <p className="mt-1 text-sm">訂單編號：{order.orderNumber}</p>
                    <p className="mt-1 text-sm">付款代號：{order.paymentReference || order.orderNumber}</p>
                    <p className="mt-1 text-sm">付款通道：{order.paymentChannelLabel || '待管理員分配'}</p>
                  </div>
                  </div>
                  <div className="rounded-3xl border border-black/10 bg-white p-4 text-sm leading-6 text-apple-gray-600">
                    付款資料會在彈出的付款界面處理；信用卡號與安全碼不會進入本站資料庫或後台。
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="apple-button-secondary mt-3 w-full gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      開啟付款界面
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-3xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting || items.length === 0}
                className="apple-button-primary mb-3 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? '提交中...' : '提交訂單'}
              </button>
              <Link
                href="https://www.instagram.com/nurture.running.team/"
                target="_blank"
                className="apple-button-outline w-full gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                聯絡好運
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {order && isPaymentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 py-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-black/10 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-apple-blue">Payment</p>
                <h2 className="mt-1 text-2xl font-black text-apple-gray-950">付款界面</h2>
                <p className="mt-1 text-sm text-apple-gray-500">訂單 {order.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-apple-gray-700 transition hover:bg-apple-gray-100"
                aria-label="關閉付款界面"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <section className="rounded-3xl bg-black p-5 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-white/65">應付金額</p>
                    <p className="mt-1 text-3xl font-black">
                      {order.totalAmount && order.totalAmount > 0 ? `NT$${(order.totalAmount / 100).toFixed(0)}` : '待確認'}
                    </p>
                  </div>
                  <div className="text-sm leading-6 text-white/70">
                    <p>付款代號：{order.paymentReference || order.orderNumber}</p>
                    <p>付款通道：{order.paymentChannelLabel || '待管理員分配'}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-black/10 bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-apple-gray-950">信用卡安全付款</h3>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                      卡號、有效期限與 CVV 只會在 Stripe 等合規收單頁面中填寫；本站不會接觸、儲存或傳送完整信用卡資料。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startCardPayment}
                  disabled={isStartingCardPayment || !order.totalAmount || order.totalAmount <= 0}
                  className="apple-button-primary mt-4 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  {isStartingCardPayment ? '正在啟動安全付款...' : '開啟信用卡安全付款'}
                </button>
                {!order.totalAmount || order.totalAmount <= 0 ? (
                  <p className="mt-3 text-sm leading-6 text-apple-gray-500">
                    目前商品金額為待確認，設定商品價格或收單通道後即可啟用信用卡付款。
                  </p>
                ) : null}
              </section>

              <section className="rounded-3xl border border-black/10 bg-apple-gray-50 p-5">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-apple-gray-900">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-apple-gray-950">銀行匯款 / 後台核對</h3>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                      買家端只顯示付款代號與通道名稱，不顯示完整收款帳戶。付款後填寫轉出帳戶後五碼，管理員後台再核對款項流向。
                    </p>
                  </div>
                </div>
                <label className="block">
                  <span className="text-sm font-bold text-apple-gray-700">轉出帳戶後五碼</span>
                  <input
                    value={transferLastFive}
                    onChange={(event) => setTransferLastFive(event.target.value.replace(/\D/g, '').slice(0, 5))}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="例如 12345"
                    className="apple-input mt-2 bg-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={submitTransferDetails}
                  disabled={isSubmittingTransfer || transferLastFive.length !== 5}
                  className="apple-button-secondary mt-3 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isSubmittingTransfer ? '送出中...' : '提交後五碼'}
                </button>
                {transferMessage ? <p className="mt-3 text-sm font-semibold text-emerald-700">{transferMessage}</p> : null}
              </section>

              {paymentError ? (
                <div className="rounded-3xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                  {paymentError}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
