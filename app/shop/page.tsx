'use client'

export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Package, Search } from 'lucide-react'
import ShopCartDrawer from '@/components/ShopCartDrawer'
import type { ShopProduct } from '@/lib/shop-products'
import { useSiteContent } from '@/app/site-content-provider'

type SortOption = 'featured' | 'price-low' | 'price-high'

function formatPrice(product: ShopProduct) {
  return product.price > 0 ? `NT$${Math.round(product.price / 100).toLocaleString('zh-TW')}` : '洽詢售價'
}

export default function ShopPage() {
  const { pageMedia } = useSiteContent()
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<SortOption>('featured')
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    let isActive = true

    fetch('/api/shop/products', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { products?: ShopProduct[] }
        if (!response.ok) throw new Error('商品資料載入失敗。')
        if (isActive && payload.products) setProducts(payload.products)
      })
      .catch((error) => {
        console.error('Load shop products failed:', error)
        if (isActive) setLoadError('商品資料暫時無法載入，請稍後重新整理。')
      })
      .finally(() => { if (isActive) setIsLoading(false) })

    return () => { isActive = false }
  }, [])

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))), [products])
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const matchesCategory = !category || product.category === category
      const haystack = [product.name, product.category, product.summary, ...product.tags].join(' ').toLowerCase()
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery))
    })

    if (sort === 'price-low') return [...filtered].sort((a, b) => a.price - b.price)
    if (sort === 'price-high') return [...filtered].sort((a, b) => b.price - a.price)
    return filtered
  }, [category, products, query, sort])

  return (
    <main className="kinetic-page min-h-screen bg-white pt-20 sm:pt-24">
      <section className="kinetic-hero relative isolate min-h-[390px] overflow-hidden border-b border-black/10 sm:min-h-[395px]">
        <Image
          src={pageMedia.shopHero}
          alt="好運跑班服飾與跑步裝備"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />
        <div className="container relative z-10 mx-auto flex min-h-[390px] items-center px-5 py-12 sm:min-h-[395px] sm:px-8 lg:px-12">
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-white/80 sm:text-sm">GOOD LUCK RUNNING SHOP</p>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">{pageMedia.shopTitle}</h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/85 sm:text-lg sm:leading-8">{pageMedia.shopSubtitle}</p>
            <p className="mt-7 text-sm font-black text-white/80">{isLoading ? '商品資料載入中' : `目前共 ${products.length} 件商品`}</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 sm:py-10">
        <div className="kinetic-reveal grid gap-3 border-b border-black/10 pb-6 md:grid-cols-[minmax(260px,1fr)_auto_auto] md:items-center">
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋商品" className="apple-input pl-10" />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            <button type="button" onClick={() => setCategory('')} className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm font-bold transition ${!category ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-apple-gray-700 hover:border-black/30'}`}>全部</button>
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm font-bold transition ${category === item ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-apple-gray-700 hover:border-black/30'}`}>{item}</button>
            ))}
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} aria-label="商品排序" className="apple-input py-2 text-sm md:w-40">
            <option value="featured">推薦排序</option>
            <option value="price-low">價格低到高</option>
            <option value="price-high">價格高到低</option>
          </select>
        </div>

        {isLoading ? (
          <div aria-label="商品資料載入中" className="grid grid-cols-2 gap-x-3 gap-y-8 pt-7 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-square rounded-md bg-apple-gray-100" />
                <div className="mt-3 h-3 w-20 rounded bg-apple-gray-100" />
                <div className="mt-3 h-5 w-4/5 rounded bg-apple-gray-100" />
                <div className="mt-3 h-5 w-24 rounded bg-apple-gray-100" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <Package className="h-12 w-12 text-apple-gray-300" />
            <p className="mt-4 font-black text-apple-gray-900">{loadError}</p>
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 pt-7 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
            {visibleProducts.map((product) => (
              <article key={product.id} className="kinetic-card group min-w-0">
                <Link href={`/shop/${encodeURIComponent(product.id)}`} className="block">
                  <div className="kinetic-image relative aspect-square overflow-hidden rounded-md border border-black/10 bg-apple-gray-50">
                    {product.image ? (
                      <Image src={product.image} alt={product.name} fill sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-contain p-3 transition duration-300 group-hover:scale-[1.025]" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-apple-gray-300" /></div>
                    )}
                    {product.stockQuantity <= 0 ? <span className="absolute left-2 top-2 rounded bg-black px-2 py-1 text-xs font-bold text-white">售完</span> : null}
                  </div>
                  <div className="pt-3">
                    <p className="text-xs text-apple-gray-500">{product.category}</p>
                    <h2 className="mt-1 line-clamp-2 min-h-12 text-sm font-black leading-6 text-apple-gray-950 sm:text-base">{product.name}</h2>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-base font-black text-apple-gray-950">{formatPrice(product)}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-apple-gray-400 transition group-hover:translate-x-1 group-hover:text-black" />
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <Package className="h-12 w-12 text-apple-gray-300" />
            <p className="mt-4 font-black text-apple-gray-900">找不到符合條件的商品</p>
            <button type="button" onClick={() => { setQuery(''); setCategory('') }} className="mt-4 text-sm font-bold text-apple-gray-600 underline underline-offset-4">清除搜尋條件</button>
          </div>
        )}
      </section>

      <ShopCartDrawer products={products} open={isCartOpen} onOpenChange={setIsCartOpen} />
    </main>
  )
}
