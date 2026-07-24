import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { REFUND_POLICY_VERSION, refundSections } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: '取消與退費政策 - 好運跑班',
  description: '好運跑班課程取消、退費與不可抗力處理說明。',
  alternates: { canonical: '/refund-policy' },
}

export default function RefundPolicyPage() {
  return <LegalDocument eyebrow="CANCELLATION & REFUND" title="取消與退費政策" description="退費會依申請時間、已進行課次與報名價格快照核對。" version={REFUND_POLICY_VERSION} sections={refundSections} />
}
