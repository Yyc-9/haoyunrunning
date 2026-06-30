export type ProductVariant = {
  id: string
  name: string
  image: string
}

export type ShopProduct = {
  id: string
  name: string
  category: string
  price: number
  priceLabel: string
  image: string
  rating: number
  reviews: number
  tags: string[]
  variants?: ProductVariant[]
  sizes?: string[]
  stockQuantity: number
  active: boolean
}

export type ShopProductRow = {
  id: string
  name: string
  category: string | null
  price: number | null
  price_label: string | null
  image: string | null
  rating: number | null
  reviews: number | null
  tags: unknown
  variants: unknown
  sizes: unknown
  stock_quantity: number | null
  active: boolean | null
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function productVariants(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const variant = item as Partial<ProductVariant>
      if (!variant.id || !variant.name || typeof variant.id !== 'string' || typeof variant.name !== 'string') {
        return null
      }

      return {
        id: variant.id,
        name: variant.name,
        image: typeof variant.image === 'string' ? variant.image : '',
      }
    })
    .filter((item): item is ProductVariant => Boolean(item))
}

export const defaultShopProducts: ShopProduct[] = [
  {
    id: '1',
    name: '好運競速跑步背心',
    category: '跑者服飾',
    price: 0,
    priceLabel: '私訊諮詢',
    image: '/goodluck-running-vest.jpg',
    rating: 5,
    reviews: 0,
    tags: ['團隊裝備'],
    stockQuantity: 20,
    active: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    variants: [
      { id: 'purple-white', name: '紫電白', image: '/goodluck-running-vest.jpg' },
      { id: 'black-blue', name: '曜黑藍', image: '/goodluck-running-vest-black.jpg' },
    ],
  },
  {
    id: '2',
    name: '好運跑步 T 恤',
    category: '跑者服飾',
    price: 0,
    priceLabel: '私訊諮詢',
    image: '/goodluck-running-tee.jpg',
    rating: 5,
    reviews: 0,
    tags: ['團隊裝備'],
    stockQuantity: 20,
    active: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: '3',
    name: '好運跑步帽',
    category: '跑者配件',
    price: 0,
    priceLabel: '私訊諮詢',
    image: '',
    rating: 5,
    reviews: 0,
    tags: ['日常訓練'],
    stockQuantity: 20,
    active: true,
    sizes: ['S/M', 'L/XL'],
  },
  {
    id: '4',
    name: '好運毛巾衣',
    category: '跑者服飾',
    price: 0,
    priceLabel: '私訊諮詢',
    image: '',
    rating: 5,
    reviews: 0,
    tags: ['赛後恢復'],
    stockQuantity: 20,
    active: true,
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: '5',
    name: 'CALBOMB 蜂蜜檸檬能量膠',
    category: '運動補給',
    price: 0,
    priceLabel: '私訊諮詢',
    image: '/calbomb-energy-gel.png',
    rating: 5,
    reviews: 0,
    tags: ['訓練補給', '無添加認證'],
    stockQuantity: 30,
    active: true,
  },
]

export function shopProductFromRow(row: ShopProductRow): ShopProduct {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? '',
    price: row.price ?? 0,
    priceLabel: row.price_label ?? '私訊諮詢',
    image: row.image ?? '',
    rating: row.rating ?? 5,
    reviews: row.reviews ?? 0,
    tags: stringArray(row.tags),
    variants: productVariants(row.variants),
    sizes: stringArray(row.sizes),
    stockQuantity: row.stock_quantity ?? 0,
    active: row.active ?? true,
  }
}

export function getCartProductId(cartId: string) {
  return cartId.split(':')[0] || cartId
}
