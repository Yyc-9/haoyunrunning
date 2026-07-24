import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { INVOICE_NOTICE_VERSION, invoiceSections } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: '電子發票說明 - 好運跑班',
  description: '好運跑班電子發票開立方式、時間與資料更正說明。',
  alternates: { canonical: '/invoice' },
}

export default function InvoicePage() {
  return <LegalDocument eyebrow="E-INVOICE" title="電子發票說明" description="款項經財務確認入帳後，才會依選擇的方式進行電子發票作業。" version={INVOICE_NOTICE_VERSION} sections={invoiceSections} />
}
