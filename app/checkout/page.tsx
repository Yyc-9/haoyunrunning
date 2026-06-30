'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, CreditCard, MessageCircle, PackageCheck, Send, ShieldCheck, Truck } from 'lucide-react'
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
  const [transferMessage, setTransferMessage] = useState('')
  const [order, setOrder] = useState<CreatedOrder | null>(null)

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const submitOrder = async () => {
    setError('')
    setOrder(null)
    setTransferMessage('')

    if (items.length === 0) {
      setError('购物车没有商品。')
      return
    }

    if (!form.customerName.trim() || !form.contact.trim()) {
      setError('请填写姓名和联系方式。')
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
        throw new Error(payload.error || '订单提交失败。')
      }

      setOrder(payload.order)
      clear()
      setForm({ customerName: '', contact: '', email: '', fulfillmentNote: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '订单提交失败。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitTransferDetails = async () => {
    setError('')
    setTransferMessage('')

    if (!order?.id) {
      setError('请先提交订单。')
      return
    }

    if (!/^\d{5}$/.test(transferLastFive.trim())) {
      setError('请填写 5 位银行账号后五码。')
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
        throw new Error(payload.error || '付款资料提交失败。')
      }

      setOrder((current) => (current ? { ...current, status: payload.order?.status || 'pending_review' } : current))
      setTransferMessage('后五码已送出，后台会进行人工核对。')
      setTransferLastFive('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '付款资料提交失败。')
    } finally {
      setIsSubmittingTransfer(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              Checkout
            </p>
            <h1 className="mb-4 text-4xl font-black text-apple-gray-900 md:text-5xl">
              确认订单
            </h1>
            <p className="text-lg leading-8 text-apple-gray-600">
              提交后会生成站内订单、保留对应库存，并分配一组后台收款通道用于人工对账。
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="apple-card p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Truck className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="text-xl font-bold text-apple-gray-900">配送与联系资料</h2>
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
                    placeholder="手机 / LINE ID"
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
                    placeholder="配送地址或跑班自取备注"
                  />
                </div>
              </section>

              <section className="apple-card p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <PackageCheck className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="text-xl font-bold text-apple-gray-900">订单与库存</h2>
                </div>
                <div className="rounded-3xl bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-600">
                  订单提交成功后，系统会立即扣除对应商品库存。若后台标记付款异常，库存会退回。
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
                    <h3 className="font-black text-apple-gray-900">银行转账 / 人工核对</h3>
                    <p className="mt-3 text-sm leading-6 text-apple-gray-600">
                      买家端不会显示完整收款户头。请使用订单编号作为付款备注，付款后填写转出账户后五码。
                    </p>
                  </div>
                  <div className="rounded-3xl border border-black/10 bg-white p-5">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-apple-gray-100 text-apple-gray-900">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <h3 className="font-black text-apple-gray-900">客服确认</h3>
                    <p className="mt-3 text-sm leading-6 text-apple-gray-600">
                      若金额、配送或自取方式需要确认，可以先提交订单，再透过 Instagram 联系好运。
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="apple-card h-fit p-6 md:p-8">
              <h2 className="mb-6 text-xl font-bold text-apple-gray-900">订单摘要</h2>
              {items.length > 0 ? (
                <div className="mb-6 space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-black/10 pb-4">
                      <div>
                        <h3 className="font-semibold text-apple-gray-900">{item.name}</h3>
                        <p className="text-sm text-apple-gray-500">数量 {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-apple-gray-700">
                        {item.price > 0 ? `NT$${((item.price * item.quantity) / 100).toFixed(0)}` : '待确认'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-6 rounded-3xl bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-600">
                  购物车没有商品。
                </div>
              )}

              <div className="mb-6 rounded-3xl bg-black p-5 text-white">
                <div className="mb-2 text-sm text-white/65">商品数量</div>
                <div className="text-3xl font-black">{itemCount}</div>
                <div className="mt-3 text-sm text-white/65">
                  {total > 0 ? `小计 NT$${(total / 100).toFixed(0)}` : '金额由后台/客服确认'}
                </div>
              </div>

              {order && (
                <div className="mb-4 space-y-4">
                  <div className="flex items-start gap-3 rounded-3xl bg-green-50 p-4 text-green-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-bold">订单已同步</p>
                    <p className="mt-1 text-sm">订单编号：{order.orderNumber}</p>
                    <p className="mt-1 text-sm">付款代号：{order.paymentReference || order.orderNumber}</p>
                    <p className="mt-1 text-sm">付款通道：{order.paymentChannelLabel || '待管理员分配'}</p>
                  </div>
                  </div>
                  <div className="rounded-3xl border border-black/10 bg-white p-4">
                    <label className="block">
                      <span className="text-sm font-bold text-apple-gray-700">转出账户后五码</span>
                      <input
                        value={transferLastFive}
                        onChange={(event) => setTransferLastFive(event.target.value.replace(/\D/g, '').slice(0, 5))}
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="例如 12345"
                        className="apple-input mt-2"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={submitTransferDetails}
                      disabled={isSubmittingTransfer || transferLastFive.length !== 5}
                      className="apple-button-secondary mt-3 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {isSubmittingTransfer ? '送出中...' : '提交后五码'}
                    </button>
                    {transferMessage ? <p className="mt-3 text-sm font-semibold text-emerald-700">{transferMessage}</p> : null}
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
                {isSubmitting ? '提交中...' : '提交订单'}
              </button>
              <Link
                href="https://www.instagram.com/nurture.running.team/"
                target="_blank"
                className="apple-button-outline w-full gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                联系好运
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
