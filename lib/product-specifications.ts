import type { ProductSpecification, ShopProduct } from '@/lib/shop-products'

export type SpecificationGroup = { label: string; options: string[] }
type SpecificationSource = Pick<ShopProduct, 'specifications' | 'sizes' | 'variants'>

export function parseSpecificationOptions(value: string) {
  // Keep slashes intact: S/M and g / 包 are single options.
  return [...new Set(value.split(/[,，、\r\n]/).map((option) => option.trim()).filter(Boolean))]
}

export function getSpecificationGroups(product: SpecificationSource): SpecificationGroup[] {
  const groups = new Map<string, string[]>()
  for (const { label, value } of product.specifications) {
    const name = label.trim()
    if (!name) continue
    groups.set(name, [...new Set([...(groups.get(name) ?? []), ...parseSpecificationOptions(value)])])
  }
  const sameOptions = (options: string[], existing: string[]) => {
    const values = [...new Set(existing.map((value) => value.trim()).filter(Boolean))]
    return values.length > 0 && values.length === options.length && values.every((value) => options.includes(value))
  }
  return [...groups].map(([label, options]) => ({ label, options })).filter(({ label, options }) => {
    if (!options.length) return false
    // Legacy catalog rows may repeat the existing size/style controls.
    if (['尺寸', '尺碼', '商品尺碼'].includes(label) && sameOptions(options, product.sizes ?? [])) return false
    if (['款式', '顏色', '配色'].includes(label) && sameOptions(options, product.variants?.map((variant) => variant.name) ?? [])) return false
    return true
  })
}

export function readSelectedSpecifications(value: unknown): ProductSpecification[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 30) return null
  const selected: ProductSpecification[] = []
  const labels = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.label !== 'string' || typeof item.value !== 'string') return null
    const label = item.label.trim()
    const option = item.value.trim()
    if (!label || !option || label.length > 80 || option.length > 300 || labels.has(label)) return null
    labels.add(label)
    selected.push({ label, value: option })
  }
  return selected
}

export function specificationSelectionError(product: SpecificationSource, selection: unknown) {
  const selected = readSelectedSpecifications(selection)
  const groups = getSpecificationGroups(product)
  if (!selected || selected.length !== groups.length || groups.some((group) => !group.options.includes(selected.find((item) => item.label === group.label)?.value ?? ''))) {
    return '商品規格已更新或尚未選齊，請回商品頁重新選擇後加入購物車。'
  }
  return ''
}

export function formatSelectedSpecifications(selection: unknown) {
  return (readSelectedSpecifications(selection) ?? []).map(({ label, value }) => `${label}：${value}`).join(' · ')
}

export function productCartItemId(productId: string, variantId: string | undefined, size: string, selection: ProductSpecification[]) {
  const base = [productId, variantId, size].filter(Boolean).join(':')
  if (!selection.length) return base
  const sorted = selection.map(({ label, value }) => [label, value]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
  return `${productId}:options=${encodeURIComponent(JSON.stringify([variantId ?? '', size, sorted]))}`
}
