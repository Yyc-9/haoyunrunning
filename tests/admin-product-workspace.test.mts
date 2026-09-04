import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import test from 'node:test'

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context)
  return nextResolve(specifier, context)
} })

const { productDraft, productDraftError, productActionPayload, parseProductSizes, filterProducts } = await import('../lib/admin-products.ts')

const product = {
  id: 'shirt', name: '訓練上衣', category: '跑者服飾', price: 128000, priceLabel: 'NT$ 1,280',
  image: '/shirt.webp', tags: ['團練'], summary: '透氣上衣', description: '商品簡介',
  gallery: ['/detail.webp'], highlights: ['快乾'], specifications: [{ label: '材質', value: '聚酯纖維' }],
  usageNotes: ['低溫清洗'], sizes: ['S', 'M'], variants: [{ id: 'black', name: '黑色', image: '/black.webp', detailImages: ['/black-detail.webp'] }],
  stockQuantity: 24, active: true,
}

test('商品草稿保留舊內容，並複製尺碼和媒體清單避免直接修改資料', () => {
  const draft = productDraft(product)
  assert.equal(draft.price, '1280')
  assert.match(draft.description, /快乾/)
  assert.match(draft.description, /材質：聚酯纖維/)
  assert.match(draft.description, /低溫清洗/)
  draft.sizes.push('L')
  draft.gallery.push('/new.webp')
  draft.variants[0].detailImages.push('/new-detail.webp')
  assert.equal(product.sizes.length, 2)
  assert.equal(product.gallery.length, 1)
  assert.equal(product.variants[0].detailImages.length, 1)
})

test('更新商品沿用 API 合約與分幣單位，不再送出重複的介紹欄位', () => {
  const payload = productActionPayload(productDraft(product), product.id)
  assert.equal(payload.action, 'update_product')
  assert.equal(payload.productId, 'shirt')
  assert.equal(payload.price, 128000)
  assert.equal(payload.sizes, 'S、M')
  assert.equal(payload.highlights, '')
  assert.deepEqual(payload.specifications, [])
  assert.equal(payload.usageNotes, '')
  assert.match(payload.description, /低溫清洗/)
  assert.equal(productActionPayload(productDraft(product)).action, 'create_product')
})

test('尺碼支援自訂、常見分隔符號與去重', () => {
  assert.deepEqual(parseProductSizes('S、M，L, XL\n均碼、S'), ['S', 'M', 'L', 'XL', '均碼'])
})

test('儲存前阻止缺漏資料、無效數值與過長簡介', () => {
  const draft = productDraft(product)
  assert.equal(productDraftError(draft), '')
  assert.match(productDraftError({ ...draft, image: '' }), /主圖/)
  assert.match(productDraftError({ ...draft, price: '-2' }), /售價/)
  assert.match(productDraftError({ ...draft, stockQuantity: '1.5' }), /整數/)
  assert.match(productDraftError({ ...draft, description: '字'.repeat(5001) }), /截斷/)
  assert.match(productDraftError({ ...draft, variants: [{ ...draft.variants[0], image: '' }] }), /款式主圖/)
  assert.equal(productDraftError({ ...draft, price: '' }), '')
})

test('搜尋與上架庫存篩選不會修改原商品清單', () => {
  const products = [product, { ...product, id: 'cap', name: '跑帽', active: false, stockQuantity: 2 }]
  assert.equal(filterProducts(products, '透氣', 'all').length, 2)
  assert.equal(filterProducts(products, 'SHIRT', 'all')[0].id, 'shirt')
  assert.equal(filterProducts(products, '', 'inactive')[0].id, 'cap')
  assert.equal(filterProducts(products, '', 'lowStock')[0].id, 'cap')
  assert.equal(filterProducts(products, '沒有的商品', 'all').length, 0)
  assert.equal(products.length, 2)
})

test('商品工作區有未儲存與重複送出保護，新增與編輯共用表單', () => {
  const form = readFileSync(new URL('../components/admin/AdminProductForm.tsx', import.meta.url), 'utf8')
  const workspace = readFileSync(new URL('../components/admin/AdminProductWorkspace.tsx', import.meta.url), 'utf8')
  assert.match(form, /beforeunload/)
  assert.match(form, /if \(busy\) return/)
  assert.match(workspace, /window.confirm/)
  assert.match(workspace, /AdminProductCreator/)
  assert.match(workspace, /AdminProductEditor/)
})

test('商品清單與表單的高度受限且支援鍵盤捲動，避免媒體區被裁掉', () => {
  const css = readFileSync(new URL('../components/admin/product-workspace.css', import.meta.url), 'utf8')
  const form = readFileSync(new URL('../components/admin/AdminProductForm.tsx', import.meta.url), 'utf8')
  const workspace = readFileSync(new URL('../components/admin/AdminProductWorkspace.tsx', import.meta.url), 'utf8')
  for (const selector of ['product-catalog', 'product-catalog-list', 'product-workspace-editor', 'product-editor', 'product-editor-scroll']) {
    const rule = css.match(new RegExp(`\\.${selector} \\{([^}]+)\\}`))?.[1] ?? ''
    assert.match(rule, /min-height: 0/, `${selector} 必須允許縮至容器高度`)
  }
  assert.match(css, /\.product-workspace-body \{[^}]+grid-template-rows: minmax\(0, 1fr\)/)
  assert.doesNotMatch(css, /min-height: 540px|overscroll-behavior: contain/)
  assert.match(form, /className="product-editor-scroll" role="region" aria-label="商品編輯內容" tabIndex=\{0\}/)
  assert.match(workspace, /className="product-catalog-list" role="region" aria-label="可捲動商品清單" tabIndex=\{0\}/)
})
