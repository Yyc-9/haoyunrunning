'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, Film, Loader2, Minus, Package, Plus, ShoppingBag } from 'lucide-react'
import { useCart } from '@/app/cart-provider'
import { useSiteContent } from '@/app/site-content-provider'
import { useToast } from '@/app/toast-provider'
import ShopCartDrawer from '@/components/ShopCartDrawer'
import { getProductIntro, type ProductSpecification, type ProductVariant, type ShopProduct } from '@/lib/shop-products'
import { getSpecificationGroups, productCartItemId, specificationSelectionError } from '@/lib/product-specifications'

type ProductDetailClientProps = {
  productId: string
}

type ProductMedia = {
  type: 'image' | 'video'
  url: string
  label: string
}

function formatPrice(product: ShopProduct) {
  return product.price > 0 ? `NT$${Math.round(product.price / 100).toLocaleString('zh-TW')}` : '洽詢售價'
}

export default function ProductDetailClient({ productId }: ProductDetailClientProps) {
  const router = useRouter()
  const { addItem, items } = useCart()
  const { brand } = useSiteContent()
  const { showToast } = useToast()
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedSpecifications, setSelectedSpecifications] = useState<ProductSpecification[]>([])
  const [quantity, setQuantity] = useState(1)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    let isActive = true
    fetch('/api/shop/products', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { products?: ShopProduct[] }
        if (!response.ok) throw new Error('商品資料載入失敗。')
        if (!isActive || !payload.products) return
        setProducts(payload.products)
        setProduct(payload.products.find((item) => item.id === productId) ?? null)
      })
      .catch((error) => console.error('Load product detail failed:', error))
      .finally(() => { if (isActive) setIsLoading(false) })
    return () => { isActive = false }
  }, [productId])

  useEffect(() => {
    setSelectedVariantId(product?.variants?.[0]?.id ?? '')
    setSelectedSize(product?.sizes?.[0] ?? '')
    setSelectedSpecifications(product ? getSpecificationGroups(product).map(({ label, options }) => ({ label, value: options[0] })) : [])
    setQuantity(1)
    setActiveMediaIndex(0)
  }, [product])

  const selectedVariant = product?.variants?.find((variant) => variant.id === selectedVariantId) ?? product?.variants?.[0]
  const media = useMemo<ProductMedia[]>(() => {
    if (!product) return []
    const variantImages = selectedVariant
      ? [selectedVariant.image, ...(selectedVariant.detailImages.length ? selectedVariant.detailImages : product.gallery)]
      : [product.image, ...product.gallery]
    const images = variantImages
      .filter((url): url is string => Boolean(url))
      .filter((url, index, list) => list.indexOf(url) === index)
      .map((url, index) => ({ type: 'image' as const, url, label: `${product.name} 圖片 ${index + 1}` }))
    return product.video ? [...images, { type: 'video' as const, url: product.video, label: `${product.name} 商品影片` }] : images
  }, [product, selectedVariant])

  useEffect(() => {
    if (activeMediaIndex >= media.length) setActiveMediaIndex(0)
  }, [activeMediaIndex, media.length])

  if (isLoading) {
    return <main className="flex min-h-[60vh] items-center justify-center pt-20 sm:pt-24"><Loader2 className="h-7 w-7 animate-spin text-apple-gray-500" aria-label="載入商品" /></main>
  }

  if (!product) {
    return (
      <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 pt-20 text-center sm:pt-24">
        <Package className="h-12 w-12 text-apple-gray-300" />
        <h1 className="mt-4 text-2xl font-black text-apple-gray-950">找不到這件商品</h1>
        <Link href="/shop" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700 underline underline-offset-4"><ArrowLeft className="h-4 w-4" />返回好運商店</Link>
      </main>
    )
  }

  const cartQuantity = items.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0)
  const remainingStock = Math.max(0, product.stockQuantity - cartQuantity)
  const isSoldOut = remainingStock <= 0
  const isPurchasable = product.price > 0 && !isSoldOut
  const activeMedia = media[activeMediaIndex]
  const specificationGroups = getSpecificationGroups(product)

  function selectVariant(variant: ProductVariant) {
    setSelectedVariantId(variant.id)
    setActiveMediaIndex(0)
  }

  function addSelectedProduct(openCart: boolean) {
    if (!isPurchasable) return false
    const selectionError = specificationSelectionError(product!, selectedSpecifications)
    if (selectionError) {
      showToast(selectionError, 'error')
      return false
    }
    const safeQuantity = Math.min(quantity, remainingStock)
    if (safeQuantity < 1) {
      showToast(`${product!.name} 庫存不足`, 'error')
      return false
    }

    const optionName = selectedVariant?.name || ''
    const displayName = optionName ? `${product!.name} - ${optionName}` : product!.name
    const cartItem = {
      id: productCartItemId(product!.id, selectedVariant?.id, selectedSize, selectedSpecifications),
      productId: product!.id,
      variantId: selectedVariant?.id,
      size: selectedSize || undefined,
      selectedSpecifications,
      name: displayName,
      price: product!.price,
      image: selectedVariant?.image || product!.image,
    }
    for (let index = 0; index < safeQuantity; index += 1) addItem(cartItem)
    showToast(`${product!.name} 已加入購物車`, 'success')
    if (openCart) setIsCartOpen(true)
    return true
  }

  return (
    <main className="kinetic-page min-h-screen bg-white pt-20 sm:pt-24">
      <div className="container mx-auto px-4 py-5 sm:py-7">
        <nav aria-label="麵包屑" className="flex items-center gap-2 overflow-hidden text-xs font-semibold text-apple-gray-500">
          <Link href="/shop" className="shrink-0 hover:text-black">好運商店</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-apple-gray-800">{product.name}</span>
        </nav>

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12">
          <section aria-label="商品圖片">
            <div className="kinetic-media relative aspect-square overflow-hidden rounded-md border border-black/10 bg-apple-gray-50">
              {activeMedia?.type === 'video' ? (
                <video src={activeMedia.url} poster={product.image || undefined} controls muted playsInline preload="metadata" className="h-full w-full object-contain" />
              ) : activeMedia?.url ? (
                <Image src={activeMedia.url} alt={activeMedia.label} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-contain p-3 sm:p-5" />
              ) : (
                <div className="flex h-full items-center justify-center"><Package className="h-14 w-14 text-apple-gray-300" /></div>
              )}
            </div>
            {media.length > 1 ? (
              <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
                {media.map((item, index) => (
                  <button key={`${item.type}-${item.url}`} type="button" onClick={() => setActiveMediaIndex(index)} aria-label={`查看${item.label}`} className={`relative aspect-square overflow-hidden rounded-md border bg-apple-gray-50 transition ${activeMediaIndex === index ? 'border-black ring-1 ring-black' : 'border-black/10 hover:border-black/35'}`}>
                    {item.type === 'video' ? <span className="flex h-full items-center justify-center bg-black text-white"><Film className="h-5 w-5" /></span> : <Image src={item.url} alt="" fill sizes="90px" className="object-contain p-1" />}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <p className="text-sm font-bold text-apple-gray-500">{product.category}</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-apple-gray-950 sm:text-4xl">{product.name}</h1>
            {product.summary ? <p className="mt-4 text-base leading-7 text-apple-gray-600">{product.summary}</p> : null}
            <p className="mt-6 border-y border-black/10 py-5 text-3xl font-black text-apple-gray-950">{formatPrice(product)}</p>

            {product.variants?.length ? (
              <fieldset className="mt-6">
                <legend className="text-sm font-black text-apple-gray-900">款式</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button key={variant.id} type="button" aria-pressed={selectedVariant?.id === variant.id} onClick={() => selectVariant(variant)} className={`rounded-md border px-4 py-2.5 text-sm font-bold transition ${selectedVariant?.id === variant.id ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-apple-gray-700 hover:border-black/40'}`}>{variant.name}</button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {product.sizes?.length ? (
              <fieldset className="mt-6">
                <legend className="text-sm font-black text-apple-gray-900">商品尺碼</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button key={size} type="button" aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)} className={`min-w-12 rounded-md border px-3 py-2.5 text-sm font-bold transition ${selectedSize === size ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-apple-gray-700 hover:border-black/40'}`}>{size}</button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {specificationGroups.length ? (
              <section className="mt-6" aria-labelledby="product-specifications-title">
                <h2 id="product-specifications-title" className="text-sm font-black text-apple-gray-900">商品規格</h2>
                <div className="mt-3 space-y-4">
                  {specificationGroups.map((group) => (
                    <fieldset key={group.label} className="min-w-0">
                      <legend className="break-words text-sm font-semibold text-apple-gray-600">{group.label}</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.options.map((option) => {
                          const selected = selectedSpecifications.some((item) => item.label === group.label && item.value === option)
                          return <button key={option} type="button" aria-pressed={selected} onClick={() => setSelectedSpecifications((current) => [...current.filter((item) => item.label !== group.label), { label: group.label, value: option }])} className={`min-h-11 max-w-full break-words rounded-md border px-4 py-2.5 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${selected ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-apple-gray-700 hover:border-black/40'}`}>{option}</button>
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="mt-6 flex items-end justify-between gap-4 border-t border-black/10 pt-6">
              <div>
                <p className="text-sm font-black text-apple-gray-900">數量</p>
                <div className="mt-2 inline-grid grid-cols-[40px_48px_40px] overflow-hidden rounded-md border border-black/15">
                  <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-10 items-center justify-center hover:bg-apple-gray-100" aria-label="減少數量"><Minus className="h-4 w-4" /></button>
                  <span className="flex h-10 items-center justify-center border-x border-black/10 text-sm font-black">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((value) => Math.min(Math.max(1, remainingStock), value + 1))} disabled={isSoldOut} className="flex h-10 items-center justify-center hover:bg-apple-gray-100 disabled:opacity-40" aria-label="增加數量"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <p className={`text-sm font-bold ${isSoldOut ? 'text-red-600' : 'text-apple-gray-500'}`}>{isSoldOut ? '目前售完' : `尚有 ${remainingStock} 件`}</p>
            </div>

            {isPurchasable ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => addSelectedProduct(true)} className="apple-button-outline w-full gap-2 rounded-md"><ShoppingBag className="h-4 w-4" />加入購物車</button>
                <button type="button" onClick={() => { if (addSelectedProduct(false)) router.push('/checkout') }} className="apple-button-primary w-full rounded-md">直接購買</button>
              </div>
            ) : isSoldOut ? (
              <button type="button" disabled className="mt-6 w-full rounded-md bg-apple-gray-200 px-5 py-3 font-black text-apple-gray-500">目前售完</button>
            ) : (
              <a href={brand.instagramUrl} target="_blank" rel="noreferrer" className="apple-button-primary mt-6 w-full rounded-md">聯絡購買</a>
            )}
          </section>
        </div>

        <section className="mt-12 grid gap-6 border-y border-black/10 py-9 md:grid-cols-[220px_minmax(0,1fr)] lg:mt-16">
          <h2 className="text-xl font-black text-apple-gray-950">商品簡介</h2>
          <p className="whitespace-pre-line text-base leading-8 text-apple-gray-700">{getProductIntro(product, { includeSpecifications: false })}</p>
        </section>
      </div>

      <ShopCartDrawer products={products} open={isCartOpen} onOpenChange={setIsCartOpen} />
    </main>
  )
}
