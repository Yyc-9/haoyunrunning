'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export type PaymentInfo = {
  bankName: string
  bankCode: string
  accountNumber: string
  qrCodeUrl: string
}

export default function PaymentInfoCard({ info }: { info: PaymentInfo }) {
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState('')

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setMessage(`${label}已複製`)
    } catch {
      setCopied('')
      setMessage('無法自動複製，請長按下方文字選取並複製。')
    }
  }

  return (
    <section className="payment-info-card" aria-label="匯款資料">
      <h3 className="payment-info-title">PAYMENT INFO</h3>
      <p className="payment-info-subtitle">匯款資料</p>
      <div className="payment-info-body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={info.qrCodeUrl} alt="原匯款資料卡二維碼" className="payment-info-qr" />
        <dl className="payment-info-fields">
          {[
            ['銀行機構', info.bankName],
            ['銀行代碼', info.bankCode],
            ['匯款帳號', info.accountNumber],
          ].map(([label, value]) => (
            <div key={label} className="payment-info-field">
              <dt>{label}</dt>
              <dd>
                <span className="payment-info-value">{value}</span>
                <button type="button" onClick={() => void copyValue(label, value)} aria-label={`複製${label}`} className="payment-info-copy">
                  {copied === label ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                  <span>{copied === label ? '已複製' : '複製'}</span>
                </button>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="payment-info-note">匯款或網銀轉帳時，<strong>請勿填寫備註欄內容</strong>，以免影響款項核對。</p>
      <p role="status" aria-live="polite" className="payment-info-status">{message}</p>
    </section>
  )
}
