'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ImagePlus, Loader2, PackagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AdminProductCreatorProps = {
  runAction: (id: string, action: Record<string, unknown>) => Promise<boolean>
}

export async function uploadProductImage(file: File) {
  if (!supabase) throw new Error('圖片服務尚未設定。')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('請重新登入管理員帳號。')

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
  const [form, setForm] = useState({
    name: '',
    category: '跑者配件',
    price: '',
    stockQuantity: '0',
    image: '',
    tags: '',
    sizes: '',
    active: false,
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleImage(file?: File) {
    if (!file) return
    setIsUploading(true)
    setUploadError('')
    try {
      const image = await uploadProductImage(file)
      setForm((current) => ({ ...current, image }))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '圖片上傳失敗。')
    } finally {
      setIsUploading(false)
    }
  }

  async function createProduct() {
    const priceTwd = Number(form.price || 0)
    const created = await runAction('create-product', {
      action: 'create_product',
      name: form.name,
      category: form.category,
      price: Number.isFinite(priceTwd) ? Math.round(priceTwd * 100) : -1,
      stockQuantity: Number(form.stockQuantity || 0),
      image: form.image,
      tags: form.tags,
      sizes: form.sizes,
      active: form.active,
    })

    if (created) {
      setForm({ name: '', category: '跑者配件', price: '', stockQuantity: '0', image: '', tags: '', sizes: '', active: false })
    }
  }

  return (
    <div className="apple-card p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-xl font-black text-apple-gray-900">新增商城商品</h2>
          <p className="mt-1 text-sm leading-6 text-apple-gray-600">上傳主圖並填寫商品資料。可先儲存為下架狀態，確認完成後再公開。</p>
        </div>
        <label title="上傳商品主圖" className="apple-button-outline inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-3">
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {form.image ? '更換主圖' : '上傳主圖'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => handleImage(event.target.files?.[0])}
          />
        </label>
      </div>

      {uploadError ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{uploadError}</p> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
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
            disabled={isUploading || !form.name.trim() || !form.image}
            onClick={createProduct}
            className="apple-button-primary gap-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PackagePlus className="h-4 w-4" />
            建立商品
          </button>
        </div>
      </div>
    </div>
  )
}
