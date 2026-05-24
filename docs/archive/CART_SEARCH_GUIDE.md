# 购物车和搜索功能集成指南

## 1. 购物车系统 (Cart)

### 概述
购物车系统基于 Context API，提供全局的购物车状态管理，支持添加、删除、修改数量等操作。

### 文件位置
- **实现**: `app/cart-provider.tsx`
- **位置**: app/layout.tsx 中已集成为全局 provider

### 主要 API

#### `useCart()` Hook
返回购物车的所有操作和状态：

```typescript
import { useCart } from '@/app/cart-provider'

export default function ShopPage() {
  const { items, total, itemCount, addItem, removeItem, updateQuantity, clear, isEmpty } = useCart()

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    })
  }

  return (
    <div>
      <p>购物车: {itemCount} 件，总计 ¥{(total / 100).toFixed(2)}</p>
      <button onClick={() => handleAddToCart(product)}>加入购物车</button>
    </div>
  )
}
```

#### 核心方法

| 方法 | 说明 | 示例 |
|------|------|------|
| `addItem(item)` | 添加商品到购物车 | `addItem({ id: '1', name: '跑鞋', price: 599, image: 'url' })` |
| `removeItem(id)` | 删除商品 | `removeItem('1')` |
| `updateQuantity(id, quantity)` | 更新数量 | `updateQuantity('1', 3)` |
| `clear()` | 清空购物车 | `clear()` |

#### 计算工具

```typescript
import { calculateTotal, calculateShipping, calculateDiscount } from '@/app/cart-provider'

// 计算完整价格信息
const pricing = calculateTotal(subtotal, {
  shippingThreshold: 299,  // 满299免运费
  taxRate: 0.1,            // 10%税率
  couponCode: 'WELCOME10', // 优惠券
})

console.log(pricing)
// {
//   subtotal: 500,
//   shipping: 0,      // 满299免运费
//   tax: 50,
//   discount: 50,     // 10%折扣
//   total: 500
// }
```

### 购物车页面示例

```typescript
'use client'

import { useCart } from '@/app/cart-provider'
import Link from 'next/link'

export default function CartPage() {
  const { items, total, removeItem, updateQuantity, clear, isEmpty } = useCart()

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p>购物车为空</p>
        <Link href="/shop">继续购物</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-20">
      <h1>购物车</h1>
      
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <div>
              <h3>{item.name}</h3>
              <p>¥{(item.price / 100).toFixed(2)}</p>
            </div>
            <input
              type="number"
              value={item.quantity}
              onChange={e => updateQuantity(item.id, parseInt(e.target.value))}
            />
            <button onClick={() => removeItem(item.id)}>删除</button>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <p>总计: ¥{(total / 100).toFixed(2)}</p>
        <button onClick={clear}>清空购物车</button>
        <button>结账</button>
      </div>
    </div>
  )
}
```

---

## 2. 搜索系统

### 概述
`SearchEngine` 类提供强大的搜索、过滤、排序功能，支持模糊搜索和搜索建议。

### 文件位置
- **实现**: `lib/search.ts`
- **用途**: 在 shop 页面或其他列表页面使用

### 主要 API

#### SearchEngine 类

```typescript
import { SearchEngine } from '@/lib/search'

// 1. 创建搜索引擎
const products = [
  { id: '1', name: '跑鞋', price: 599, category: '鞋类', rating: 4.5 },
  { id: '2', name: '运动服', price: 199, category: '衣服', rating: 4.0 },
]

const engine = new SearchEngine(products, ['name', 'category'])

// 2. 执行搜索
const results = engine.search({
  query: '跑',
  filters: { category: '鞋类' },
  sortBy: 'price-low',
  limit: 10,
  offset: 0,
})

console.log(results)
// {
//   items: [...],      // 过滤排序后的商品
//   total: 5,          // 总匹配数
//   hasMore: false,    // 是否有下一页
// }

// 3. 获取过滤选项
const categories = engine.getFilterOptions('category')
// ['鞋类', '衣服', '配件', ...]

// 4. 获取搜索建议
const suggestions = engine.getSuggestions('跑', 5)
// ['跑鞋', '跑步机', '跑步手表', ...]
```

#### 搜索选项参数

```typescript
interface SearchOptions {
  query: string                    // 搜索关键词
  filters: Record<string, any>     // 过滤条件 { category: '鞋类' }
  sortBy: 'relevance' | 'price-low' | 'price-high' | 'rating' | 'newest'
  limit: number                    // 每页数量
  offset: number                   // 页面偏移量
}
```

#### 模糊搜索

```typescript
import { fuzzyMatch } from '@/lib/search'

// 模糊匹配得分 (0-100)
const score = fuzzyMatch('runningshoe', 'running shoe')
// 返回匹配分数，可用于排序搜索结果
```

### Shop 页面集成示例

