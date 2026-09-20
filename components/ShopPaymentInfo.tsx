'use client'

import { useEffect, useState } from 'react'
import PaymentInfoCard, { type PaymentInfo } from '@/components/PaymentInfoCard'

export default function ShopPaymentInfo() {
  const [info, setInfo] = useState<PaymentInfo | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    fetch('/api/shop/payment-info?format=json', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '匯款資料暫時無法讀取。')
      if (active) setInfo(result)
    }).catch(() => { if (active) setError('匯款資料暫時無法讀取，請重新整理後再試。') })
    return () => { active = false }
  }, [])
  return info ? <PaymentInfoCard info={info} /> : <p role={error ? 'alert' : 'status'} className="p-4 text-sm">{error || '正在讀取匯款資料…'}</p>
}
