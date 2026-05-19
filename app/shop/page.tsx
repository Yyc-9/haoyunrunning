'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { CreditCard, ShoppingBag, Star, Package, Truck, Shield, ChevronRight, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/app/cart-provider'
import { SearchEngine } from '@/lib/search'
import { useToast } from '@/app/toast-provider'

type ProductVariant = {
  id: string
  name: string
  image: string
}

type Product = {
  id: string
  name: string
  category: string
  price: number
  originalPrice: number
  priceLabel: string
  image: string
  rating: number
  reviews: number
  tags: string[]
  variants?: ProductVariant[]
}

const products: Product[] = [
  {
    id: '1',
    name: '好運競速跑步背心',
    category: '跑者服飾',
    price: 0,
    originalPrice: 0,
    priceLabel: '私訊洽詢',
    image: '/goodluck-running-vest.jpg',
    rating: 5,
    reviews: 0,
    tags: ['團隊裝備'],
    variants: [
      {
        id: 'purple-white',
        name: '紫電白',
        image: '/goodluck-running-vest.jpg',
      },
      {
        id: 'black-blue',
        name: '曜黑藍',
        image: '/goodluck-running-vest-black.jpg',
      },
    ],
  },
  {
    id: '2',
    name: '好運跑步 T 恤',
    category: '跑者服飾',
    price: 0,
    originalPrice: 0,
    priceLabel: '私訊洽詢',
    image: '/goodluck-running-tee.jpg',
    rating: 5,
    reviews: 0,
    tags: ['團隊裝備'],
  },
  {
    id: '3',
    name: '好運跑步帽',
    category: '跑者配件',
    price: 0,
    originalPrice: 0,
    priceLabel: '私訊洽詢',
    image: '/calbomb-energy-gel.png',
    rating: 5,
    reviews: 0,
    tags: ['日常訓練'],
  },
  {
    id: '4',
    name: '好運毛巾衣',
    category: '跑者服飾',
    price: 0,
    originalPrice: 0,
    priceLabel: '私訊洽詢',
    image: '',
    rating: 5,
    reviews: 0,
    tags: ['賽後恢復'],
  },
  {
    id: '5',
    name: 'CALBOMB 蜂蜜檸檬能量膠',
    category: '運動補給',
    price: 0,
    originalPrice: 0,
    priceLabel: '私訊洽詢',
    image: '',
    rating: 5,
    reviews: 0,
    tags: ['訓練補給', '無添加認證'],
  },
]

