'use client'

import Link from 'next/link'
import { CreditCard, Instagram, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/app/language-context'
import BankTransferInfo from '@/components/BankTransferInfo'

type CoursePaymentInfoProps = {
  compact?: boolean
}

export default function CoursePaymentInfo({ compact = false }: CoursePaymentInfoProps) {
  const { t } = useLanguage()
  const [showBankInfo, setShowBankInfo] = useState(false)

  return (
    <section className={compact ? 'rounded-3xl border border-black/10 bg-white p-5' : 'rounded-3xl border border-black/10 bg-apple-gray-50 p-6 md:p-8'}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-apple-gray-900 shadow-sm ring-1 ring-black/10">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">{t.coursePayment.label}</p>
            <h2 className="mt-1 text-xl font-black text-apple-gray-900">{t.coursePayment.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-apple-gray-600">{t.coursePayment.description}</p>
            <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-apple-gray-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
              <span>{t.coursePayment.notice}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
          <a
            href="https://www.instagram.com/nurture.running.team/"
            target="_blank"
            rel="noreferrer"
            className="apple-button-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"
          >
            <Instagram className="h-4 w-4" />
            {t.coursePayment.instagramCta}
          </a>
          <button
            type="button"
            onClick={() => setShowBankInfo(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-bold text-apple-gray-800 shadow-sm transition hover:border-apple-blue/40 hover:text-apple-blue"
          >
            <CreditCard className="h-4 w-4" />
            {t.coursePayment.confirmCta}
          </button>
          <Link href="/payment" className="inline-flex items-center justify-center px-2 py-2.5 text-sm font-bold text-apple-gray-500 transition hover:text-apple-blue">
            {t.coursePayment.paymentCta}
          </Link>
        </div>
      </div>

      {showBankInfo ? (
        <div className="mt-6">
          <BankTransferInfo labels={t.payment.bankTransfer} />
        </div>
      ) : null}
    </section>
  )
}
