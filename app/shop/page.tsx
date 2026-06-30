'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Package, Search, Shield, ShoppingBag, Star, Truck } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/app/cart-provider'
import { SearchEngine } from '@/lib/search'
import { useToast } from '@/app/toast-provider'
import { defaultShopProducts, type ProductVariant, type ShopProduct } from '@/lib/shop-products'

export default function ShopPage() {
  const { addItem, items } = useCart()
  const { showToast } = useToast()
  const [products, setProducts] = useState<ShopProduct[]>(defaultShopProducts)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'rating'>('relevance')
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({})
  const [productsError, setProductsError] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadProducts() {
      try {
        const response = await fetch('/api/shop/products', { cache: 'no-store' })
        const payload = (await response.json().catch(() => ({}))) as {
          products?: ShopProduct[]
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error || '商品庫存讀取失敗。')
        }

        if (isActive && payload.products) {
          setProducts(payload.products)
          setProductsError('')
        }
      } catch (error) {
        if (isActive) {
          setProductsError(error instanceof Error ? error.message : '商品庫存讀取失敗。')
        }
      }
    }

    loadProducts()

    return () => {
      isActive = false
    }
  }, [])

  const engine = useMemo(() => new SearchEngine(products, ['name', 'category']), [products])

  const results = useMemo(() => {
    return engine.search({
      query,
      filters: selectedCategory ? { category: selectedCategory } : {},
      sortBy,
      limit: 9,
      offset: currentPage * 9,
    })
  }, [query, selectedCategory, sortBy, currentPage, engine])

  const suggestions = useMemo(() => (query ? engine.getSuggestions(query, 5) : []), [query, engine])
  const categories = useMemo(() => engine.getFilterOptions('category'), [engine])

  const handleAddToCart = (product: ShopProduct, variant?: ProductVariant, size?: string) => {
    const cartQuantity = items
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0)

    if (cartQuantity >= product.stockQuantity) {
      showToast(`${product.name} 庫存不足`, 'error')
      return false
    }

    const optionName = [variant?.name, size ? `尺寸 ${size}` : ''].filter(Boolean).join(' / ')
    const displayName = optionName ? `${product.name} - ${optionName}` : product.name

    addItem({
      id: [product.id, variant?.id, size].filter(Boolean).join(':'),
      productId: product.id,
      variantId: variant?.id,
      size,
      name: displayName,
      price: product.price,
      image: variant?.image ?? product.image,
    })
    showToast(`${displayName} 已加入購物車`, 'success')
    return true
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="relative h-[22rem] overflow-hidden bg-black sm:h-96">
        <div className="absolute inset-0 bg-cover bg-center opacity-75" style={{ backgroundImage: 'url("/20250605[好運]三周年慶-7096.jpg")' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-black/25" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-white">
          <h1 className="mb-4 text-center text-4xl font-bold sm:text-5xl">好運商店</h1>
          <p className="max-w-2xl text-center text-lg leading-8 text-white/85 sm:text-xl">跑班裝備與訓練補給，先把真正會用上的東西整理好。</p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="relative mx-auto mb-8 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋商品..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setCurrentPage(0)
              }}
              className="apple-input pl-12"
            />
          </div>

          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
              {suggestions.map((suggestion) => (
                <button key={suggestion} onClick={() => setQuery(suggestion)} className="w-full border-b px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-apple-gray-100">
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedCategory('')} className={`apple-chip ${selectedCategory === '' ? 'apple-chip-active' : ''}`}>全部</button>
            {(categories as string[]).map((category) => (
              <button key={category} onClick={() => setSelectedCategory(category)} className={`apple-chip ${selectedCategory === category ? 'apple-chip-active' : ''}`}>
                {category}
              </button>
            ))}
          </div>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="apple-input w-full py-2 text-sm md:w-auto md:min-w-48">
            <option value="relevance">相關度</option>
            <option value="price-low">價格：低到高</option>
            <option value="price-high">價格：高到低</option>
            <option value="rating">推薦度：高到低</option>
          </select>
        </div>

        <p className="mb-6 text-gray-600">共 {results.total} 件商品 {query && `（搜尋「${query}」）`}</p>
        {productsError ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {productsError} 目前先顯示本地商品資料。
          </div>
        ) : null}

        {results.items.length > 0 ? (
          <motion.div initial="hidden" animate="visible" className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.items.map((product) => {
              const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariants[product.id]) ?? product.variants?.[0]
              const selectedSize = selectedSizes[product.id] ?? product.sizes?.[0]
              const productImage = selectedVariant?.image ?? product.image
              const cartQuantity = items
                .filter((item) => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0)
              const remainingStock = Math.max(0, product.stockQuantity - cartQuantity)
              const isSoldOut = product.stockQuantity <= 0 || remainingStock <= 0

              return (
                <motion.div key={product.id} className="apple-card group overflow-hidden">
                  <div className="relative h-64 overflow-hidden bg-apple-gray-100">
                    {productImage ? (
                      <Image src={productImage} alt={selectedVariant ? `${product.name} ${selectedVariant.name}` : product.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white via-apple-gray-100 to-apple-gray-200">
                        <Package className="h-16 w-16 text-apple-gray-400" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2 pr-3">
                      {product.tags.map((tag) => <span key={tag} className="rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">{tag}</span>)}
                    </div>
                    <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-apple-gray-900 shadow-sm">
                      {isSoldOut ? '售完' : `庫存 ${remainingStock}`}
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="mb-2 text-xs text-gray-500">{product.category}</p>
                    <h3 className="mb-2 font-bold text-gray-900 transition group-hover:text-black">{product.name}</h3>

                    {product.variants && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {product.variants.map((variant) => {
                          const isSelected = variant.id === selectedVariant?.id
                          return (
                            <button key={variant.id} type="button" onClick={() => setSelectedVariants((current) => ({ ...current, [product.id]: variant.id }))} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${isSelected ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-gray-700 hover:border-black/30'}`}>
                              {variant.name}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {product.sizes && (
                      <label className="mb-3 block">
                        <span className="mb-2 block text-xs font-semibold text-gray-600">尺寸</span>
                        <select value={selectedSize} onChange={(event) => setSelectedSizes((current) => ({ ...current, [product.id]: event.target.value }))} className="apple-input py-2 text-sm">
                          {product.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </label>
                    )}

                    <div className="mb-3 flex items-center gap-1">
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.floor(product.rating) ? 'fill-current' : ''}`} />)}
                      </div>
                      <span className="text-sm text-gray-600">{product.reviews > 0 ? `${product.rating} (${product.reviews})` : '好運推薦'}</span>
                    </div>

                    <div className="mb-4 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{product.price > 0 ? `NT$${(product.price / 100).toFixed(0)}` : product.priceLabel}</span>
                      {cartQuantity > 0 ? <span className="text-xs font-semibold text-apple-gray-500">購物車中 {cartQuantity}</span> : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={isSoldOut}
                        onClick={() => handleAddToCart(product, selectedVariant, selectedSize)}
                        className="apple-button-secondary gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        {isSoldOut ? '庫存不足' : '加入購物車'}
                      </button>
                      {isSoldOut ? (
                        <button type="button" disabled className="apple-button-primary gap-2 px-4 py-2.5 text-sm opacity-50">
                          <CreditCard className="h-4 w-4" />
                          前往結帳
                        </button>
                      ) : (
                        <Link
                          href="/checkout"
                          onClick={(event) => {
                            if (!handleAddToCart(product, selectedVariant, selectedSize)) {
                              event.preventDefault()
                            }
                          }}
                          className="apple-button-primary gap-2 px-4 py-2.5 text-sm"
                        >
                          <CreditCard className="h-4 w-4" />
                          前往結帳
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          <div className="py-12 text-center">
            <Package className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="mb-4 text-lg text-gray-500">未找到符合的商品</p>
            <button onClick={() => { setQuery(''); setSelectedCategory('') }} className="apple-button-primary px-6 py-2">清除篩選</button>
          </div>
        )}
      </div>

      <div className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { icon: Truck, title: '跑班自取 / 配送', description: '依商品與課程活動安排' },
              { icon: Shield, title: '實用優先', description: '只整理跑者真正會用到的裝備' },
              { icon: Package, title: '補給支援', description: '訓練與賽事前後都能補上' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <item.icon className="mx-auto mb-4 h-12 w-12 text-black" />
                <h4 className="mb-2 font-bold text-gray-900">{item.title}</h4>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
