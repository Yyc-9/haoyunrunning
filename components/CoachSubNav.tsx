'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, LayoutDashboard, NotebookPen, UsersRound } from 'lucide-react'

const coachNavItems = [
  { href: '/coach', label: '工作台', icon: LayoutDashboard },
  { href: '/coach/students', label: '学员列表', icon: UsersRound },
  { href: '/coach/planner', label: '课表面板', icon: NotebookPen },
  { href: '/coach/signups', label: '报名资料', icon: ClipboardList },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/coach') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function CoachSubNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="教练端内部导航" className="mb-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-2 rounded-3xl bg-white/85 p-2 shadow-sm ring-1 ring-black/10 backdrop-blur">
        {coachNavItems.map((item) => {
          const active = isActivePath(pathname, item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
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
