'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

export interface CartItem {
  id: string
  productId: string
  variantId?: string
  size?: string
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

function cleanLegacyCartName(name: string, size?: string) {
  if (!size) return name
  const escapedSize = size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return name
    .replace(new RegExp(`\\s*\\/\\s*尺寸\\s+${escapedSize}$`), '')
    .replace(new RegExp(`\\s*-\\s*尺寸\\s+${escapedSize}$`), '')
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const savedCart = window.localStorage.getItem('goodluck-cart')
    if (!savedCart) return

    try {
      const parsed = JSON.parse(savedCart) as CartItem[]
      if (Array.isArray(parsed)) {
        setItems(
          parsed
            .filter((item) => item.id && item.name && item.quantity > 0 && Number(item.price) > 0)
            .map((item) => ({
              ...item,
              productId: item.productId || item.id.split('-')[0] || item.id,
              name: cleanLegacyCartName(item.name, item.size),
            }))
        )
      }
    } catch {
      window.localStorage.removeItem('goodluck-cart')
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('goodluck-cart', JSON.stringify(items))
  }, [items])

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
    window.localStorage.removeItem('goodluck-cart')
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
  if (!couponCode.trim()) return 0
  return 0
}

type CalculateTotalOptions = {
  shippingThreshold?: number
  taxRate?: number
  couponCode?: string
}

export function calculateTotal(subtotal: number, options: CalculateTotalOptions = {}) {
  const {
    shippingThreshold = 299,
    taxRate = 0,
    couponCode = '',
  } = options

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
