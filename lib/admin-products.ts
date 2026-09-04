import { getProductIntro } from '@/lib/shop-products'

export type AdminEditableProduct = {
  id: string
  name: string
  category: string
  price: number
  priceLabel: string
  image: string
  video?: string
  tags: string[]
  summary: string
  description: string
  gallery: string[]
  highlights: string[]
  specifications: Array<{ label: string; value: string }>
  usageNotes: string[]
  externalUrl?: string
  sizes?: string[]
  variants?: Array<{ id: string; name: string; image: string; detailImages: string[] }>
  stockQuantity: number
  active: boolean
}

export type ProductAction = (id: string, action: Record<string, unknown>) => Promise<boolean>
export type ProductEditState = { dirty: boolean; busy: boolean }
export type ProductMediaUpload = (file: File, kind: 'image' | 'video') => Promise<string>
export type ProductFilter = 'all' | 'active' | 'inactive' | 'lowStock'

export function parseProductSizes(value: string) {
  return [...new Set(value.split(/[,，、\n]/).map((size) => size.trim()).filter(Boolean))]
}

export function productDraft(product?: AdminEditableProduct) {
  return {
    name: product?.name ?? '',
    category: product?.category ?? '跑者配件',
    price: product && product.price > 0 ? String(product.price / 100) : '',
    stockQuantity: String(product?.stockQuantity ?? 0),
    image: product?.image ?? '',
    video: product?.video ?? '',
    tags: product?.tags.join('、') ?? '',
    summary: product?.summary ?? '',
    description: product ? getProductIntro(product) : '',
    gallery: [...(product?.gallery ?? [])],
    externalUrl: product?.externalUrl ?? '',
    sizes: [...(product?.sizes ?? [])],
    variants: (product?.variants ?? []).map((variant) => ({
      ...variant, detailImages: [...(variant.detailImages ?? [])],
    })),
    active: product?.active ?? false,
  }
}

export type ProductDraft = ReturnType<typeof productDraft>

export function productDraftError(draft: ProductDraft) {
  if (!draft.name.trim() || !draft.category.trim() || !draft.image) return '請填寫商品名稱、分類並上傳主圖。'
  if (draft.variants.some((variant) => !variant.name.trim() || !variant.image)) return '請填寫每個款式的名稱並上傳款式主圖。'
  const price = Number(draft.price || 0)
  const stock = Number(draft.stockQuantity || 0)
  if (!Number.isFinite(price) || price < 0 || price > 100_000) return '售價必須介於 0 與 100,000 元之間。'
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return '庫存必須是介於 0 與 1,000,000 的整數。'
  if (draft.description.length > 5000) return '商品簡介超過 5,000 字，請整理後再儲存，避免內容被截斷。'
  return ''
}

export function productActionPayload(draft: ProductDraft, id?: string) {
  return {
    ...draft,
    action: id ? 'update_product' : 'create_product',
    ...(id ? { productId: id } : {}),
    price: Math.round(Number(draft.price || 0) * 100),
    stockQuantity: Number(draft.stockQuantity || 0),
    sizes: draft.sizes.join('、'),
    // Legacy content is merged into description by productDraft before clearing these fields.
    highlights: '', specifications: [], usageNotes: '',
  }
}

export function filterProducts(products: AdminEditableProduct[], query: string, filter: ProductFilter) {
  const text = query.trim().toLowerCase()
  return products.filter((product) => {
    if (filter === 'active' && !product.active) return false
    if (filter === 'inactive' && product.active) return false
    if (filter === 'lowStock' && product.stockQuantity > 5) return false
    return !text || [product.id, product.name, product.category, product.summary, ...product.tags]
      .some((value) => value.toLowerCase().includes(text))
  })
}
