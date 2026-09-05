import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import test from 'node:test'

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context)
  return nextResolve(specifier, context)
} })

const { parseSpecificationOptions, getSpecificationGroups, readSelectedSpecifications, specificationSelectionError, formatSelectedSpecifications, productCartItemId } = await import('../lib/product-specifications.ts')
const catalog = { specifications: [{ label: '顏色', value: '黑色、白色' }, { label: '包裝', value: '單件\n套裝' }], sizes: ['S', 'M'], variants: [] }
const chosen = [{ label: '顏色', value: '黑色' }, { label: '包裝', value: '套裝' }]

test('規格分隔符號與尺碼一致，保留斜線並去除空白及重複值', () => {
  assert.deepEqual(parseSpecificationOptions(' 黑色,白色，黑色、S/M\nL/XL\r\n42 g / 包 '), ['黑色', '白色', 'S/M', 'L/XL', '42 g / 包'])
})

test('同名規格合併選項，完全重複的舊尺碼與款式不再顯示第二組選擇', () => {
  const groups = getSpecificationGroups({ ...catalog, specifications: [...catalog.specifications, { label: ' 顏色 ', value: '白色、灰色' }, { label: '尺寸', value: 'M、S' }, { label: '材質', value: '純棉' }] })
  assert.deepEqual(groups, [{ label: '顏色', options: ['黑色', '白色', '灰色'] }, { label: '包裝', options: ['單件', '套裝'] }, { label: '材質', options: ['純棉'] }])
  assert.deepEqual(getSpecificationGroups({ specifications: [{ label: '款式', value: '黑色、白色' }], variants: [{ id: 'b', name: '黑色', image: '', detailImages: [] }, { id: 'w', name: '白色', image: '', detailImages: [] }] }), [])
})

test('每組必須選一個有效選項，舊購物車缺少選項須重新選擇', () => {
  assert.equal(specificationSelectionError(catalog, chosen), '')
  for (const selection of [undefined, [], chosen.slice(0, 1), [...chosen, { label: '額外', value: '其他' }], [{ label: '顏色', value: '紅色' }, chosen[1]]]) {
    assert.match(specificationSelectionError(catalog, selection), /重新選擇/)
  }
  assert.equal(specificationSelectionError({ specifications: [] }, undefined), '')
})

test('拒絕格式異常、重複名稱及超長資料，允許安全的特殊字串名稱', () => {
  for (const value of [null, {}, ['黑色'], [{ label: '顏色', value: 3 }], [...chosen, chosen[0]], [{ label: '字'.repeat(81), value: '黑色' }], Array.from({ length: 31 }, (_, index) => ({ label: String(index), value: '黑色' }))]) {
    assert.equal(readSelectedSpecifications(value), null)
  }
  assert.deepEqual(readSelectedSpecifications([{ label: '__proto__', value: ' 正常 ' }]), [{ label: '__proto__', value: '正常' }])
})

test('規格順序不同仍合併同一購物車項目，顏色、包裝、尺碼不同則分開', () => {
  const key = productCartItemId('shirt', 'classic', 'M', chosen)
  assert.equal(productCartItemId('shirt', 'classic', 'M', [...chosen].reverse()), key)
  assert.notEqual(productCartItemId('shirt', 'classic', 'M', [{ label: '顏色', value: '白色' }, chosen[1]]), key)
  assert.notEqual(productCartItemId('shirt', 'classic', 'L', chosen), key)
  assert.notEqual(productCartItemId('shirt', 'classic:M', '', chosen), key)
  assert.equal(productCartItemId('shirt', undefined, 'M', []), 'shirt:M')
  assert.equal(formatSelectedSpecifications(chosen), '顏色：黑色 · 包裝：套裝')
})

test('購物車彈層脫離頁面隔離層，避免關閉按鈕被固定導航遮擋', () => {
  const drawer = readFileSync(new URL('../components/ShopCartDrawer.tsx', import.meta.url), 'utf8')
  assert.match(drawer, /createPortal/)
  assert.match(drawer, /document.body/)
  assert.match(drawer, /fixed inset-0 z-\[60\]/)
})