export default function ShopPage() {
  const { addItem } = useCart()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'rating'>('relevance')
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  const engine = useMemo(() => new SearchEngine(products, ['name', 'category']), [])

  const results = useMemo(() => {
    return engine.search({
      query,
      filters: selectedCategory ? { category: selectedCategory } : {},
      sortBy,
      limit: 9,
      offset: currentPage * 9,
    })
  }, [query, selectedCategory, sortBy, currentPage, engine])

  const suggestions = useMemo(() => {
    return query ? engine.getSuggestions(query, 5) : []
  }, [query, engine])

  const categories = useMemo(() => {
    return engine.getFilterOptions('category')
  }, [engine])

  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    addItem({
      id: variant ? `${product.id}-${variant.id}` : product.id,
      name: variant ? `${product.name} - ${variant.name}` : product.name,
      price: product.price,
      image: variant?.image ?? product.image,
    })
    showToast(`${variant ? `${product.name} - ${variant.name}` : product.name} 已加入購物車`, 'success')
  }

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setCurrentPage(0)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="relative h-96 overflow-hidden bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-75"
          style={{ backgroundImage: 'url("/20250605[好運]三周年慶-7096.jpg")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-black/25" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4"
        >
          <h1 className="text-5xl font-bold mb-4 text-center">好運商店</h1>
          <p className="text-xl text-white/85 text-center max-w-2xl leading-8">
            跑班裝備與訓練補給，先把真正會用上的東西整理好。
          </p>
        </motion.div>
      </div>

      {/* 搜索和过滤区域 */}
      <div className="container mx-auto px-4 py-12">
        {/* 搜索栏 */}
        <div className="mb-8 relative max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋商品..."
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setCurrentPage(0)
              }}
              className="apple-input pl-12"
            />
          </div>

          {/* 搜索建议 */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="w-full border-b px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-apple-gray-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 分类和排序 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          {/* 分类过滤 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedCategory('')
                setCurrentPage(0)
              }}
              className={`apple-chip ${selectedCategory === '' ? 'apple-chip-active' : ''}`}
            >
              全部
            </button>
            {(categories as string[]).map(category => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category)
                  setCurrentPage(0)
                }}
                className={`apple-chip ${selectedCategory === category ? 'apple-chip-active' : ''}`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* 排序 */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="apple-input w-auto min-w-48 py-2 text-sm"
          >
            <option value="relevance">相關度</option>
            <option value="price-low">價格: 低到高</option>
            <option value="price-high">價格: 高到低</option>
            <option value="rating">推薦度: 高到低</option>
          </select>
        </div>

        {/* 结果计数 */}
        <p className="text-gray-600 mb-6">
          共 {results.total} 件商品 {query && `（搜尋「${query}」）`}
        </p>

        {/* 商品网格 */}
        {results.items.length > 0 ? (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
            >
              {results.items.map(product => {
                const selectedVariant =
                  product.variants?.find(
                    variant => variant.id === selectedVariants[product.id]
                  ) ?? product.variants?.[0]
                const productImage = selectedVariant?.image ?? product.image

                return (
                  <motion.div
                    key={product.id}
                    variants={itemVariants}
                    className="apple-card group overflow-hidden"
                  >
                  {/* 商品图片 */}
                  <div className="relative h-64 overflow-hidden bg-apple-gray-100">
                    {productImage ? (
                      <Image
                        src={productImage}
                        alt={selectedVariant ? `${product.name} ${selectedVariant.name}` : product.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white via-apple-gray-100 to-apple-gray-200">
                        <Package className="w-16 h-16 text-apple-gray-400" />
                      </div>
                    )}

                    {/* 标签 */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {product.tags.map(tag => (
                        <span
                          key={tag}
                          className="rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {product.originalPrice > 0 && (
                      <div className="absolute bottom-3 right-3 bg-white/90 px-3 py-1 rounded-full text-sm font-semibold text-gray-900">
                        {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                      </div>
                    )}
                  </div>

                  {/* 商品信息 */}
                  <div className="p-5">
                    <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-black transition">
                      {product.name}
                    </h3>

                    {product.variants && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {product.variants.map(variant => {
                          const isSelected = variant.id === selectedVariant?.id

                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() =>
                                setSelectedVariants(current => ({
                                  ...current,
                                  [product.id]: variant.id,
                                }))
                              }
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                isSelected
                                  ? 'border-black bg-black text-white'
                                  : 'border-black/10 bg-white text-gray-700 hover:border-black/30'
                              }`}
                            >
                              {variant.name}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* 评分 */}
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(product.rating) ? 'fill-current' : ''
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                      {product.reviews > 0 ? `${product.rating} (${product.reviews})` : '好運推薦'}
                      </span>
                    </div>

                    {/* 价格 */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-bold text-gray-900">
                        {product.price > 0 ? `NT$${(product.price / 100).toFixed(0)}` : product.priceLabel}
                      </span>
                      {product.originalPrice > 0 && (
                        <span className="text-sm text-gray-400 line-through">
                          NT${(product.originalPrice / 100).toFixed(0)}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => handleAddToCart(product, selectedVariant)}
                        className="apple-button-secondary gap-2 px-4 py-2.5 text-sm"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        加入購物車
                      </button>
                      <Link
                        href="/checkout"
                        onClick={() => handleAddToCart(product, selectedVariant)}
                        className="apple-button-primary gap-2 px-4 py-2.5 text-sm"
                      >
                        <CreditCard className="w-4 h-4" />
                        前往結帳
                      </Link>
                    </div>
                  </div>
                </motion.div>
                )
              })}
            </motion.div>

            {/* 分页 */}
            {results.hasMore && (
              <div className="text-center mb-12">
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="apple-button-secondary gap-2"
                >
                  加载更多 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">未找到匹配的商品</p>
            <button
              onClick={() => {
                setQuery('')
                setSelectedCategory('')
                setCurrentPage(0)
              }}
              className="apple-button-primary px-6 py-2"
            >
              清除篩選
            </button>
          </div>
        )}
      </div>

      {/* 特性区域 */}
      <div className="bg-gray-50 py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Truck className="w-12 h-12 text-black mx-auto mb-4" />
              <h4 className="font-bold text-gray-900 mb-2">跑班自取 / 配送</h4>
              <p className="text-gray-600">依商品與課程活動安排</p>
            </div>
            <div className="text-center">
              <Shield className="w-12 h-12 text-black mx-auto mb-4" />
              <h4 className="font-bold text-gray-900 mb-2">實用優先</h4>
              <p className="text-gray-600">只整理跑者真正會用到的裝備</p>
            </div>
            <div className="text-center">
              <Package className="w-12 h-12 text-black mx-auto mb-4" />
              <h4 className="font-bold text-gray-900 mb-2">補給支援</h4>
              <p className="text-gray-600">訓練與賽事前後都能補上</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
