'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { uploadProductImage } from '@/components/admin/AdminProductCreator'

export type AdminEditableProduct = {
  id: string
  name: string
  category: string
  price: number
  priceLabel: string
  image: string
  tags: string[]
  sizes?: string[]
  variants?: Array<{ id: string; name: string; image: string }>
  stockQuantity: number
  active: boolean
}

type AdminProductEditorProps = {
  product: AdminEditableProduct
  runAction: (id: string, action: Record<string, unknown>) => Promise<boolean>
}

function productDraft(product: AdminEditableProduct) {
  return {
    name: product.name,
    category: product.category,
    price: product.price > 0 ? String(product.price / 100) : '',
    stockQuantity: String(product.stockQuantity),
    image: product.image,
    tags: product.tags.join('、'),
    sizes: (product.sizes ?? []).join('、'),
    variants: (product.variants ?? []).map((variant) => ({ ...variant })),
    active: product.active,
  }
}

export default function AdminProductEditor({ product, runAction }: AdminProductEditorProps) {
  const [draft, setDraft] = useState(() => productDraft(product))
  const [uploadingKey, setUploadingKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setDraft(productDraft(product))
  }, [product])

  async function uploadImage(file: File | undefined, variantIndex?: number) {
    if (!file) return
    const key = variantIndex === undefined ? 'main' : `variant-${variantIndex}`
    setUploadingKey(key)
    setLocalError('')
    try {
      const url = await uploadProductImage(file)
      if (variantIndex === undefined) {
        setDraft((current) => ({ ...current, image: url }))
      } else {
        setDraft((current) => ({
          ...current,
          variants: current.variants.map((variant, index) => index === variantIndex ? { ...variant, image: url } : variant),
        }))
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '圖片上傳失敗。')
    } finally {
      setUploadingKey('')
    }
  }

  function addVariant() {
    const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now())
    setDraft((current) => ({ ...current, variants: [...current.variants, { id: `variant-${suffix}`, name: '', image: '' }] }))
  }

  async function save() {
    setLocalError('')
    if (!draft.name.trim() || !draft.category.trim() || !draft.image) {
      setLocalError('請完整填寫商品名稱、分類與主圖。')
      return
    }
    if (draft.variants.some((variant) => !variant.name.trim() || !variant.image)) {
      setLocalError('請完整填寫每一個款式名稱並上傳款式圖片。')
      return
    }

    const priceTwd = Number(draft.price || 0)
    setIsSaving(true)
    await runAction(`product-${product.id}`, {
      action: 'update_product',
      productId: product.id,
      name: draft.name,
      category: draft.category,
      price: Number.isFinite(priceTwd) ? Math.round(priceTwd * 100) : -1,
      stockQuantity: Number(draft.stockQuantity || 0),
      image: draft.image,
      tags: draft.tags,
      sizes: draft.sizes,
      variants: draft.variants,
      active: draft.active,
    })
    setIsSaving(false)
  }

  return (
    <article className="apple-card overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-apple-gray-100">
            <Image src={draft.image} alt={`${draft.name}主圖`} fill sizes="180px" className="object-contain p-2" />
          </div>
          <label className="apple-button-outline mt-3 flex cursor-pointer gap-2 px-4 py-2.5 text-sm">
            {uploadingKey === 'main' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            更換主圖
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKey)} onChange={(event) => uploadImage(event.target.files?.[0])} />
          </label>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">商品名稱</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="apple-input" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">商品分類</span><input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="apple-input" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">售價（新台幣）</span><input value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value.replace(/\D/g, '') }))} inputMode="numeric" placeholder="洽詢商品可留空" className="apple-input" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">庫存</span><input value={draft.stockQuantity} onChange={(event) => setDraft((current) => ({ ...current, stockQuantity: event.target.value.replace(/\D/g, '') }))} inputMode="numeric" className="apple-input" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">標籤</span><input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="以逗號分隔" className="apple-input" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">尺寸或規格</span><input value={draft.sizes} onChange={(event) => setDraft((current) => ({ ...current, sizes: event.target.value }))} placeholder="以逗號分隔" className="apple-input" /></label>
          <label className="flex items-center gap-3 text-sm font-bold text-apple-gray-700"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4" />{draft.active ? '商品已上架' : '商品已下架'}</label>
        </div>
      </div>

      <div className="border-t border-black/10 px-5 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h3 className="font-black text-apple-gray-950">商品款式</h3><p className="mt-1 text-xs text-apple-gray-500">有顏色或不同設計時，可分別設定名稱與圖片。</p></div>
          <button type="button" onClick={addVariant} className="apple-button-outline gap-2 px-4 py-2 text-sm"><Plus className="h-4 w-4" />新增款式</button>
        </div>
        {draft.variants.length > 0 ? (
          <div className="divide-y divide-black/10 border-y border-black/10">
            {draft.variants.map((variant, index) => (
              <div key={variant.id} className="grid gap-3 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                <div className="relative h-[72px] w-[72px] overflow-hidden rounded-lg bg-apple-gray-100">
                  {variant.image ? <Image src={variant.image} alt={`${variant.name || '款式'}圖片`} fill sizes="72px" className="object-contain p-1" /> : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input value={variant.name} onChange={(event) => setDraft((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} placeholder="款式名稱" className="apple-input" />
                  <label className="apple-button-outline cursor-pointer gap-2 px-4 py-2 text-sm">
                    {uploadingKey === `variant-${index}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {variant.image ? '更換圖片' : '上傳圖片'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKey)} onChange={(event) => uploadImage(event.target.files?.[0], index)} />
                  </label>
                </div>
                <button type="button" onClick={() => setDraft((current) => ({ ...current, variants: current.variants.filter((_, itemIndex) => itemIndex !== index) }))} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50" aria-label={`刪除${variant.name || '款式'}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        ) : <p className="border-y border-black/10 py-4 text-sm text-apple-gray-500">此商品沒有額外款式，顧客會直接看到主圖。</p>}
      </div>

      <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>{localError ? <p className="text-sm font-semibold text-red-600">{localError}</p> : <p className="text-xs text-apple-gray-500">商品 ID：{product.id}</p>}</div>
        <button type="button" onClick={save} disabled={isSaving || Boolean(uploadingKey)} className="apple-button-primary gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}儲存商品</button>
      </div>
    </article>
  )
}
