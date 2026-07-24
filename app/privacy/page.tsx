import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { PRIVACY_POLICY_VERSION, privacySections } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: '隱私權政策 - 好運跑班',
  description: '了解好運跑班如何收集、使用、保存與保護會員及課程資料。',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return <LegalDocument eyebrow="PRIVACY POLICY" title="隱私權政策" description="我們只在提供課程、會員、帳務與商品服務所需的範圍內使用資料。" version={PRIVACY_POLICY_VERSION} sections={privacySections} />
}
