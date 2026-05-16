'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

export interface CartContextType {
  items: CartItem[]
  total: number
  itemCount: number
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clear: () => void
  isEmpty: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const existingItem = prev.find(i => i.id === item.id)
      if (existingItem) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }, [removeItem])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  const value: CartContextType = {
    items,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    isEmpty: items.length === 0,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

/**
 * 购物车工具函数
 */
export function calculateShipping(total: number, freeShippingThreshold: number = 299): number {
  if (total >= freeShippingThreshold) {
    return 0
  }
  return 10
}

export function calculateTax(total: number, taxRate: number = 0): number {
  return Math.round(total * taxRate * 100) / 100
}

export function calculateDiscount(total: number, couponCode: string): number {
  // 模拟优惠券
  const coupons: Record<string, number> = {
    'WELCOME10': 0.1,  // 10% 折扣
    'SUMMER20': 0.2,   // 20% 折扣
    'FIRST50': 50,     // 固定 50 元
  }

  const discount = coupons[couponCode]
  if (!discount) return 0

  if (discount < 1) {
    return Math.round(total * discount * 100) / 100
  }
  return discount
}

export function calculateTotal(subtotal: number, options = {}) {
  const {
    shippingThreshold = 299,
    taxRate = 0,
    couponCode = '',
  } = options as Record<string, any>

  const shipping = calculateShipping(subtotal, shippingThreshold)
  const tax = calculateTax(subtotal + shipping, taxRate)
  const discount = calculateDiscount(subtotal, couponCode)

  return {
    subtotal,
    shipping,
    tax,
    discount,
    total: subtotal + shipping + tax - discount,
  }
}
