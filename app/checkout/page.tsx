'use client'

import ShopPaymentInfo from '@/components/ShopPaymentInfo'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  ChevronDown,
  Landmark,
  LockKeyhole,
  Send,
  Store,
} from 'lucide-react'
import { useCart } from '@/app/cart-provider'
import { useLanguage } from '@/app/language-context'
import { toEnglishWebsiteText } from '@/lib/english-website'
import { useSiteContent } from '@/app/site-content-provider'
import { supabase } from '@/lib/supabase'
import { formatSelectedSpecifications, specificationSelectionError } from '@/lib/product-specifications'
import MobileContextHeader from '@/components/MobileContextHeader'
import type { ShopProduct } from '@/lib/shop-products'
import { shopInvoiceError, shopInvoiceMethods } from '@/lib/shop-invoice'

const emptyForm = { customerName: '', contact: '', email: '', invoiceDelivery: 'email', invoiceDetail: '', taxInvoiceInfo: '' }

type CreatedOrder = {
  id: string
  orderNumber: string
  itemCount: number
  status: string
  subtotal?: number
  totalAmount?: number
  accessToken: string
}

export default function CheckoutPage() {
  const { language } = useLanguage()
  const english = language === 'en'
  const { items, itemCount, total, clear, removeItem, isReady } = useCart()
  const { brand } = useSiteContent()
  const [form, setForm] = useState(emptyForm)
  const [editingDetails, setEditingDetails] = useState(true)
  const [prefilled, setPrefilled] = useState(false)
  const dirtyFields = useRef(new Set<string>())
  const loadedIdentity = useRef<string | null>(null)
  const [customerNote, setCustomerNote] = useState('')
  const [transferLastFive, setTransferLastFive] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [catalog, setCatalog] = useState<ShopProduct[] | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const [pickupOptions, setPickupOptions] = useState<Array<{ id: string; name: string }>>([])
  const [pickupCourseId, setPickupCourseId] = useState('')
  const [pickupError, setPickupError] = useState('')
  const [pickupLoading, setPickupLoading] = useState(true)

  useEffect(() => {
    let alive = true
    let generation = 0
    async function loadPickup() {
      const requestId = ++generation
      try {
        const session = supabase ? (await supabase.auth.getSession()).data.session : null
        const identity = session?.user.id ?? 'guest'
        if (!alive || requestId !== generation || loadedIdentity.current === identity) return
        if (loadedIdentity.current !== null) {
          setForm(emptyForm); dirtyFields.current.clear(); setPrefilled(false); setEditingDetails(true)
          setTransferLastFive(''); setCustomerNote('')
        }
        setPickupLoading(true); setPickupError(''); setPickupCourseId(''); setPickupOptions([])
        const response = await fetch('/api/shop/pickup-options', {
          cache: 'no-store',
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '取貨班級讀取失敗。')
        if (alive && requestId === generation) {
          loadedIdentity.current = identity
          setPickupOptions(payload.options ?? [])
          if (payload.defaults) {
            const defaults = payload.defaults as typeof emptyForm
            setForm(current => Object.fromEntries(Object.keys(emptyForm).map(key => [key, dirtyFields.current.has(key) ? current[key as keyof typeof emptyForm] : defaults[key as keyof typeof emptyForm] || emptyForm[key as keyof typeof emptyForm]])) as typeof emptyForm)
            setPrefilled(true)
            if (!dirtyFields.current.size && defaults.customerName && defaults.contact && !shopInvoiceError(defaults)) setEditingDetails(false)
          }
        }
      } catch (error) {
        if (alive && requestId === generation) setPickupError(error instanceof Error ? error.message : '取貨班級讀取失敗。')
      } finally { if (alive && requestId === generation) setPickupLoading(false) }
    }
    void loadPickup()
    const subscription = supabase?.auth.onAuthStateChange(() => { setTimeout(() => { if (alive) void loadPickup() }, 0) })
    return () => { alive = false; subscription?.data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/shop/products', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !Array.isArray(payload.products)) throw new Error('商品資料暫時無法確認，請重新整理頁面後再結帳。')
        setCatalog(payload.products)
      })
      .catch((error) => { if (!controller.signal.aborted) setCatalogError(error instanceof Error ? error.message : '商品資料載入失敗。') })
    return () => controller.abort()
  }, [])

  const optionIssues = catalog ? items.filter((item) => {
    const product = catalog.find((product) => product.id === item.productId)
    return !product || specificationSelectionError(product, item.selectedSpecifications)
  }) : []

  const updateField = (field: keyof typeof form, value: string) => {
    dirtyFields.current.add(field)
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const submitOrder = async () => {
    setError('')
    setOrder(null)
    if (pickupLoading || pickupError || (pickupOptions.length > 1 && !pickupCourseId)) {
      setError(pickupError || (pickupLoading ? '正在確認取貨班級，請稍候。' : '請選擇取貨班級。'))
      return
    }

    if (items.length === 0) {
      setError('購物車沒有商品。')
      return
    }
    if (!catalog || catalogError || optionIssues.length) {
      setError(catalogError || (!catalog ? '正在確認商品規格，請稍候。' : '請先回商品頁重新選擇規格，再提交訂單。'))
      return
    }
    if (!form.customerName.trim() || !form.contact.trim()) {
      setEditingDetails(true)
      setError('請填寫姓名和聯絡方式。')
      return
    }
    const invoiceError = shopInvoiceError(form)
    if (invoiceError) { setEditingDetails(true); setError(invoiceError); return }
    if (!/^\d{5}$/.test(transferLastFive)) {
      setError('請完成匯款，並填寫轉出帳號後五碼。')
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data: { session },
      } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      const fulfillmentNote = [
        '取貨方式：跑班自取',
        customerNote.trim() ? `備註：${customerNote.trim()}` : '',
      ].filter(Boolean).join('\n')

      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ customerName: form.customerName, contact: form.contact, email: form.email, invoice: { invoiceDelivery: form.invoiceDelivery, invoiceDetail: form.invoiceDelivery === 'carrier' ? form.invoiceDetail.trim().toUpperCase() : form.invoiceDetail.trim(), taxInvoiceInfo: form.taxInvoiceInfo }, fulfillmentNote, transferLastFive, items, pickupCourseId }),
      })
      const payload = (await response.json().catch(() => ({}))) as { order?: CreatedOrder; error?: string }

      if (!response.ok || !payload.order?.orderNumber || !payload.order?.id || !payload.order?.accessToken) {
        throw new Error(payload.error || '訂單提交失敗。')
      }

      setOrder(payload.order)
      clear()
      setForm(emptyForm)
      setCustomerNote('')
      setTransferLastFive('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '訂單提交失敗。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isReady) return <div className="min-h-screen px-5 pt-32 text-center"><p role="status">正在讀取購物車</p></div>

  if (order || items.length === 0) return (
    <div className="mobile-focused-main min-h-screen bg-apple-gray-50 px-5 pb-16 pt-32">
      <MobileContextHeader backHref="/shop" backLabel="商店" title={order ? '訂單已送出' : '購物車'} />
      <section className="mx-auto mt-6 max-w-xl rounded-2xl border border-black/10 bg-white p-7 text-center sm:mt-0 sm:p-10" role="status">
        {order ? <CheckCircle2 aria-hidden="true" className="mx-auto h-10 w-10 text-emerald-600" /> : <Store aria-hidden="true" className="mx-auto h-10 w-10 text-apple-gray-400" />}
        <h1 className="mt-5 text-2xl font-black">{order ? '訂單已送出，等待入帳核對' : '購物車還沒有商品'}</h1>
        <p className="mt-3 text-sm leading-7 text-apple-gray-600">{order ? (english ? `Order number: ${order.orderNumber}. Keep this number. After finance verifies your payment, the team will contact you to arrange pickup.` : `訂單編號：${order.orderNumber}。請保留此編號；財務核對後，團隊會透過你填寫的聯絡方式確認自取安排。`) : '先到商店選擇商品，再回來確認品項與金額。尚未選購商品前，不需要填寫資料或匯款。'}</p>
        <Link href="/shop" className="apple-button-primary mt-6 w-full">{order ? '返回商店' : '前往商店'}</Link>
        <a href={brand.instagramUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-apple-blue">聯絡好運 Instagram</a>
      </section>
    </div>
  )

  return (
    <div className={`mobile-focused-main min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24${prefilled ? ' checkout-prefilled' : ''}`}>
      <MobileContextHeader backHref="/shop" backLabel="購物車" title="確認訂單" />
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">商店結帳</p>
            <h1 className="mb-4 text-4xl font-black text-apple-gray-900 md:text-5xl">確認訂單</h1>
            <p className="text-lg leading-8 text-apple-gray-600">
                  確認聯絡、發票與取貨資料，完成匯款後填寫後五碼，即可送出訂單。
            </p>
          </div>

          {catalogError || optionIssues.length ? <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            <p>{catalogError || '以下商品規格已更新或尚未選齊，請先重新選擇，再匯款結帳。'}</p>
            {optionIssues.map((item) => <Link key={item.id} href={`/shop/${encodeURIComponent(item.productId)}`} onClick={() => removeItem(item.id)} className="mt-1 block font-bold underline underline-offset-2">重新選擇 {item.name}</Link>)}
          </div> : null}

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <section className="checkout-contact-card apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <Store className="h-5 w-5 text-apple-gray-700" />
                <h2 className="text-xl font-bold text-apple-gray-900">聯絡與取貨資料</h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {pickupLoading && <p role="status" className="text-sm text-apple-gray-600 sm:col-span-2">正在帶入報名資料與取貨班級…</p>}
                <div className="rounded-xl border border-black/10 bg-apple-gray-50 p-4 sm:col-span-2">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{prefilled ? '已帶入你的報名資料' : '本次訂購資料'}</p><p className="mt-1 text-sm leading-6 text-apple-gray-600">{[form.customerName, form.contact].filter(Boolean).join(' · ') || '請填寫聯絡與發票資料'}</p></div><button type="button" className="min-h-11 shrink-0 px-2 text-sm font-bold text-apple-blue" onClick={() => setEditingDetails(value => !value)}>{editingDetails ? '收起資料' : '修改資料'}</button></div>
                  <p className="mt-2 break-all text-sm leading-6">發票：{shopInvoiceMethods[form.invoiceDelivery as keyof typeof shopInvoiceMethods]} {form.invoiceDetail || '尚未填寫'}</p>
                  {form.taxInvoiceInfo && <p className="mt-1 break-words text-sm leading-6">統編與抬頭：{form.taxInvoiceInfo}</p>}
                  <p className="mt-1 text-sm leading-6">取貨班級：{pickupOptions.length === 1 ? pickupOptions[0].name : pickupOptions.length > 1 ? pickupOptions.find(option => option.id === pickupCourseId)?.name || '請於下方選擇' : pickupLoading ? '確認中' : '由團隊聯絡確認'}</p>
                </div>
                {prefilled && shopInvoiceError(form) && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{shopInvoiceError(form)}</p>}
                {editingDetails && <>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">姓名 *</span>
                  <input required className="apple-input" value={form.customerName} onChange={(event) => updateField('customerName', event.target.value)} autoComplete="name" placeholder="收件人姓名" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">聯絡方式 *</span>
                  <input required className="apple-input" value={form.contact} onChange={(event) => updateField('contact', event.target.value)} autoComplete="tel" placeholder="手機號碼或 LINE ID" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">電子信箱</span>
                  <input type="email" className="apple-input" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" placeholder="用於接收訂單通知（選填）" />
                </label>

                <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">發票寄送方式 *</span><select className="apple-input" value={form.invoiceDelivery} onChange={event => { updateField('invoiceDelivery', event.target.value); updateField('invoiceDetail', event.target.value === 'email' ? form.email : '') }}>{Object.entries(shopInvoiceMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">{form.invoiceDelivery === 'carrier' ? '手機條碼載具' : '發票電子信箱'} *</span><input className="apple-input" type={form.invoiceDelivery === 'carrier' ? 'text' : 'email'} autoCapitalize={form.invoiceDelivery === 'carrier' ? 'characters' : 'none'} maxLength={form.invoiceDelivery === 'carrier' ? 8 : 320} value={form.invoiceDetail} onChange={event => updateField('invoiceDetail', form.invoiceDelivery === 'carrier' ? event.target.value.toUpperCase() : event.target.value)} placeholder={form.invoiceDelivery === 'carrier' ? '/ABC1234' : 'runner@example.com'} /></label>
                <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">統一編號與發票抬頭（選填）</span><input className="apple-input" maxLength={300} value={form.taxInvoiceInfo} onChange={event => updateField('taxInvoiceInfo', event.target.value)} placeholder="需要公司報帳時填寫" /></label>
                <p className="text-xs leading-5 text-apple-gray-500 sm:col-span-2">修改僅適用於本次訂單，不會變更原報名資料。</p>
                </>}

                {pickupOptions.length > 1 ? <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold">取貨班級 *</span>
                  <select className="apple-input" value={pickupCourseId} onChange={event => setPickupCourseId(event.target.value)}><option value="">請選擇取貨班級</option>{pickupOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                </label> : null}
                {pickupError ? <p role="alert" className="text-sm text-red-700 sm:col-span-2">{pickupError}</p> : null}
                <section aria-labelledby="shop-bank-transfer-title" className="rounded-2xl border border-amber-200 bg-[#f5f1eb] p-4 sm:col-span-2 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white"><Landmark className="h-5 w-5" /></span>
                    <div>
                      <h3 id="shop-bank-transfer-title" className="font-black text-apple-gray-950">好運銀行匯款帳戶</h3>
                      <p className="mt-1 text-sm leading-6 text-apple-gray-600">請依訂單小計完成匯款，並確認銀行機構、代碼與帳號後再轉帳。</p>
                    </div>
                  </div>
                  <details className="group mt-4 overflow-hidden rounded-xl border border-black/10 bg-white">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-apple-gray-900">
                      <span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4" />查看好運匯款帳戶</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="border-t border-black/10 p-2">
                      <ShopPaymentInfo />
                    </div>
                  </details>
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/75 px-3 py-2.5 text-xs font-semibold leading-5 text-apple-gray-600">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                    網站只記錄轉出帳號後五碼，不會要求網銀密碼或完整付款帳號；匯款備註請保持空白。
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-black text-apple-gray-800">轉出帳號後五碼 *</span>
                    <input required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={transferLastFive} onChange={(event) => { setTransferLastFive(event.target.value.replace(/\D/g, '').slice(0, 5)); setError('') }} className="apple-input min-h-12 bg-white text-lg tracking-[0.25em]" placeholder="12345" />
                    <span className="mt-2 block text-xs leading-5 text-apple-gray-500">財務會依後五碼與訂單金額核對入帳。</span>
                  </label>
                </section>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-apple-gray-700">訂單備註</span>
                  <textarea className="apple-input min-h-24 resize-y" value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder="尺寸或其他需求（選填）" />
                </label>
              </div>
            </section>

            <aside className="checkout-summary-card apple-card p-6 md:p-8 lg:sticky lg:top-28">
              <h2 className="mb-6 text-xl font-bold text-apple-gray-900">訂單摘要</h2>
              {items.length > 0 ? (
                <div className="mb-6 space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-6 text-apple-gray-900">{item.name}</h3>
                        {item.selectedSpecifications?.length ? <p className="mt-1 break-words text-sm leading-6 text-apple-gray-600">{formatSelectedSpecifications(item.selectedSpecifications, english ? toEnglishWebsiteText : undefined)}</p> : null}
                        <p className="mt-1 text-sm text-apple-gray-500">{english ? `${item.size ? `Size ${item.size} · ` : ''}Quantity ${item.quantity}` : `${item.size ? `尺寸 ${item.size} · ` : ''}數量 ${item.quantity}`}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-apple-gray-700">NT${((item.price * item.quantity) / 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-6 rounded-lg bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-600">購物車沒有商品。</div>
              )}

              <div className="mb-5 rounded-lg bg-black p-5 text-white">
                <div className="flex items-center justify-between text-sm text-white/65"><span>商品數量</span><span>{itemCount}</span></div>
                <div className="mt-3 flex items-end justify-between"><span className="text-sm text-white/65">小計</span><span className="text-2xl font-black">NT${(total / 100).toFixed(0)}</span></div>
              </div>

              <div className="mb-5 flex items-start gap-3 rounded-lg border border-black/10 bg-apple-gray-50 p-4 text-sm leading-6 text-apple-gray-700">
                <Store className="mt-0.5 h-5 w-5 shrink-0" />
	                <span>付款方式為銀行匯款，商品維持跑班自取；完成入帳核對後，團隊會另行通知取貨安排。</span>
              </div>

              {error ? <div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{error}</div> : null}

              <button type="button" onClick={submitOrder} disabled={isSubmitting || items.length === 0 || !form.customerName.trim() || !form.contact.trim() || transferLastFive.length !== 5 || !catalog || Boolean(catalogError) || optionIssues.length > 0} className="checkout-inline-submit apple-button-primary mb-3 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                <Send className="h-4 w-4" />
	                {isSubmitting ? '正在提交匯款訂單...' : '提交匯款與自取訂單'}
              </button>
              <Link href="/shop" className="apple-button-outline w-full gap-2">返回商店</Link>
            </aside>
          </div>
        </div>
      </section>

      <div className="mobile-checkout-footer" aria-label="訂單送出">
        <div><span>小計</span><strong>{'NT$' + (total / 100).toFixed(0)}</strong></div>
        <button type="button" onClick={submitOrder} disabled={isSubmitting || items.length === 0 || !form.customerName.trim() || !form.contact.trim() || transferLastFive.length !== 5 || !catalog || Boolean(catalogError) || optionIssues.length > 0} className="apple-button-primary gap-2 disabled:cursor-not-allowed disabled:opacity-60"><Send aria-hidden="true" className="h-4 w-4" />{isSubmitting ? '正在提交...' : '提交匯款與自取訂單'}</button>
      </div>
    </div>
  )
}
