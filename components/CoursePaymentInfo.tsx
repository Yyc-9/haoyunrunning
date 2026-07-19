'use client'

import Link from 'next/link'
import { Instagram, ShieldCheck, TicketCheck } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

type CoursePaymentInfoProps = {
  compact?: boolean
}

export default function CoursePaymentInfo({ compact = false }: CoursePaymentInfoProps) {
  const { brand } = useSiteContent()

  return (
    <section className={compact ? 'rounded-3xl border border-black/10 bg-white p-5' : 'rounded-3xl border border-black/10 bg-apple-gray-50 p-6 md:p-8'}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-apple-gray-900 shadow-sm ring-1 ring-black/10">
            <TicketCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">本期報名</p>
            <h2 className="mt-1 text-xl font-black text-apple-gray-900">選擇班級，直接完成官方報名</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-apple-gray-600">每一門課程都已連接當期正式報名表，費用、名額與注意事項以各班報名頁為準。</p>
            <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-apple-gray-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
              <span>送出前請再次確認上課城市、星期與課程日期。</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
          <Link
            href="/courses"
            className="apple-button-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"
          >
            <TicketCheck className="h-4 w-4" />
            前往報名入口
          </Link>
          <a
            href={brand.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-bold text-apple-gray-800 shadow-sm transition hover:border-apple-blue/40 hover:text-apple-blue"
          >
            <Instagram className="h-4 w-4" />
            課程諮詢
          </a>
        </div>
      </div>

    </section>
  )
}
