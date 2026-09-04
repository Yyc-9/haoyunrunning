'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Film, ImagePlus, Loader2, Plus, Save, Settings2, Trash2, X } from 'lucide-react'
import CroppableImageInput from '@/components/admin/CroppableImageInput'
import { uploadProductMedia } from '@/lib/admin-product-media'
import { parseProductSizes, productActionPayload, productDraft, productDraftError, type AdminEditableProduct, type ProductAction, type ProductDraft, type ProductEditState, type ProductMediaUpload } from '@/lib/admin-products'

type Props = {
  product?: AdminEditableProduct
  categories?: string[]
  runAction: ProductAction
  onStateChange?: (state: ProductEditState) => void
  onSaved?: (name: string) => void
  onCancel?: () => void
  uploadMedia?: ProductMediaUpload
}

const commonSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL']

function MediaState({ ready, changed, count }: { ready: boolean; changed: boolean; count?: number }) {
  return <span className={`product-media-state ${ready ? 'is-ready' : ''}`}>
    {ready ? (changed ? '待儲存' : '已保存') : '未上傳'}{ready && count !== undefined ? ` ${count} 張` : ''}
  </span>
}

export default function AdminProductForm({ product, categories = [], runAction, onStateChange, onSaved, onCancel, uploadMedia = uploadProductMedia }: Props) {
  const [draft, setDraft] = useState(() => productDraft(product))
  const [savedDraft, setSavedDraft] = useState(() => productDraft(product))
  const [uploadingKey, setUploadingKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [customSizeOpen, setCustomSizeOpen] = useState(false)
  const [customSize, setCustomSize] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const categoryId = useId()
  const specificationsHintId = useId()
  const errorRef = useRef<HTMLParagraphElement>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)
  const busy = saving || deleting || Boolean(uploadingKey)
  const isNew = !product

  useEffect(() => { onStateChange?.({ dirty, busy }) }, [dirty, busy, onStateChange])
  useEffect(() => {
    if (!dirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  function change<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  async function upload(file: File | undefined, kind: 'image' | 'video', target: 'image' | 'video' | 'gallery' | number, detail = false) {
    if (!file || busy) return
    const key = typeof target === 'number' ? `variant-${target}-${detail ? 'detail' : 'image'}` : target
    setUploadingKey(key)
    setError('')
    setMessage('')
    try {
      const url = await uploadMedia(file, kind)
      setDraft((current) => {
        if (typeof target === 'number') return { ...current, variants: current.variants.map((variant, index) => index !== target ? variant : detail
          ? { ...variant, detailImages: [...variant.detailImages, url].slice(0, 12) }
          : { ...variant, image: url }) }
        return target === 'gallery' ? { ...current, gallery: [...current.gallery, url].slice(0, 12) } : { ...current, [target]: url }
      })
      setMessage('上傳成功。儲存商品後，變更才會顯示於商店。')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '媒體上傳失敗，請再試一次。') }
    finally { setUploadingKey('') }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    setMessage('')
    const validation = productDraftError(draft)
    if (validation) { setError(validation); return }
    setSaving(true)
    try {
      const success = await runAction(product ? `product-${product.id}` : 'create-product', productActionPayload(draft, product?.id))
      if (!success) { setError('商品未儲存成功，請查看錯誤訊息後再試一次。'); return }
      setSavedDraft(draft)
      setMessage(isNew ? '商品已建立。' : '商品已儲存。')
      onSaved?.(draft.name)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '商品未儲存成功，請再試一次。') }
    finally { setSaving(false) }
  }

  async function removeProduct() {
    if (!product || busy) return
    setDeleting(true)
    setError('')
    try {
      if (!await runAction(`delete-product-${product.id}`, { action: 'delete_product', productId: product.id })) setError('商品刪除失敗，請再試一次。')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '商品刪除失敗，請再試一次。') }
    finally { setDeleting(false) }
  }

  function addCustomSizes() {
    const added = parseProductSizes(customSize)
    if (!added.length) return
    change('sizes', [...new Set([...draft.sizes, ...added])])
    setCustomSize('')
    setCustomSizeOpen(false)
  }

  function moveImage(variantIndex: number, imageIndex: number, direction: -1 | 1) {
    change('variants', draft.variants.map((variant, index) => {
      if (index !== variantIndex) return variant
      const next = imageIndex + direction
      if (next < 0 || next >= variant.detailImages.length) return variant
      const detailImages = [...variant.detailImages]
      ;[detailImages[imageIndex], detailImages[next]] = [detailImages[next], detailImages[imageIndex]]
      return { ...variant, detailImages }
    }))
  }

  const sizes = [...new Set([...commonSizes, ...draft.sizes])]
  const hasLegacy = Boolean(product && (product.highlights.length || product.usageNotes.length))

  return <form onSubmit={save} className="product-editor" aria-label={isNew ? '新增商品' : '編輯商品'}>
    <header className="product-editor-header">
      <div className="product-editor-heading">
        <h3>{isNew ? '新增商品' : product.name}</h3>
        <label className="product-publish-toggle">
          <span>{draft.active ? '上架' : '下架'}</span>
          <input type="checkbox" role="switch" aria-label="商品上架" checked={draft.active} disabled={busy} onChange={(event) => change('active', event.target.checked)} />
          <span className="product-toggle-track" aria-hidden="true"><span /></span>
        </label>
        <span className={`product-save-state ${dirty ? 'is-dirty' : ''}`} role="status">{saving ? '儲存中…' : dirty ? '未儲存變更' : isNew ? '尚未建立' : '已儲存'}</span>
      </div>
      <div className="product-editor-actions">
        {isNew && onCancel ? <button type="button" className="product-button-secondary" onClick={onCancel} disabled={busy}>取消</button> : null}
        <button type="submit" className="product-button-primary" disabled={busy || (!isNew && !dirty)}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? '儲存中' : isNew ? '建立商品' : '儲存商品'}
        </button>
      </div>
    </header>

    <div className="product-editor-scroll" role="region" aria-label="商品編輯內容" tabIndex={0}>
      {error ? <p ref={errorRef} tabIndex={-1} role="alert" className="product-notice is-error">{error}</p> : null}
      {message ? <p role="status" className="product-notice is-success"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p> : null}
      <fieldset disabled={busy} className="product-editor-fields">
        <div className="product-editor-columns">
          <div className="product-content-fields">
            <label className="product-field"><span>商品名稱 <b>*</b></span><input className="apple-input" value={draft.name} maxLength={180} onChange={(event) => change('name', event.target.value)} placeholder="輸入商品名稱" /></label>
            <label className="product-field"><span>商品分類 <b>*</b></span><input className="apple-input" list={categoryId} value={draft.category} maxLength={100} onChange={(event) => change('category', event.target.value)} /><datalist id={categoryId}>{[...new Set([...categories, '跑者服飾', '跑者配件', '運動補給'])].map((category) => <option key={category} value={category} />)}</datalist></label>
            <label className="product-field"><span>商品摘要</span><input className="apple-input" value={draft.summary} maxLength={500} onChange={(event) => change('summary', event.target.value)} placeholder="用一句話說明商品特色" /></label>
            <label className="product-field product-intro-field"><span>商品簡介</span><textarea className="apple-input" value={draft.description} maxLength={Math.max(5000, savedDraft.description.length)} rows={9} onChange={(event) => change('description', event.target.value)} placeholder="介紹商品特色、使用情境與保養方式。" /><span className="product-field-help"><span>規格請在尺碼下方另外填寫。</span><span>{draft.description.length.toLocaleString()} / 5,000</span></span></label>
            {hasLegacy ? <p className="product-legacy-note">舊版重點與保養內容已合併於簡介；原有規格保留於獨立欄位。</p> : null}
          </div>

          <aside className="product-property-fields" aria-label="售價庫存與媒體">
            <label className="product-field"><span>售價（新台幣）</span><span className="product-currency-input"><span>NT$</span><input className="apple-input" value={draft.price} inputMode="decimal" onChange={(event) => change('price', event.target.value)} placeholder="洽詢售價可留空" /></span></label>
            <label className="product-field"><span>庫存 <b>*</b></span><input className="apple-input" value={draft.stockQuantity} inputMode="numeric" onChange={(event) => change('stockQuantity', event.target.value)} /></label>
            <fieldset className="product-size-field"><legend>可選商品尺碼</legend><div className="product-size-options">{sizes.map((size) => <button type="button" key={size} aria-pressed={draft.sizes.includes(size)} onClick={() => change('sizes', draft.sizes.includes(size) ? draft.sizes.filter((value) => value !== size) : [...draft.sizes, size])}>{size}{draft.sizes.includes(size) ? <Check className="product-size-check" aria-hidden="true" /> : null}</button>)}</div>
              {customSizeOpen ? <div className="product-custom-size"><input className="apple-input" aria-label="自訂尺碼" value={customSize} onChange={(event) => setCustomSize(event.target.value)} placeholder="如：F、均碼" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomSizes() } }} /><button type="button" className="product-text-action" onClick={addCustomSizes}>加入</button><button type="button" aria-label="取消自訂尺碼" onClick={() => setCustomSizeOpen(false)}><X className="h-4 w-4" /></button></div> : <button type="button" className="product-text-action product-custom-size-trigger" onClick={() => setCustomSizeOpen(true)}><Plus className="h-3.5 w-3.5" />自訂尺碼</button>}
              <p className="product-field-hint">不分尺碼的商品可全部不選。</p>
            </fieldset>

            <fieldset className="product-specifications-field" aria-describedby={specificationsHintId}>
              <legend>商品規格</legend>
              <p id={specificationsHintId} className="product-field-hint">例如材質、容量、包裝或尺寸說明；尺碼選項仍在上方設定。</p>
              {draft.specifications.length ? <div className="product-specification-list">
                {draft.specifications.map((specification, index) => (
                  <div key={index} className="product-specification-row">
                    <label className="product-field"><span>名稱</span><input className="apple-input" aria-label={`規格 ${index + 1} 名稱`} value={specification.label} maxLength={80} placeholder="如：材質" onChange={(event) => change('specifications', draft.specifications.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /></label>
                    <label className="product-field"><span>內容</span><textarea className="apple-input" aria-label={`規格 ${index + 1} 內容`} value={specification.value} maxLength={300} rows={2} placeholder="填寫規格內容" onChange={(event) => change('specifications', draft.specifications.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} /></label>
                    <button type="button" className="product-specification-remove product-icon-action is-danger" aria-label={`移除規格 ${index + 1}`} onClick={() => change('specifications', draft.specifications.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div> : <p className="product-field-hint">未填寫時，商店不顯示規格區。</p>}
              <button type="button" className="product-text-action product-add-specification" disabled={draft.specifications.length >= 30} onClick={() => change('specifications', [...draft.specifications, { label: '', value: '' }])}><Plus className="h-4 w-4" />新增規格</button>
            </fieldset>

            <section className="product-media-section" aria-label="媒體檔案">
              <h4>媒體檔案</h4>
              <div className="product-media-rows">
                <div className="product-media-row"><ImagePlus className="h-5 w-5" aria-hidden="true" /><span>主圖 <b className="text-red-600">*</b></span><MediaState ready={Boolean(draft.image)} changed={draft.image !== savedDraft.image} />
                  <CroppableImageInput className="product-text-action product-upload-action" disabled={busy} aspectRatio={1} aspectLabel="1:1" outputWidth={1600} onCroppedFile={(file) => upload(file, 'image', 'image')}>
                    {uploadingKey === 'image' ? '上傳中' : draft.image ? '更換' : '上傳'}<span className="sr-only">商品主圖</span>
                  </CroppableImageInput>
                </div>
                <div className="product-media-row"><Film className="h-5 w-5" aria-hidden="true" /><span>影片</span><MediaState ready={Boolean(draft.video)} changed={draft.video !== savedDraft.video} />
                  <div className="product-media-actions"><label className="product-text-action product-upload-action">{uploadingKey === 'video' ? '上傳中' : draft.video ? '更換' : '上傳'}<span className="sr-only">商品影片</span><input className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file, 'video', 'video') }} /></label>{draft.video ? <button type="button" className="product-icon-action" aria-label="移除商品影片" onClick={() => change('video', '')}><X className="h-3.5 w-3.5" /></button> : null}</div>
                </div>
                <div className="product-media-row"><ImagePlus className="h-5 w-5" aria-hidden="true" /><span>詳情圖</span><MediaState ready={draft.gallery.length > 0} count={draft.gallery.length} changed={JSON.stringify(draft.gallery) !== JSON.stringify(savedDraft.gallery)} /><button type="button" className="product-text-action" aria-expanded={galleryOpen} onClick={() => setGalleryOpen(!galleryOpen)}>{galleryOpen ? '收合' : '管理'}</button></div>
                {galleryOpen ? <div className="product-gallery-manager"><p className="product-field-hint">最多 12 張，只顯示保存結果。</p>{draft.gallery.map((url, index) => <div className="product-file-row" key={`${url}-${index}`}><span title={url.split('/').pop()}>詳情圖片 {index + 1}</span><button type="button" className="product-icon-action is-danger" aria-label={`移除詳情圖片 ${index + 1}`} onClick={() => change('gallery', draft.gallery.filter((_, item) => item !== index))}><Trash2 className="h-4 w-4" /></button></div>)}<CroppableImageInput className="product-text-action product-upload-action" disabled={busy || draft.gallery.length >= 12} aspectRatio={4 / 3} aspectLabel="4:3" outputWidth={1600} onCroppedFile={(file) => upload(file, 'image', 'gallery')}><Plus className="h-4 w-4" />{uploadingKey === 'gallery' ? '上傳中' : '加入詳情圖'}</CroppableImageInput></div> : null}
              </div>
              <p className="product-field-hint">後台不顯示預覽，媒體於商店正常展示。</p>
            </section>
          </aside>
        </div>

        <details className="product-advanced"><summary><Settings2 className="h-5 w-5" /><span>款式與進階設定</span>{draft.variants.length ? <span className="product-advanced-count">{draft.variants.length} 個款式</span> : null}<ChevronDown className="h-4 w-4 product-disclosure-icon" /></summary>
          <div className="product-advanced-content">
            <div className="product-advanced-grid"><label className="product-field"><span>商品標籤</span><input className="apple-input" value={draft.tags} onChange={(event) => change('tags', event.target.value)} placeholder="以逗號分隔" /></label><label className="product-field"><span>官方商品連結</span><input className="apple-input" type="url" value={draft.externalUrl} onChange={(event) => change('externalUrl', event.target.value)} placeholder="https://" /></label></div>
            <div className="product-variant-heading"><div><h4>商品款式</h4><p className="product-field-hint">不同顏色或版型需要不同圖片時才新增。</p></div><button type="button" className="product-button-secondary" onClick={() => change('variants', [...draft.variants, { id: `variant-${crypto.randomUUID().slice(0, 8)}`, name: '', image: '', detailImages: [] }])}><Plus className="h-4 w-4" />新增款式</button></div>
            {draft.variants.map((variant, index) => <div className="product-variant" key={variant.id}>
              <div className="product-variant-top"><label className="product-field"><span>款式 {index + 1} 名稱</span><input className="apple-input" value={variant.name} onChange={(event) => change('variants', draft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="如：黑色" /></label><CroppableImageInput className="product-text-action product-upload-action" disabled={busy} aspectRatio={1} aspectLabel="1:1" outputWidth={1600} onCroppedFile={(file) => upload(file, 'image', index)}>{variant.image ? '更換款式主圖' : '上傳款式主圖'}</CroppableImageInput><button type="button" className="product-icon-action is-danger" aria-label={`刪除款式 ${index + 1}`} onClick={() => change('variants', draft.variants.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></button></div>
              <div className="product-variant-status"><span>{variant.image ? '款式主圖已上傳' : '尚未上傳主圖'} / 詳情圖 {variant.detailImages.length} 張</span><CroppableImageInput className="product-text-action product-upload-action" disabled={busy || variant.detailImages.length >= 12} aspectRatio={4 / 3} aspectLabel="4:3" outputWidth={1600} onCroppedFile={(file) => upload(file, 'image', index, true)}><Plus className="h-4 w-4" />款式詳情圖</CroppableImageInput></div>
              {variant.detailImages.map((url, imageIndex) => <div className="product-file-row" key={`${url}-${imageIndex}`}><span title={url.split('/').pop()}>圖片 {imageIndex + 1}</span><div className="product-media-actions"><button type="button" className="product-icon-action" aria-label={`款式 ${index + 1} 圖片 ${imageIndex + 1} 向前移動`} disabled={imageIndex === 0} onClick={() => moveImage(index, imageIndex, -1)}><ChevronLeft className="h-4 w-4" /></button><button type="button" className="product-icon-action" aria-label={`款式 ${index + 1} 圖片 ${imageIndex + 1} 向後移動`} disabled={imageIndex === variant.detailImages.length - 1} onClick={() => moveImage(index, imageIndex, 1)}><ChevronRight className="h-4 w-4" /></button><button type="button" className="product-icon-action is-danger" aria-label={`移除款式 ${index + 1} 圖片 ${imageIndex + 1}`} onClick={() => change('variants', draft.variants.map((item, itemIndex) => itemIndex !== index ? item : { ...item, detailImages: item.detailImages.filter((_, detailIndex) => detailIndex !== imageIndex) }))}><Trash2 className="h-4 w-4" /></button></div></div>)}
            </div>)}
          </div>
        </details>
      </fieldset>

      {!isNew ? <footer className="product-editor-footer"><button type="button" className="product-delete-action" disabled={busy} onClick={() => setDeleteOpen(!deleteOpen)}><Trash2 className="h-4 w-4" />刪除商品</button>{dirty ? <button type="button" className="product-text-action" disabled={busy} onClick={() => { if (window.confirm('確定放棄這件商品的未儲存變更？')) { setDraft(savedDraft); setError(''); setMessage('') } }}>放棄變更</button> : null}</footer> : null}
      {deleteOpen ? <div className="product-delete-confirm" role="region" aria-label="刪除商品確認"><p>確定刪除「{product?.name}」？</p><p className="product-field-hint">商品將立即從商店移除，既有訂單仍會保留。</p><div><button type="button" className="product-button-secondary" disabled={busy} onClick={() => setDeleteOpen(false)}>取消</button><button type="button" className="product-button-danger" disabled={busy} onClick={() => void removeProduct()}>{deleting ? '刪除中' : '確認刪除'}</button></div></div> : null}
    </div>
  </form>
}
