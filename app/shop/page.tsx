'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { ShoppingBag, Star, Package, Truck, Shield, ChevronRight, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useCart } from '@/app/cart-provider'
import { SearchEngine } from '@/lib/search'
import { useToast } from '@/app/toast-provider'

const products = [
  {
    id: '1',
    name: '专业跑步鞋',
    category: '跑步装备',
    price: 89900,
    originalPrice: 129900,
    image: '/images/shoes.jpg',
    rating: 4.8,
    reviews: 124,
    tags: ['畅销', '新品'],
  },
  {
    id: '2',
    name: '心率监测手环',
    category: '智能设备',
    price: 49900,
    originalPrice: 69900,
    image: '/images/heart-rate.jpg',
    rating: 4.6,
    reviews: 89,
    tags: ['智能'],
  },
  {
    id: '3',
    name: '运动压缩袜',
    category: '恢复装备',
    price: 19900,
    originalPrice: 29900,
    image: '/images/socks.jpg',
    rating: 4.7,
    reviews: 56,
    tags: ['恢复'],
  },
  {
    id: '4',
    name: '跑步水袋背包',
    category: '补给装备',
    price: 39900,
    originalPrice: 59900,
    image: '/images/backpack.jpg',
    rating: 4.5,
    reviews: 42,
    tags: ['户外'],
  },
  {
    id: '5',
    name: '运动护膝',
    category: '防护装备',
    price: 14900,
    originalPrice: 24900,
    image: '/images/knee-brace.jpg',
    rating: 4.6,
    reviews: 73,
    tags: ['防护'],
  },
  {
    id: '6',
    name: 'GPS运动手表',
    category: '智能设备',
    price: 149900,
    originalPrice: 199900,
    image: '/images/gps-watch.jpg',
    rating: 4.9,
    reviews: 167,
    tags: ['新品', '畅销'],
  },
]

export default function ShopPage() {
  const { addItem } = useCart()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'rating'>('relevance')
  const [currentPage, setCurrentPage] = useState(0)

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

  const handleAddToCart = (product: (typeof products)[0]) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    })
    showToast(`${product.name} 已添加到购物车`, 'success')
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
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-r from-blue-600 to-cyan-500 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4"
        >
          <h1 className="text-5xl font-bold mb-4 text-center">運動商城</h1>
          <p className="text-xl text-blue-100 text-center max-w-2xl">
            精选专业跑步装备，助力你的每一次训练
          </p>
        </motion.div>

        {/* 装饰元素 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        </div>
      </div>

      {/* 搜索和过滤区域 */}
      <div className="container mx-auto px-4 py-12">
        {/* 搜索栏 */}
        <div className="mb-8 relative max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索产品..."
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setCurrentPage(0)
              }}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* 搜索建议 */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 transition"
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
              className={`px-4 py-2 rounded-full transition ${
                selectedCategory === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
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
                className={`px-4 py-2 rounded-full transition ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* 排序 */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
          >
            <option value="relevance">相关度</option>
            <option value="price-low">价格: 低到高</option>
            <option value="price-high">价格: 高到低</option>
            <option value="rating">评分: 高到低</option>
          </select>
        </div>

        {/* 结果计数 */}
        <p className="text-gray-600 mb-6">
          共 {results.total} 件商品 {query && `（搜索"${query}"）`}
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
              {results.items.map(product => (
                <motion.div
                  key={product.id}
                  variants={itemVariants}
                  className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  {/* 商品图片 */}
                  <div className="relative h-64 bg-gray-100 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-400" />
                    </div>

                    {/* 标签 */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {product.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* 价格标签 */}
                    <div className="absolute bottom-3 right-3 bg-white/90 px-3 py-1 rounded-full text-sm font-semibold text-gray-900">
                      {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                    </div>
                  </div>

                  {/* 商品信息 */}
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                      {product.name}
                    </h3>

                    {/* 评分 */}
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex text-yellow-400">
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
                        {product.rating} ({product.reviews})
                      </span>
                    </div>

                    {/* 价格 */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-bold text-gray-900">
                        ¥{(product.price / 100).toFixed(0)}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        ¥{(product.originalPrice / 100).toFixed(0)}
                      </span>
                    </div>

                    {/* 按钮 */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-600 transition flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      加入购物车
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* 分页 */}
            {results.hasMore && (
              <div className="text-center mb-12">
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-8 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition inline-flex items-center gap-2"
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              清除过滤
            </button>
          </div>
        )}
      </div>

      {/* 特性区域 */}
      <div className="bg-gray-50 py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Truck className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h4 className="font-bold text-gray-900 mb-2">免费配送</h4>
              <p className="text-gray-600">满299元免运费</p>
            </div>
            <div className="text-center">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h4 className="font-bold text-gray-900 mb-2">品质保证</h4>
              <p className="text-gray-600">正品行货，售后无忧</p>
            </div>
            <div className="text-center">
              <Package className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h4 className="font-bold text-gray-900 mb-2">快速发货</h4>
              <p className="text-gray-600">订单24小时内发出</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
