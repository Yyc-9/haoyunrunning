'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Minus, Package, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { useCart, type CartItem } from '@/app/cart-provider'
import { useToast } from '@/app/toast-provider'
import type { ShopProduct } from '@/lib/shop-products'

type ShopCartDrawerProps = {
  products: ShopProduct[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatCartAmount(value: number) {
  return `NT$${Math.max(0, value / 100).toFixed(0)}`
}

export default function ShopCartDrawer({ products, open, onOpenChange }: ShopCartDrawerProps) {
  const { items, itemCount, total, updateQuantity, removeItem, clear, isEmpty } = useCart()
  const { showToast } = useToast()

  const getProduct = (item: CartItem) => products.find((product) => product.id === item.productId)

  const changeQuantity = (item: CartItem, quantity: number) => {
    if (quantity <= 0) {
      removeItem(item.id)
      return
    }

    const product = getProduct(item)
    if (product) {
      const otherQuantity = items
        .filter((cartItem) => cartItem.productId === item.productId && cartItem.id !== item.id)
        .reduce((sum, cartItem) => sum + cartItem.quantity, 0)
      const maxQuantity = Math.max(0, product.stockQuantity - otherQuantity)

      if (quantity > maxQuantity) {
        showToast(`${product.name} 庫存不足`, 'error')
        return
      }
    }

    updateQuantity(item.id, quantity)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center gap-3 rounded-full bg-black px-5 text-sm font-black text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-apple-gray-900"
        aria-label="開啟購物車"
      >
        <span className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 ? (
            <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-apple-orange px-1 text-[11px] leading-none text-white">
              {itemCount}
            </span>
          ) : null}
        </span>
        <span className="hidden sm:inline">購物車</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="關閉購物車"
              className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
              onClick={() => onOpenChange(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-apple-gray-500">Cart</p>
                  <h2 className="text-xl font-black text-apple-gray-950">購物車</h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-apple-gray-700 transition hover:bg-apple-gray-100"
                  aria-label="關閉購物車"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {items.length > 0 ? (
                  <div className="space-y-4">
                    {items.map((item) => {
                      const product = getProduct(item)
                      const remaining = product
                        ? Math.max(0, product.stockQuantity - items
                          .filter((cartItem) => cartItem.productId === item.productId)
                          .reduce((sum, cartItem) => sum + cartItem.quantity, 0))
                        : null

                      return (
                        <article key={item.id} className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
                          <div className="flex gap-4">
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-apple-gray-100">
                              {item.image ? (
                                <Image src={item.image} alt={item.name} fill sizes="80px" className="object-contain p-1" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-8 w-8 text-apple-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 text-sm font-black leading-5 text-apple-gray-950">{item.name}</h3>
                              <p className="mt-1 text-sm font-semibold text-apple-gray-600">
                                {formatCartAmount(item.price * item.quantity)}
                              </p>
                              {remaining !== null ? (
                                <p className="mt-1 text-xs text-apple-gray-500">剩餘可加 {remaining}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-apple-gray-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label={`移除 ${item.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border border-black/10 bg-apple-gray-50 p-1">
                              <button
                                type="button"
                                onClick={() => changeQuantity(item, item.quantity - 1)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-apple-gray-800 shadow-sm"
                                aria-label="減少數量"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-10 text-center text-sm font-black">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => changeQuantity(item, item.quantity + 1)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-apple-gray-800 shadow-sm"
                                aria-label="增加數量"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <span className="text-xs font-semibold text-apple-gray-500">{item.size ? `尺寸 ${item.size}` : '已加入'}</span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-3xl border border-dashed border-black/15 bg-apple-gray-50 p-8 text-center">
                    <ShoppingCart className="mb-4 h-12 w-12 text-apple-gray-300" />
                    <p className="text-lg font-black text-apple-gray-900">購物車是空的</p>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-500">加入商品後，這裡會顯示品項、尺寸、數量與小計。</p>
                  </div>
                )}
              </div>

              <div className="border-t border-black/10 bg-white px-5 py-5">
                <div className="mb-4 rounded-3xl bg-black p-5 text-white">
                  <div className="flex items-center justify-between text-sm text-white/65">
                    <span>商品數量</span>
                    <span>{itemCount}</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-sm text-white/65">小計</span>
                    <span className="text-2xl font-black">{formatCartAmount(total)}</span>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Link
                    href="/checkout"
                    onClick={(event) => {
                      if (isEmpty) {
                        event.preventDefault()
                        return
                      }
                      onOpenChange(false)
                    }}
                    className={`apple-button-primary w-full gap-2 ${isEmpty ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    前往結帳
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => onOpenChange(false)} className="apple-button-outline w-full px-4 py-2.5 text-sm">
                      繼續選購
                    </button>
                    <button
                      type="button"
                      onClick={clear}
                      disabled={isEmpty}
                      className="rounded-full border border-black/10 px-4 py-2.5 text-sm font-bold text-apple-gray-700 transition hover:bg-apple-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      清空
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