```typescript
'use client'

import { useState, useMemo } from 'react'
import { SearchEngine } from '@/lib/search'
import { useCart } from '@/app/cart-provider'
import { mockData } from '@/lib/mock-data'

export default function ShopPage() {
  const { addItem } = useCart()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ category: '' })
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high'>('price-low')
  const [currentPage, setCurrentPage] = useState(0)

  const engine = useMemo(
    () => new SearchEngine(mockData.products, ['name', 'description']),
    []
  )

  const results = useMemo(() => {
    return engine.search({
      query,
      filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      sortBy,
      limit: 12,
      offset: currentPage * 12,
    })
  }, [query, filters, sortBy, currentPage, engine])

  const suggestions = useMemo(
    () => (query ? engine.getSuggestions(query, 5) : []),
    [query, engine]
  )

  const categories = useMemo(
    () => engine.getFilterOptions('category'),
    [engine]
  )

  return (
    <div className="container mx-auto px-4 py-20">
      {/* 搜索栏 */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="搜索商品..."
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setCurrentPage(0)
          }}
          className="w-full border rounded px-4 py-2"
        />
        {suggestions.length > 0 && (
          <div className="mt-2 border rounded">
            {suggestions.map(suggestion => (
              <div
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* 过滤侧边栏 */}
        <aside className="w-48">
          <h3 className="font-bold mb-4">分类</h3>
          {(categories as string[]).map(category => (
            <label key={category} className="block mb-2">
              <input
                type="checkbox"
                checked={filters.category === category}
                onChange={e => {
                  setFilters({ category: e.target.checked ? category : '' })
                  setCurrentPage(0)
                }}
              />
              {category}
            </label>
          ))}

          <h3 className="font-bold mb-4 mt-6">排序</h3>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="price-low">价格: 低到高</option>
            <option value="price-high">价格: 高到低</option>
          </select>
        </aside>

        {/* 商品列表 */}
        <main className="flex-1">
          <p className="text-gray-600 mb-4">共 {results.total} 件商品</p>
          <div className="grid grid-cols-3 gap-4">
            {results.items.map(product => (
              <div key={product.id} className="border rounded p-4">
                <img src={product.image} alt={product.name} className="w-full h-40 object-cover" />
                <h3 className="mt-2 font-bold">{product.name}</h3>
                <p className="text-gray-600">¥{(product.price / 100).toFixed(2)}</p>
                <button
                  onClick={() => addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                  })}
                  className="mt-2 w-full bg-blue-500 text-white py-2 rounded"
                >
                  加入购物车
                </button>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {results.hasMore && (
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              className="mt-8 block mx-auto px-4 py-2 border rounded"
            >
              加载更多
            </button>
          )}
        </main>
      </div>
    </div>
  )
}
```

---

## 3. 集成清单

### 购物车集成步骤

- [x] CartProvider 已添加到 app/layout.tsx
- [ ] 创建 `/app/cart/page.tsx` 购物车页面
- [ ] 更新 `/app/shop/page.tsx` 添加"加入购物车"按钮
- [ ] 创建 `/app/checkout/page.tsx` 结账页面
- [ ] 实现优惠券验证逻辑
- [ ] 集成支付功能（如 Stripe）

### 搜索集成步骤

- [x] SearchEngine 已实现在 lib/search.ts
- [ ] 更新 `/app/shop/page.tsx` 添加搜索栏
- [ ] 添加过滤侧边栏
- [ ] 实现搜索结果高亮
- [ ] 添加搜索历史（localStorage）
- [ ] 实现搜索分析和热词统计

---

## 4. 常见问题

### Q: 购物车数据会持久化吗？
A: 当前购物车仅在内存中存储，页面刷新会丢失。可以通过添加以下代码来持久化：

```typescript
// 在 CartProvider 中添加
useEffect(() => {
  const saved = localStorage.getItem('cart')
  if (saved) {
    setItems(JSON.parse(saved))
  }
}, [])

useEffect(() => {
  localStorage.setItem('cart', JSON.stringify(items))
}, [items])
```

### Q: 如何实现搜索历史？
A: 使用 localStorage 记录搜索词：

```typescript
const [searchHistory, setSearchHistory] = useState<string[]>([])

const handleSearch = (query: string) => {
  setQuery(query)
  const history = JSON.parse(localStorage.getItem('searchHistory') || '[]')
  if (!history.includes(query)) {
    history.unshift(query)
    localStorage.setItem('searchHistory', JSON.stringify(history.slice(0, 10)))
  }
}
```

### Q: 如何集成真实支付？
A: 推荐使用 Stripe：

```typescript
import { loadStripe } from '@stripe/stripe-js'

const stripe = await loadStripe('pk_test_...')
await stripe.redirectToCheckout({ sessionId })
```

---

## 5. 性能优化建议

1. **虚拟滚动**: 对于大列表，使用 `react-window`
2. **搜索防抖**: 使用 `useCallback` 和 `debounce`
3. **缓存搜索结果**: 使用 `useMemo` 或 SWR
4. **图片懒加载**: 使用 Next.js Image 组件
5. **购物车持久化**: 使用 IndexedDB 而不是 localStorage（数据量大时）

---

## 相关文件

- `app/cart-provider.tsx` - 购物车 Context 和 hooks
- `lib/search.ts` - 搜索引擎实现
- `lib/mock-data.ts` - 模拟数据（包含 products 列表）
- `app/layout.tsx` - 应用根布局（已集成 CartProvider）
