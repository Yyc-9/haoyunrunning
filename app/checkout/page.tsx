'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, MessageCircle, PackageCheck, Send, Truck } from 'lucide-react'
import { useCart } from '@/app/cart-provider'
import { supabase } from '@/lib/supabase'

export default function CheckoutPage() {
  const { items, itemCount, clear } = useCart()
  const [form, setForm] = useState({
    customerName: '',
    contact: '',
    email: '',
    fulfillmentNote: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const submitOrder = async () => {
    setError('')
    setOrderNumber('')

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
        order?: { orderNumber?: string }
        error?: string
      }

      if (!response.ok || !payload.order?.orderNumber) {
        throw new Error(payload.error || '订单提交失败。')
      }

      setOrderNumber(payload.order.orderNumber)
      clear()
      setForm({ customerName: '', contact: '', email: '', fulfillmentNote: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '订单提交失败。')
    } finally {
      setIsSubmitting(false)
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
              提交后会生成站内订单，后台可读取订单与商品明细。
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
                  <h2 className="text-xl font-bold text-apple-gray-900">订单同步</h2>
                </div>
                <div className="rounded-3xl bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-600">
                  商品和联系资料会同步到订单表。提交成功后，购物车会自动清空。
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
                      <span className="text-sm font-semibold text-apple-gray-700">待确认</span>
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
              </div>

              {orderNumber && (
                <div className="mb-4 flex items-start gap-3 rounded-3xl bg-green-50 p-4 text-green-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-bold">订单已同步</p>
                    <p className="mt-1 text-sm">订单编号：{orderNumber}</p>
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
