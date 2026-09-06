'use client'

import Link from 'next/link'
import { BookOpen, Home, ShoppingBag, UserRound, UsersRound } from 'lucide-react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const entries = [
  { href: '/', label: '首頁', icon: Home },
  { href: '/courses', label: '課程', icon: BookOpen },
  { href: '/team', label: '團隊', icon: UsersRound },
  { href: '/shop', label: '商店', icon: ShoppingBag },
  { href: '/profile', label: '我的', icon: UserRound },
]

function isActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/' || ['/about', '/achievements', '/testimonials'].includes(pathname)
  }
  if (href === '/profile') return pathname === '/profile' || pathname.startsWith('/profile/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function MobileBottomNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname()

  if (hidden) return null

  return (
    <nav className="mobile-bottom-nav" aria-label="主要導覽">
      <div className="mobile-bottom-nav-inner">
        {entries.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx('mobile-bottom-nav-item', active && 'is-active')}
            >
              <span className="mobile-bottom-nav-icon"><Icon aria-hidden="true" /></span>
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
