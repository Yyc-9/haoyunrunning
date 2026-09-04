export type ProductVariant = {
  id: string
  name: string
  image: string
  detailImages: string[]
}

export type ProductSpecification = {
  label: string
  value: string
}

export type ShopProduct = {
  id: string
  name: string
  category: string
  price: number
  priceLabel: string
  image: string
  video?: string
  rating: number
  reviews: number
  tags: string[]
  summary: string
  description: string
  gallery: string[]
  highlights: string[]
  specifications: ProductSpecification[]
  usageNotes: string[]
  externalUrl?: string
  variants?: ProductVariant[]
  sizes?: string[]
  stockQuantity: number
  active: boolean
}

type ProductIntroSource = Pick<
  ShopProduct,
  'description' | 'summary' | 'highlights' | 'specifications' | 'usageNotes'
>

export function getProductIntro(product: ProductIntroSource) {
  const base = (product.description || product.summary).trim()
  const sections: string[] = base ? [base] : []

  const appendUnseen = (title: string, lines: string[]) => {
    const unseenLines = lines
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !base.includes(line))
    if (unseenLines.length) sections.push(`${title}\n${unseenLines.join('\n')}`)
  }

  appendUnseen('商品特色', product.highlights)
  appendUnseen(
    '商品資訊',
    product.specifications.map((item) => `${item.label}：${item.value}`),
  )
  appendUnseen('保養提醒', product.usageNotes)

  return sections.join('\n\n')
}

export type ShopProductRow = {
  id: string
  name: string
  category: string | null
  price: number | null
  price_label: string | null
  image: string | null
  video: string | null
  rating: number | null
  reviews: number | null
  tags: unknown
  summary?: string | null
  description?: string | null
  gallery?: unknown
  highlights?: unknown
  specifications?: unknown
  usage_notes?: unknown
  external_url?: string | null
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
        detailImages: stringArray((item as { detailImages?: unknown }).detailImages),
      }
    })
    .filter((item): item is ProductVariant => Boolean(item))
}

