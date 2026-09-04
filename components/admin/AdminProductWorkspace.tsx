'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import './product-workspace.css'
import { Package, Plus, Search, X } from 'lucide-react'
import AdminProductCreator from '@/components/admin/AdminProductCreator'
import AdminProductEditor from '@/components/admin/AdminProductEditor'
import { filterProducts, type AdminEditableProduct, type ProductAction, type ProductEditState, type ProductFilter, type ProductMediaUpload } from '@/lib/admin-products'

export default function AdminProductWorkspace({ products, runAction, onStateChange, uploadMedia }: {
  products: AdminEditableProduct[]
  runAction: ProductAction
  onStateChange?: (state: ProductEditState) => void
  uploadMedia?: ProductMediaUpload
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProductFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createdName, setCreatedName] = useState('')
  const [editState, setEditState] = useState<ProductEditState>({ dirty: false, busy: false })
  const filtered = useMemo(() => filterProducts(products, query, filter), [products, query, filter])
  const selected = products.find((product) => product.id === selectedId) ?? products[0]
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products])

  const reportState = useCallback((state: ProductEditState) => {
    setEditState(state)
    onStateChange?.(state)
  }, [onStateChange])

  useEffect(() => {
    if (!createdName) return
    const created = products.find((product) => product.name === createdName)
    if (created) { setSelectedId(created.id); setCreatedName('') }
  }, [createdName, products])

  useEffect(() => {
    if (!products.length && !creating) reportState({ dirty: false, busy: false })
  }, [products.length, creating, reportState])

  function canLeave() {
    if (editState.busy) return false
    return !editState.dirty || window.confirm('目前商品有未儲存的變更。確定放棄變更並離開？')
  }

  function selectProduct(id: string) {
    if ((!creating && selected?.id === id) || !canLeave()) return
    reportState({ dirty: false, busy: false })
    setCreating(false)
    setSelectedId(id)
  }

  function startCreate() {
    if (creating || !canLeave()) return
    reportState({ dirty: false, busy: false })
    setCreating(true)
  }

  return <section className="product-workspace" aria-label="商城商品工作區">
    <header className="product-workspace-header"><div><h2>商品管理</h2><span>共 {products.length} 件商品</span></div><button type="button" className="product-button-secondary" disabled={editState.busy || creating} onClick={startCreate}><Plus className="h-4 w-4" />新增商品</button></header>
    <div className="product-workspace-body">
      <aside className="product-catalog" aria-label="商品清單">
        <div className="product-catalog-tools"><label className="product-search"><Search className="h-4 w-4" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋商品" aria-label="搜尋商品" />{query ? <button type="button" aria-label="清除商品搜尋" onClick={() => setQuery('')}><X className="h-4 w-4" /></button> : null}</label><div className="product-catalog-filter"><select aria-label="篩選商品狀態" value={filter} onChange={(event) => setFilter(event.target.value as ProductFilter)}><option value="all">全部商品</option><option value="active">已上架</option><option value="inactive">已下架</option><option value="lowStock">低庫存（5 件以下）</option></select><span>{filtered.length} 件</span></div></div>
        <div className="product-catalog-list">
          {creating ? <div className="product-catalog-new"><Plus className="h-4 w-4" />正在新增商品</div> : null}
          {filtered.map((product) => <button type="button" key={product.id} className="product-catalog-item" data-selected={!creating && selected?.id === product.id} aria-current={!creating && selected?.id === product.id ? 'true' : undefined} disabled={editState.busy} onClick={() => selectProduct(product.id)}><span className="product-catalog-item-top"><strong>{product.name}</strong><span className={product.stockQuantity <= 5 ? 'is-low-stock' : ''}>庫存 {product.stockQuantity}</span></span><span className="product-catalog-item-bottom"><span>{product.price > 0 ? `NT$ ${(product.price / 100).toLocaleString('zh-TW')}` : '洽詢售價'}</span><span className={product.active ? 'is-active' : ''}>{product.active ? '上架中' : '已下架'}</span></span></button>)}
          {!filtered.length ? <div className="product-catalog-empty"><Package className="h-6 w-6" /><p>{products.length ? '找不到符合條件的商品' : '目前還沒有商品'}</p>{products.length ? <button type="button" className="product-text-action" onClick={() => { setQuery(''); setFilter('all') }}>清除篩選</button> : <button type="button" className="product-text-action" onClick={startCreate}>建立第一件商品</button>}</div> : null}
        </div>
      </aside>

      <div className="product-workspace-editor">
        {creating ? <AdminProductCreator key="new-product" categories={categories} runAction={runAction} onStateChange={reportState} uploadMedia={uploadMedia} onCancel={() => { if (canLeave()) { setCreating(false); reportState({ dirty: false, busy: false }) } }} onSaved={(name) => { setCreatedName(name); setCreating(false); setQuery(''); setFilter('all'); reportState({ dirty: false, busy: false }) }} />
          : selected ? <AdminProductEditor key={selected.id} product={selected} categories={categories} runAction={runAction} onStateChange={reportState} uploadMedia={uploadMedia} />
            : <div className="product-editor-empty"><Package className="h-9 w-9" /><h3>從第一件商品開始</h3><p>填寫簡介、設定尺碼，再上傳主圖即可建立。</p><button type="button" className="product-button-primary" onClick={startCreate}><Plus className="h-4 w-4" />新增商品</button></div>}
      </div>
    </div>
  </section>
}
