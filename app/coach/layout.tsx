'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Loader2, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/app/providers'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  if (isLoading) return <div className="flex min-h-screen items-center justify-center gap-3 pt-24"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /><p role="status">正在確認教練身分</p></div>
  if (user?.role === 'coach' || user?.role === 'admin') return children
  return (
    <div className="min-h-screen bg-apple-gray-50 px-5 pb-16 pt-32">
      <section className="mx-auto max-w-xl rounded-2xl border border-black/10 bg-white p-7 text-center sm:p-10">
        <LockKeyhole aria-hidden="true" className="mx-auto h-8 w-8 text-apple-blue" />
        <h1 className="mt-5 text-2xl font-black">{user ? '此頁面需要教練權限' : '登入後使用教練工作台'}</h1>
        <p className="mt-3 text-sm leading-7 text-apple-gray-600">{user ? '請使用管理員已登記的教練帳號；若剛完成登記，請重新登入。' : '使用管理員已登記的教練信箱登入，即可繼續查看此頁。'}</p>
        <Link href={user ? '/profile' : `${pathname}?auth=login`} className="apple-button-primary mt-6 w-full">{user ? '前往我的帳戶' : '登入教練帳號'}</Link>
        <Link href="/courses" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-apple-blue">查看公開課程</Link>
      </section>
    </div>
  )
}
