'use client'

import { AlertTriangle, BadgeDollarSign, Building2, CreditCard } from 'lucide-react'
import { useLanguage } from '@/app/language-context'

type CoursePaymentInfoProps = {
  compact?: boolean
}

export default function CoursePaymentInfo({ compact = false }: CoursePaymentInfoProps) {
  const { t } = useLanguage()

  return (
    <section className={compact ? 'rounded-3xl bg-apple-gray-100 p-5' : 'apple-card p-6 md:p-8'}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
          <BadgeDollarSign className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-apple-gray-500">{t.coursePayment.label}</p>
          <h2 className="text-xl font-black text-apple-gray-900">{t.coursePayment.title}</h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {t.coursePayment.prices.map((item) => (
          <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/10">
            <p className="text-xs font-semibold text-apple-gray-500">{item.label}</p>
            <p className="mt-1 text-lg font-black text-apple-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-apple-gray-700" />
          <h3 className="font-bold text-apple-gray-900">{t.coursePayment.bankTitle}</h3>
        </div>
        <div className="space-y-3">
          {t.coursePayment.bankRows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-black/10 pb-3 last:border-b-0 last:pb-0">
              <span className="text-sm text-apple-gray-500">{label}</span>
              <span className="text-right font-bold text-apple-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-3xl bg-amber-50 p-4 text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm leading-6">
          {t.coursePayment.warning}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-apple-gray-600">
        <CreditCard className="h-4 w-4" />
        {t.coursePayment.gatewayNote}
      </div>
    </section>
  )
}
