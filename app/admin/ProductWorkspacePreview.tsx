'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Boxes, CalendarRange, CreditCard, FileSpreadsheet, PanelsTopLeft, UserCog, Users } from 'lucide-react'
import AdminProductWorkspace from '@/components/admin/AdminProductWorkspace'
import { parseProductSizes, type AdminEditableProduct, type ProductAction } from '@/lib/admin-products'

// Development-only, in-memory preview. It never calls the admin or upload API.
const previewProducts: AdminEditableProduct[] = [
  ['vest', '好運競速跑步背心', '跑者服飾', 1280, 24],
  ['shirt', '好運跑步 T 恤', '跑者服飾', 980, 15],
  ['towel', '好運運動毛巾', '跑者配件', 350, 56],
  ['cap', '好運跑帽', '跑者配件', 780, 3],
  ['socks', '好運跑襪（中筒）', '跑者配件', 220, 40],
  ['belt', '好運腰包', '跑者配件', 680, 12],
].map(([id, name, category, price, stock], index) => ({
  id: String(id), name: String(name), category: String(category), price: Number(price) * 100,
  priceLabel: `NT$ ${price}`, stockQuantity: Number(stock), active: index !== 5,
  image: '/goodluck-logo-nav.jpg', video: index === 0 ? '/preview-only/product.mp4' : '',
  summary: index === 0 ? '輕量、透氣，適合團練與賽事。' : '陪伴日常訓練的好運裝備。',
  description: index === 0 ? '為日常團練與賽事打造的輕量背心。透氣快乾，讓每一次訓練都更自在。\n\n材質、尺寸與保養說明可在此統一編輯。' : '好運跑班系列裝備，商品詳細說明可在這裡編輯。',
  sizes: index < 2 ? ['S', 'M', 'L'] : [],
  gallery: index === 0 ? ['/preview-only/detail-1.webp', '/preview-only/detail-2.webp', '/preview-only/detail-3.webp'] : [],
  tags: ['跑班裝備'], highlights: [], specifications: [], usageNotes: [], variants: [],
}))

const navigation = [
  { label: '總覽', icon: BarChart3 }, { label: '學員管理', icon: Users },
  { label: '教練管理', icon: UserCog }, { label: '季度管理', icon: CalendarRange },
  { label: '商城商品', icon: Boxes }, { label: '內容中心', icon: PanelsTopLeft },
  { label: '銀行對帳', icon: FileSpreadsheet }, { label: '收款帳戶', icon: CreditCard },
]

export default function ProductWorkspacePreview() {
  const [products, setProducts] = useState(previewProducts)
  const [notice, setNotice] = useState('')
  const mediaUrls = useRef<string[]>([])
  useEffect(() => () => { mediaUrls.current.forEach((url) => URL.revokeObjectURL(url)) }, [])

  const runAction: ProductAction = async (_id, action) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    if (action.action === 'delete_product') {
      setProducts((current) => current.filter((product) => product.id !== action.productId))
      return true
    }
    if (action.action !== 'create_product' && action.action !== 'update_product') return false
    const product: AdminEditableProduct = {
      id: String(action.productId || `preview-${crypto.randomUUID()}`),
      name: String(action.name), category: String(action.category),
      price: Number(action.price), priceLabel: `NT$ ${Number(action.price) / 100}`,
      stockQuantity: Number(action.stockQuantity), active: action.active === true,
      image: String(action.image), video: String(action.video || ''),
      summary: String(action.summary || ''), description: String(action.description || ''),
      sizes: parseProductSizes(String(action.sizes || '')), tags: parseProductSizes(String(action.tags || '')),
      gallery: (action.gallery || []) as string[], variants: (action.variants || []) as AdminEditableProduct['variants'],
      externalUrl: String(action.externalUrl || ''), highlights: [], specifications: [], usageNotes: [],
    }
    setProducts((current) => action.action === 'create_product' ? [product, ...current] : current.map((item) => item.id === product.id ? product : item))
    return true
  }

  return <main className="admin-shell admin-products-mode min-h-screen bg-white pt-24">
    <section className="px-4 py-10 sm:px-6 lg:px-8"><div className="admin-dashboard-grid container mx-auto max-w-[1600px]">
      <div className="admin-dashboard-header mb-4"><div className="admin-dashboard-heading"><h1 className="font-bold">管理員後台</h1></div><span className="text-xs text-[#7b5d23]">本地互動預覽 · 示例資料，不會修改正式商店</span></div>
      <nav aria-label="管理員後台導航" className="admin-dashboard-sidebar mb-8 overflow-x-auto lg:sticky lg:top-24 lg:mb-0 lg:overflow-visible"><div className="admin-sidebar-panel rounded-xl p-2"><div className="admin-sidebar-identity hidden lg:block"><p className="text-xs text-white/70">本地預覽</p><p className="mt-3 text-lg font-black text-white">營運工作台</p><p className="mt-1 text-xs text-white/65">好運跑班</p></div><div className="admin-sidebar-tabs flex gap-1 lg:flex-col">{navigation.map(({ label, icon: Icon }) => <button key={label} type="button" data-active={label === '商城商品'} aria-current={label === '商城商品' ? 'page' : undefined} className="admin-sidebar-tab flex items-center gap-2 whitespace-nowrap rounded-xl p-3 text-sm font-bold" onClick={() => setNotice(label === '商城商品' ? '' : '這次預覽僅開放商城商品，其餘工作區維持原網站功能。')}><span className="admin-sidebar-icon"><Icon className="h-4 w-4" /></span>{label}</button>)}</div><div className="admin-sidebar-footer hidden lg:block"><p className="text-xs text-white/65">超級管理員</p></div></div></nav>
      <div className="admin-dashboard-workspace">{notice ? <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p> : null}<AdminProductWorkspace products={products} runAction={runAction} uploadMedia={async (file) => { const url = URL.createObjectURL(file); mediaUrls.current.push(url); return url }} /></div>
    </div></section>
  </main>
}
