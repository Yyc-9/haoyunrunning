import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('商店桌面商品圖片與資訊區有各自的穩定排版', () => {
  const page = readFileSync(new URL('../app/shop/page.tsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../app/shop/shop-catalog.css', import.meta.url), 'utf8')

  assert.match(page, /import '\.\/shop-catalog\.css'/)
  assert.match(page, /shop-product-image kinetic-image relative aspect-square/)
  assert.match(page, /className="shop-product-info pt-3"/)
  assert.match(css, /@media \(min-width: 1024px\)/)
  assert.match(css, /aspect-ratio: 4 \/ 5/)
  assert.match(css, /object-fit: cover;[\s\S]*?padding: 0;/)
  assert.match(css, /\.shop-page \.shop-product-info\s*\{[^}]*padding: 20px;/)
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.match(css, /\.shop-page\.kinetic-page\s*\{\s*isolation: auto;/)
  // The mobile image mode remains its existing contain + padding treatment.
  assert.match(page, /className="object-contain p-3/)
})

test('商店搜尋、分類與排序保留可辨識的操作名稱與狀態', () => {
  const page = readFileSync(new URL('../app/shop/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /className="sr-only">搜尋商品/)
  assert.match(page, /role="group" aria-label="商品分類"/)
  assert.match(page, /aria-pressed=\{!category\}/)
  assert.match(page, /aria-pressed=\{category === item\}/)
  assert.match(page, /aria-label="商品排序"/)
  assert.match(page, /<ShopCartDrawer products=\{products\}/)
})
