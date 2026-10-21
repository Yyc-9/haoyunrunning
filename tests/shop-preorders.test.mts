import assert from 'node:assert/strict'
import test from 'node:test'
import { availableProductQuantity, sharesProductStock, sizeStockError, shopProductFromRow, type ShopProductRow } from '../lib/shop-products.ts'

test('zero-stock preorders remain purchasable across cart variants; physical stock stays limited', () => {
  assert.equal(availableProductQuantity({ stockQuantity: 0, isPreorder: true }, 20), Infinity)
  assert.equal(availableProductQuantity({ stockQuantity: 0 }), 0)
  assert.equal(availableProductQuantity({ stockQuantity: 5 }, 3), 2)
  assert.equal(availableProductQuantity({ stockQuantity: 5 }, 8), 0)
  assert.equal(availableProductQuantity({ stockQuantity: 0, isPreorder: false }), 0)
})

test('size stock limits only matching sizes across styles and keeps preorders available', () => {
  const product = { id: 'shirt', stockQuantity: 8, stockBySize: { XS: 0, M: 3, '3XL': 5 } }
  assert.equal(availableProductQuantity(product, 0, 'XS'), 0)
  assert.equal(availableProductQuantity(product, 2, 'M'), 1)
  assert.equal(availableProductQuantity(product, 0, '3XL'), 5)
  assert.equal(availableProductQuantity(product, 0, 'S'), 0)
  assert.equal(availableProductQuantity({ ...product, isPreorder: true }, 20, 'XS'), Infinity)
  assert.equal(sharesProductStock(product, { productId: 'shirt', size: 'M' }, 'M'), true)
  assert.equal(sharesProductStock(product, { productId: 'shirt', size: '3XL' }, 'M'), false)
  assert.equal(sharesProductStock({ id: 'shirt' }, { productId: 'shirt', size: '3XL' }, 'M'), true)
  assert.equal(sharesProductStock(product, { productId: 'other', size: 'M' }, 'M'), false)
})

test('size inventory validation rejects malformed, mismatched and invalid counts', () => {
  assert.equal(sizeStockError(null, []), '')
  assert.equal(sizeStockError({ M: 0, '3XL': 8 }, ['M', '3XL']), '')
  for (const value of [{}, [], 'bad', { M: 1 }, { M: -1, '3XL': 0 }, { M: 0.5, '3XL': 0 }, { M: '1', '3XL': 0 }, { M: 1_000_000, '3XL': 1 }]) {
    assert.notEqual(sizeStockError(value, ['M', '3XL']), '')
  }
  const mapped = shopProductFromRow({ id: 'shirt', name: 'Shirt', stock_quantity: 8, stock_by_size: { M: 8 } } as ShopProductRow)
  assert.deepEqual(mapped.stockBySize, { M: 8 })
})

test('database preorder status survives product mapping and older rows default to normal stock', () => {
  const row = { id: 'test', name: 'Test', stock_quantity: 0, is_preorder: true } as ShopProductRow
  assert.equal(shopProductFromRow(row).isPreorder, true)
  assert.equal(shopProductFromRow({ ...row, is_preorder: undefined }).isPreorder, false)
})
