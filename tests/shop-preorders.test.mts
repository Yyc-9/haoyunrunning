import assert from 'node:assert/strict'
import test from 'node:test'
import { availableProductQuantity, shopProductFromRow, type ShopProductRow } from '../lib/shop-products.ts'

test('zero-stock preorders remain purchasable across cart variants; physical stock stays limited', () => {
  assert.equal(availableProductQuantity({ stockQuantity: 0, isPreorder: true }, 20), Infinity)
  assert.equal(availableProductQuantity({ stockQuantity: 0 }), 0)
  assert.equal(availableProductQuantity({ stockQuantity: 5 }, 3), 2)
  assert.equal(availableProductQuantity({ stockQuantity: 5 }, 8), 0)
  assert.equal(availableProductQuantity({ stockQuantity: 0, isPreorder: false }), 0)
})

test('database preorder status survives product mapping and older rows default to normal stock', () => {
  const row = { id: 'test', name: 'Test', stock_quantity: 0, is_preorder: true } as ShopProductRow
  assert.equal(shopProductFromRow(row).isPreorder, true)
  assert.equal(shopProductFromRow({ ...row, is_preorder: undefined }).isPreorder, false)
})