function productSpecifications(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const specification = item as Partial<ProductSpecification>
      if (typeof specification.label !== 'string' || typeof specification.value !== 'string') return null
      const label = specification.label.trim()
      const specValue = specification.value.trim()
      return label && specValue ? { label, value: specValue } : null
    })
    .filter((item): item is ProductSpecification => Boolean(item))
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
    summary: '好運跑班團隊競速背心，提供兩款配色與 XS 至 XL 尺寸。',
    description: '適合團練、賽事與日常跑步穿著的好運跑班團隊背心。可依喜好選擇紫電白或曜黑藍款式，並在下單前確認需要的尺寸。',
    gallery: ['/goodluck-running-vest.jpg', '/goodluck-running-vest-black.jpg'],
    highlights: ['兩款團隊配色', 'XS 至 XL 尺寸', '團練與賽事皆可穿著'],
    specifications: [{ label: '款式', value: '紫電白、曜黑藍' }, { label: '尺寸', value: 'XS、S、M、L、XL' }],
    usageNotes: ['請依商品頁尺寸選項下單。', '清洗與保養方式以商品實際洗標為準。'],
    stockQuantity: 20,
    active: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    variants: [
      { id: 'purple-white', name: '紫電白', image: '/goodluck-running-vest.jpg', detailImages: [] },
      { id: 'black-blue', name: '曜黑藍', image: '/goodluck-running-vest-black.jpg', detailImages: [] },
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
    summary: '好運跑班團隊 T 恤，提供 XS 至 XL 尺寸選擇。',
    description: '把好運跑班識別帶進團練與日常穿搭。商品頁可直接查看圖片、售價、庫存與可選尺寸。',
    gallery: ['/goodluck-running-tee.jpg'],
    highlights: ['好運跑班團隊設計', 'XS 至 XL 尺寸', '適合團練與日常穿著'],
    specifications: [{ label: '尺寸', value: 'XS、S、M、L、XL' }],
    usageNotes: ['請依商品頁尺寸選項下單。', '清洗與保養方式以商品實際洗標為準。'],
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
    image: '/products/goodluck-cap/cap-front.jpeg',
    rating: 5,
    reviews: 0,
    tags: ['日常訓練'],
    summary: '黑色好運跑步帽，正面好運刺繡、側面閃電圖樣與背面馬蹄識別。',
    description: '適合跑步、運動與日常休閒搭配的好運跑班帽款。商品圖完整呈現正面、側面、背面與實際配戴效果。',
    gallery: [
      '/products/goodluck-cap/cap-front.jpeg',
      '/products/goodluck-cap/cap-side.jpeg',
      '/products/goodluck-cap/cap-back.png',
      '/products/goodluck-cap/cap-model-front.png',
      '/products/goodluck-cap/cap-model-side.png',
      '/products/goodluck-cap/cap-model-back.png',
    ],
    highlights: ['正面好運刺繡', '側面閃電圖樣', '背面馬蹄識別', '提供實際配戴圖片'],
    specifications: [{ label: '顏色', value: '黑色' }, { label: '尺寸', value: 'S/M、L/XL' }],
    usageNotes: ['請依頭圍與商品尺寸選項選購。', '清潔與保養方式以商品實際標示為準。'],
    stockQuantity: 20,
    active: true,
    sizes: ['S/M', 'L/XL'],
  },
  {
    id: '4',
    name: '好運運動毛巾',
    category: '跑者配件',
    price: 0,
    priceLabel: '私訊諮詢',
    image: '/products/goodluck-towel/goodluck-towel.jpeg',
    rating: 5,
    reviews: 0,
    tags: ['33 × 70 cm', '訓練必備'],
    summary: '33 × 70 公分好運運動毛巾，適合團練、比賽與運動後使用。',
    description: '以好運跑班品牌識別製作的運動毛巾，尺寸清楚、方便放入訓練包，適合日常訓練與賽事攜帶。',
    gallery: ['/products/goodluck-towel/goodluck-towel.jpeg'],
    highlights: ['33 × 70 公分', '好運跑班品牌圖樣', '訓練與賽事方便攜帶'],
    specifications: [{ label: '尺寸', value: '33 × 70 公分' }],
    usageNotes: ['首次使用前建議先清洗。', '清洗與保養方式以商品實際標示為準。'],
    stockQuantity: 20,
    active: true,
    sizes: ['33 × 70 cm'],
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
    summary: '每包 50 mL、含 42 g 碳水化合物與 170 kcal 的蜂蜜檸檬能量膠。',
    description: 'CALBOMB 蜂蜜檸檬能量膠採用蜂蜜配方，官方標示葡萄糖與果糖比例為 5:2，並取得 2024 A.A. 無添加驗證。適合依個人補給策略安排於訓練或賽事中使用。',
    gallery: ['/calbomb-energy-gel.png'],
    highlights: ['每包 42 g 碳水化合物', '每包 170 kcal', '50 mL 包裝', '2024 A.A. 無添加驗證'],
    specifications: [
      { label: '容量', value: '50 mL' },
      { label: '碳水化合物', value: '42 g / 包' },
      { label: '熱量', value: '170 kcal / 包' },
      { label: '風味', value: '蜂蜜檸檬' },
    ],
    usageNotes: ['請依個人訓練、賽事與飲食需求安排補給。', '食品資訊、過敏原與保存方式以商品包裝標示為準。'],
    externalUrl: 'https://calbomb.com/calbomb-honey-energy-gel/',
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
    video: row.video || undefined,
    rating: row.rating ?? 5,
    reviews: row.reviews ?? 0,
    tags: stringArray(row.tags),
    summary: row.summary?.trim() ?? '',
    description: row.description?.trim() ?? '',
    gallery: stringArray(row.gallery),
    highlights: stringArray(row.highlights),
    specifications: productSpecifications(row.specifications),
    usageNotes: stringArray(row.usage_notes),
    externalUrl: row.external_url?.trim() || undefined,
    variants: productVariants(row.variants),
    sizes: stringArray(row.sizes),
    stockQuantity: row.stock_quantity ?? 0,
    active: row.active ?? true,
  }
}

export function getCartProductId(cartId: string) {
  return cartId.split(':')[0] || cartId
}
