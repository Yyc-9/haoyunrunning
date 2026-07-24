import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { COURSE_TERMS_VERSION, termsSections } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: '課程服務條款 - 好運跑班',
  description: '好運跑班課程報名、安全、請假補課與服務規範。',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return <LegalDocument eyebrow="COURSE TERMS" title="課程服務條款" description="報名前請閱讀課程安全、名額、請假補課及現場秩序規範。" version={COURSE_TERMS_VERSION} sections={termsSections} />
}
