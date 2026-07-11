'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Film, ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { uploadProductMedia } from '@/components/admin/AdminProductCreator'

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
    video: product.video ?? '',
    tags: product.tags.join('、'),
    summary: product.summary,
    description: product.description,
    gallery: [...product.gallery],
    highlights: product.highlights.join('\n'),
    specifications: product.specifications.map((item) => `${item.label}：${item.value}`).join('\n'),
    usageNotes: product.usageNotes.join('\n'),
    externalUrl: product.externalUrl ?? '',
    sizes: (product.sizes ?? []).join('、'),
    variants: (product.variants ?? []).map((variant) => ({ ...variant })),
    active: product.active,
  }
}

function parseSpecificationLines(value: string) {
  return value.split(/\r?\n/).flatMap((line) => {
    const separator = line.search(/[:：]/)
    if (separator < 1) return []
    const label = line.slice(0, separator).trim()
    const specificationValue = line.slice(separator + 1).trim()
    return label && specificationValue ? [{ label, value: specificationValue }] : []
  })
}

export default function AdminProductEditor({ product, runAction }: AdminProductEditorProps) {
  const [draft, setDraft] = useState(() => productDraft(product))
  const [uploadingKey, setUploadingKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setDraft(productDraft(product))
  }, [product])

  async function uploadMedia(file: File | undefined, mediaKind: 'image' | 'video', variantIndex?: number | 'gallery') {
    if (!file) return
    const key = mediaKind === 'video' ? 'video' : variantIndex === undefined ? 'main' : variantIndex === 'gallery' ? 'gallery' : `variant-${variantIndex}`
    setUploadingKey(key)
    setLocalError('')
    try {
      const url = await uploadProductMedia(file, mediaKind)
      if (mediaKind === 'video') {
        setDraft((current) => ({ ...current, video: url }))
      } else if (variantIndex === undefined) {
        setDraft((current) => ({ ...current, image: url }))
      } else if (variantIndex === 'gallery') {
        setDraft((current) => ({ ...current, gallery: [...current.gallery, url].slice(0, 12) }))
      } else {
        setDraft((current) => ({
          ...current,
          variants: current.variants.map((variant, index) => index === variantIndex ? { ...variant, image: url } : variant),
        }))
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '媒體上傳失敗。')
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
      video: draft.video,
      tags: draft.tags,
      sizes: draft.sizes,
      summary: draft.summary,
      description: draft.description,
      gallery: draft.gallery,
      highlights: draft.highlights,
      specifications: parseSpecificationLines(draft.specifications),
      usageNotes: draft.usageNotes,
      externalUrl: draft.externalUrl,
      variants: draft.variants,
      active: draft.active,
    })
    setIsSaving(false)
  }

  return (
    <article className="apple-card overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-apple-gray-100">
              <Image src={draft.image} alt={`${draft.name}主圖`} fill sizes="180px" className="object-contain p-2" />
            </div>
            <label className="apple-button-outline mt-3 flex cursor-pointer gap-2 px-4 py-2.5 text-sm">
              {uploadingKey === 'main' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              更換主圖
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKey)} onChange={(event) => uploadMedia(event.target.files?.[0], 'image')} />
            </label>
          </div>
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-black">
              {draft.video ? (
                <video src={draft.video} poster={draft.image || undefined} aria-label={`${draft.name}影片預覽`} controls muted playsInline preload="metadata" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-white/65"><Film className="h-9 w-9" /><span className="text-xs font-bold">尚未上傳影片</span></div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <label className="apple-button-outline flex cursor-pointer gap-2 px-3 py-2.5 text-sm">
                {uploadingKey === 'video' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                {draft.video ? '更換影片' : '上傳影片'}
                <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" disabled={Boolean(uploadingKey)} onChange={(event) => uploadMedia(event.target.files?.[0], 'video')} />
              </label>
              {draft.video ? <button type="button" title="移除影片" aria-label={`移除${draft.name}影片`} onClick={() => setDraft((current) => ({ ...current, video: '' }))} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50"><Trash2 className="h-4 w-4" /></button> : null}
            </div>
          </div>
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
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><h3 className="font-black text-apple-gray-950">商品詳情圖片</h3><p className="mt-1 text-xs text-apple-gray-500">最多 12 張，顧客可在商品頁逐張查看。</p></div>
          <label className="apple-button-outline inline-flex cursor-pointer gap-2 px-4 py-2 text-sm">
            {uploadingKey === 'gallery' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            加入圖片
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKey) || draft.gallery.length >= 12} onChange={(event) => uploadMedia(event.target.files?.[0], 'image', 'gallery')} />
          </label>
        </div>
        {draft.gallery.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {draft.gallery.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-apple-gray-100">
                <Image src={imageUrl} alt={`${draft.name}詳情圖片 ${index + 1}`} fill sizes="120px" className="object-contain p-1" />
                <button type="button" onClick={() => setDraft((current) => ({ ...current, gallery: current.gallery.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`移除詳情圖片 ${index + 1}`} className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-red-600 shadow"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        ) : <p className="border-y border-black/10 py-4 text-sm text-apple-gray-500">目前會以商品主圖作為商品頁圖片。</p>}
      </div>

      <div className="border-t border-black/10 px-5 py-5">
        <div className="mb-4"><h3 className="font-black text-apple-gray-950">商品詳情內容</h3><p className="mt-1 text-xs text-apple-gray-500">儲存後會直接更新前台商品頁。</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold text-apple-gray-500">商品摘要</span><input value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} maxLength={500} placeholder="用一句話說明商品特色" className="apple-input" /></label>
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold text-apple-gray-500">完整介紹</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={5} maxLength={5000} className="apple-input resize-y" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">商品重點（每行一項）</span><textarea value={draft.highlights} onChange={(event) => setDraft((current) => ({ ...current, highlights: event.target.value }))} rows={5} className="apple-input resize-y" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">規格（每行「名稱：內容」）</span><textarea value={draft.specifications} onChange={(event) => setDraft((current) => ({ ...current, specifications: event.target.value }))} rows={5} className="apple-input resize-y" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">使用與保養（每行一項）</span><textarea value={draft.usageNotes} onChange={(event) => setDraft((current) => ({ ...current, usageNotes: event.target.value }))} rows={4} className="apple-input resize-y" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">官方商品連結（選填）</span><input type="url" value={draft.externalUrl} onChange={(event) => setDraft((current) => ({ ...current, externalUrl: event.target.value }))} placeholder="https://" className="apple-input" /></label>
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
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKey)} onChange={(event) => uploadMedia(event.target.files?.[0], 'image', index)} />
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
