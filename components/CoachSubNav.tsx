'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, LayoutDashboard, UsersRound } from 'lucide-react'

const coachNavItems = [
  { href: '/coach', label: '工作台', icon: LayoutDashboard },
  { href: '/coach/students', label: '學員列表', icon: UsersRound },
  { href: '/coach/signups', label: '團練報名', icon: ClipboardList },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/coach') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function CoachSubNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="教練端內部導航" className="mb-5 -mx-4 overflow-x-auto px-4 sm:mb-8 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1.5 rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-black/10">
        {coachNavItems.map((item) => {
          const active = isActivePath(pathname, item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition sm:px-4 ${
                active
                  ? 'bg-black text-white shadow-sm'
                  : 'text-apple-gray-600 hover:bg-apple-gray-100 hover:text-apple-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
