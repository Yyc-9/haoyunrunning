'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Film, ImagePlus, Loader2, PackagePlus, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AdminProductCreatorProps = {
  runAction: (id: string, action: Record<string, unknown>) => Promise<boolean>
}

const initialProductForm = {
  name: '',
  category: '跑者配件',
  price: '',
  stockQuantity: '0',
  image: '',
  video: '',
  gallery: [] as string[],
  variants: [] as Array<{ id: string; name: string; image: string; detailImages: string[] }>,
  tags: '',
  sizes: '',
  summary: '',
  description: '',
  highlights: '',
  specifications: '',
  usageNotes: '',
  externalUrl: '',
  active: false,
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

export async function uploadProductMedia(file: File, mediaKind: 'image' | 'video') {
  if (!supabase) throw new Error('媒體服務尚未設定。')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('請重新登入管理員帳號。')

  if (mediaKind === 'video') {
    const signResponse = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: file.type,
        fileSize: file.size,
        folder: 'products',
      }),
    })
    const signed = (await signResponse.json().catch(() => ({}))) as {
      url?: string
      path?: string
      token?: string
      error?: string
    }
    if (!signResponse.ok || !signed.url || !signed.path || !signed.token) {
      throw new Error(signed.error || '無法建立影片上傳憑證。')
    }

    const { error } = await supabase.storage
      .from('site-media')
      .uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type,
        cacheControl: '31536000',
      })
    if (error) throw new Error(error.message || '影片上傳失敗。')
    return signed.url
  }

  const formData = new FormData()
  formData.set('file', file)
  formData.set('folder', 'products')

  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  })
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!response.ok || !payload.url) throw new Error(payload.error || '圖片上傳失敗。')
  return payload.url
}

