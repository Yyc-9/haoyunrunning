import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { INVOICE_NOTICE_VERSION, invoiceSections } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: '電子發票說明 - 好運跑班',
  description: '好運跑班發票與憑證方式、資料更正與正式上線前確認事項。',
  alternates: { canonical: '/invoice' },
}

export default function InvoicePage() {
  return <LegalDocument eyebrow="INVOICE NOTICE" title="發票與憑證說明" description="網站會依經營主體與實際發票資格公告可提供的合法憑證方式；目前尚未承諾一定開立電子發票。" version={INVOICE_NOTICE_VERSION} sections={invoiceSections} />
}
