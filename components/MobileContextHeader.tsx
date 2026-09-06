import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
      {right ?? <span className="mobile-context-spacer" aria-hidden="true" />}
    </header>
  )
}