export default function AdminProductCreator({ runAction }: AdminProductCreatorProps) {
  const [form, setForm] = useState(initialProductForm)
  const [uploadingKind, setUploadingKind] = useState('')
  const [uploadError, setUploadError] = useState('')

  async function handleMedia(file: File | undefined, mediaKind: 'image' | 'video', target: 'image' | 'video' | 'gallery' = mediaKind) {
    if (!file) return
    setUploadingKind(target)
    setUploadError('')
    try {
      const url = await uploadProductMedia(file, mediaKind)
      setForm((current) => target === 'gallery'
        ? { ...current, gallery: [...current.gallery, url].slice(0, 12) }
        : { ...current, [target]: url })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '媒體上傳失敗。')
    } finally {
      setUploadingKind('')
    }
  }

  async function handleVariantMedia(file: File | undefined, variantIndex: number, target: 'image' | 'detail') {
    if (!file) return
    const key = `variant-${target}-${variantIndex}`
    setUploadingKind(key)
    setUploadError('')
    try {
      const url = await uploadProductMedia(file, 'image')
      setForm((current) => ({
        ...current,
        variants: current.variants.map((variant, index) => index === variantIndex
          ? target === 'image'
            ? { ...variant, image: url }
            : { ...variant, detailImages: [...variant.detailImages, url].slice(0, 12) }
          : variant),
      }))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '款式圖片上傳失敗。')
    } finally {
      setUploadingKind('')
    }
  }

  function addVariant() {
    const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now())
    setForm((current) => ({ ...current, variants: [...current.variants, { id: `variant-${suffix}`, name: '', image: '', detailImages: [] }] }))
  }

  function moveVariantDetail(variantIndex: number, imageIndex: number, direction: -1 | 1) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, index) => {
        if (index !== variantIndex) return variant
        const nextIndex = imageIndex + direction
        if (nextIndex < 0 || nextIndex >= variant.detailImages.length) return variant
        const detailImages = [...variant.detailImages]
        ;[detailImages[imageIndex], detailImages[nextIndex]] = [detailImages[nextIndex], detailImages[imageIndex]]
        return { ...variant, detailImages }
      }),
    }))
  }

  async function createProduct() {
    if (form.variants.some((variant) => !variant.name.trim() || !variant.image)) {
      setUploadError('請完整填寫每一個款式名稱並上傳款式主圖。')
      return
    }
    const priceTwd = Number(form.price || 0)
    const created = await runAction('create-product', {
      action: 'create_product',
      name: form.name,
      category: form.category,
      price: Number.isFinite(priceTwd) ? Math.round(priceTwd * 100) : -1,
      stockQuantity: Number(form.stockQuantity || 0),
      image: form.image,
      video: form.video,
      tags: form.tags,
      sizes: form.sizes,
      summary: form.summary,
      description: form.description,
      gallery: form.gallery,
      variants: form.variants,
      highlights: form.highlights,
      specifications: parseSpecificationLines(form.specifications),
      usageNotes: form.usageNotes,
      externalUrl: form.externalUrl,
      active: form.active,
    })

    if (created) {
      setForm(initialProductForm)
    }
  }

  return (
    <div className="apple-card p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-xl font-black text-apple-gray-900">新增商城商品</h2>
          <p className="mt-1 text-sm leading-6 text-apple-gray-600">主圖為必填，也可加入一支商品影片。可先儲存為下架狀態，確認完成後再公開。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label title="上傳商品主圖" className="apple-button-outline inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-3">
            {uploadingKind === 'image' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {form.image ? '更換主圖' : '上傳主圖'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKind)} onChange={(event) => handleMedia(event.target.files?.[0], 'image')} />
          </label>
          <label title="上傳商品影片" className="apple-button-outline inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-3">
            {uploadingKind === 'video' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            {form.video ? '更換影片' : '上傳影片'}
            <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" disabled={Boolean(uploadingKind)} onChange={(event) => handleMedia(event.target.files?.[0], 'video')} />
          </label>
          <label title="加入商品詳情圖片" className="apple-button-outline inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-3">
            {uploadingKind === 'gallery' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            加入詳情圖
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKind) || form.gallery.length >= 12} onChange={(event) => handleMedia(event.target.files?.[0], 'image', 'gallery')} />
          </label>
        </div>
      </div>

      {uploadError ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{uploadError}</p> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(320px,460px)_1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-apple-gray-100">
            {form.image ? (
              <Image src={form.image} alt="新商品主圖預覽" fill sizes="220px" className="object-contain p-3" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-apple-gray-400">
                <PackagePlus className="h-10 w-10" />
                <span className="text-xs font-bold">尚未上傳主圖</span>
              </div>
            )}
          </div>
          <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-black">
            {form.video ? (
              <>
                <video src={form.video} poster={form.image || undefined} aria-label="新商品影片預覽" controls muted playsInline preload="metadata" className="h-full w-full object-contain" />
                <button type="button" title="移除影片" aria-label="移除新商品影片" onClick={() => setForm((current) => ({ ...current, video: '' }))} className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-sm"><Trash2 className="h-4 w-4" /></button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-apple-gray-950 text-white/65">
                <Film className="h-10 w-10" />
                <span className="text-xs font-bold">選擇性上傳影片</span>
                <span className="text-[11px]">MP4、WebM、MOV；50 MB 內</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="商品名稱" className="apple-input" />
          <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="商品分類" className="apple-input" />
          <div className="flex items-center gap-2">
            <span className="font-bold">NT$</span>
            <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value.replace(/\D/g, '') }))} placeholder="售價；洽詢商品可留空" inputMode="numeric" className="apple-input" />
          </div>
          <input value={form.stockQuantity} onChange={(event) => setForm((current) => ({ ...current, stockQuantity: event.target.value.replace(/\D/g, '') }))} placeholder="庫存數量" inputMode="numeric" className="apple-input" />
          <input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="標籤，以逗號分隔" className="apple-input" />
          <input value={form.sizes} onChange={(event) => setForm((current) => ({ ...current, sizes: event.target.value }))} placeholder="尺寸或規格，以逗號分隔" className="apple-input" />
          <label className="flex items-center gap-3 text-sm font-bold text-apple-gray-700">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4" />
            建立後立即上架
          </label>
          <button
            type="button"
            disabled={Boolean(uploadingKind) || !form.name.trim() || !form.image}
            onClick={createProduct}
            className="apple-button-primary gap-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PackagePlus className="h-4 w-4" />
            建立商品
          </button>
        </div>
      </div>

      {form.gallery.length > 0 ? (
        <div className="mt-5 border-t border-black/10 pt-5">
          <h3 className="text-sm font-black text-apple-gray-900">商品詳情圖片</h3>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {form.gallery.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-apple-gray-100">
                <Image src={imageUrl} alt={`詳情圖片 ${index + 1}`} fill sizes="120px" className="object-contain p-1" />
                <button type="button" onClick={() => setForm((current) => ({ ...current, gallery: current.gallery.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`移除詳情圖片 ${index + 1}`} className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-red-600 shadow"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 border-t border-black/10 pt-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><h3 className="font-black text-apple-gray-950">商品款式與圖片</h3><p className="mt-1 text-xs text-apple-gray-500">每個款式都可設定自己的主圖與詳情圖片；沒有款式的商品可略過。</p></div>
          <button type="button" onClick={addVariant} className="apple-button-outline gap-2 px-4 py-2 text-sm"><Plus className="h-4 w-4" />新增款式</button>
        </div>
        {form.variants.length ? (
          <div className="mt-4 space-y-4">
            {form.variants.map((variant, variantIndex) => (
              <div key={variant.id} className="rounded-lg border border-black/10 bg-apple-gray-50 p-4">
                <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
                  <div>
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-white">
                      {variant.image ? <Image src={variant.image} alt={`${variant.name || '款式'}主圖`} fill sizes="200px" className="object-contain p-2" /> : <div className="flex h-full items-center justify-center text-xs font-bold text-apple-gray-400">尚未上傳款式主圖</div>}
                    </div>
                    <input value={variant.name} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item, index) => index === variantIndex ? { ...item, name: event.target.value } : item) }))} placeholder="款式名稱" className="apple-input mt-3" />
                    <label className="apple-button-outline mt-2 flex cursor-pointer gap-2 px-4 py-2 text-sm">{uploadingKind === `variant-image-${variantIndex}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{variant.image ? '更換款式主圖' : '上傳款式主圖'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKind)} onChange={(event) => handleVariantMedia(event.target.files?.[0], variantIndex, 'image')} /></label>
                    <button type="button" onClick={() => setForm((current) => ({ ...current, variants: current.variants.filter((_, index) => index !== variantIndex) }))} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />刪除款式</button>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><p className="text-sm font-black text-apple-gray-900">{variant.name || `款式 ${variantIndex + 1}`}詳情圖片</p><label className="apple-button-outline inline-flex cursor-pointer gap-2 px-4 py-2 text-sm">{uploadingKind === `variant-detail-${variantIndex}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}加入詳情圖<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploadingKind) || variant.detailImages.length >= 12} onChange={(event) => handleVariantMedia(event.target.files?.[0], variantIndex, 'detail')} /></label></div>
                    {variant.detailImages.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{variant.detailImages.map((imageUrl, imageIndex) => <div key={imageUrl} className="overflow-hidden rounded-lg border border-black/10 bg-white"><div className="relative aspect-square"><Image src={imageUrl} alt={`${variant.name || '款式'}詳情圖 ${imageIndex + 1}`} fill sizes="150px" className="object-contain p-1" /></div><div className="grid grid-cols-3 border-t border-black/10"><button type="button" disabled={imageIndex === 0} onClick={() => moveVariantDetail(variantIndex, imageIndex, -1)} title="向前移動" className="flex h-9 items-center justify-center disabled:opacity-25"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={imageIndex === variant.detailImages.length - 1} onClick={() => moveVariantDetail(variantIndex, imageIndex, 1)} title="向後移動" className="flex h-9 items-center justify-center border-x border-black/10 disabled:opacity-25"><ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => setForm((current) => ({ ...current, variants: current.variants.map((item, index) => index === variantIndex ? { ...item, detailImages: item.detailImages.filter((_, detailIndex) => detailIndex !== imageIndex) } : item) }))} title="移除圖片" className="flex h-9 items-center justify-center text-red-600"><Trash2 className="h-4 w-4" /></button></div></div>)}</div> : <p className="mt-4 rounded-lg border border-dashed border-black/15 bg-white p-6 text-center text-sm text-apple-gray-500">可加入這個款式專屬的正面、背面與細節圖片。</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 rounded-lg border border-dashed border-black/15 p-5 text-sm text-apple-gray-500">尚未新增款式，顧客會直接查看商品通用圖片。</p>}
      </div>

      <div className="mt-5 border-t border-black/10 pt-5">
        <div className="mb-4"><h3 className="font-black text-apple-gray-950">商品詳情</h3><p className="mt-1 text-xs text-apple-gray-500">這些內容會直接顯示在商品獨立頁面。</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold text-apple-gray-500">商品摘要</span><input value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} maxLength={500} placeholder="用一句話說明商品特色" className="apple-input" /></label>
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold text-apple-gray-500">完整介紹</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} maxLength={5000} placeholder="商品用途、設計與適合情境" className="apple-input resize-y" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">商品重點（每行一項）</span><textarea value={form.highlights} onChange={(event) => setForm((current) => ({ ...current, highlights: event.target.value }))} rows={5} placeholder={'團隊限定設計\n適合日常訓練'} className="apple-input resize-y" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">規格（每行「名稱：內容」）</span><textarea value={form.specifications} onChange={(event) => setForm((current) => ({ ...current, specifications: event.target.value }))} rows={5} placeholder={'尺寸：S、M、L\n顏色：黑色'} className="apple-input resize-y" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">使用與保養（每行一項）</span><textarea value={form.usageNotes} onChange={(event) => setForm((current) => ({ ...current, usageNotes: event.target.value }))} rows={4} className="apple-input resize-y" /></label>
          <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">官方商品連結（選填）</span><input type="url" value={form.externalUrl} onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value }))} placeholder="https://" className="apple-input" /></label>
        </div>
      </div>
    </div>
  )
}
