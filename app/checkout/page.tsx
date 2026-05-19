'use client'

import Link from 'next/link'
import { CreditCard, LockKeyhole, MessageCircle, Smartphone, Truck } from 'lucide-react'
import { useCart } from '@/app/cart-provider'

const paymentMethods = [
  {
    icon: Smartphone,
    title: 'LINE Pay',
    description: '適合台灣使用者快速付款。之後接入金流後，會跳轉至 LINE Pay 完成授權付款。',
    status: '即將接入',
  },
  {
    icon: CreditCard,
    title: '信用卡',
    description: '可支援 Visa、Mastercard、JCB 等卡別，正式上線時會透過金流服務安全處理。',
    status: '即將接入',
  },
]

export default function CheckoutPage() {
  const { items, itemCount } = useCart()

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              Checkout
            </p>
            <h1 className="mb-4 text-4xl font-black text-apple-gray-900 md:text-5xl">
              確認訂單與付款方式
            </h1>
            <p className="text-lg leading-8 text-apple-gray-600">
              這裡先建立站內結帳流程。正式收款前，LINE Pay 與信用卡需要完成商家申請、金流串接與安全驗證。
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
                  <input className="apple-input" placeholder="姓名" />
                  <input className="apple-input" placeholder="手機 / LINE ID" />
                  <input className="apple-input sm:col-span-2" placeholder="Email" />
                  <input className="apple-input sm:col-span-2" placeholder="配送地址或跑班自取備註" />
                </div>
              </section>

              <section className="apple-card p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <LockKeyhole className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="text-xl font-bold text-apple-gray-900">付款方式</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.title}
                      type="button"
                      className="rounded-3xl border border-black/10 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
                          <method.icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-semibold text-apple-gray-600">
                          {method.status}
                        </span>
                      </div>
                      <h3 className="mb-2 text-lg font-bold text-apple-gray-900">{method.title}</h3>
                      <p className="text-sm leading-6 text-apple-gray-600">{method.description}</p>
                    </button>
                  ))}
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
                        待確認
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-6 rounded-3xl bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-600">
                  目前購物車沒有商品。你可以先回商店選擇商品，再回到這裡確認付款方式。
                </div>
              )}

              <div className="mb-6 rounded-3xl bg-black p-5 text-white">
                <div className="mb-2 text-sm text-white/65">商品數量</div>
                <div className="text-3xl font-black">{itemCount}</div>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  商品價格、運費與付款金額會在正式金流接入後由系統計算。
                </p>
              </div>

              <button
                type="button"
                className="apple-button-primary mb-3 w-full cursor-not-allowed opacity-60"
                disabled
              >
                付款功能即將開放
              </button>
              <Link
                href="https://www.instagram.com/nurture.running.team/"
                target="_blank"
                className="apple-button-outline w-full gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                先私訊好運確認訂單
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
