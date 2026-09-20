import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

type MobileContextHeaderProps = {
  backHref: string
  backLabel: string
  title: string
  right?: ReactNode
}

export default function MobileContextHeader({ backHref, backLabel, title, right }: MobileContextHeaderProps) {
  return (
    <header className="mobile-context-header">
      <Link href={backHref} className="mobile-context-back" aria-label={`返回${backLabel}`}>
        <ArrowLeft aria-hidden="true" />
        <span>{backLabel}</span>
      </Link>
      <p className="mobile-context-title">{title}</p>
      {right ?? <div className="mobile-context-spacer flex justify-end"><NotificationBell mobile /></div>}
    </header>
  )
}
