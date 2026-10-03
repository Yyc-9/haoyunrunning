import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export type CoachAccountState = {
  status: 'pending' | 'pending_email' | 'enabled' | 'disabled' | 'conflict'
  coachKey: string
  coachName: string
  message?: string
}

const states = {
  enabled: { label: '已啟用', message: '教練認證已完成，可直接進入教練工作台。' },
  pending: { label: '待啟用', message: '教練帳號已登記，尚未完成啟用；若已驗證信箱並重新登入仍未啟用，請聯絡管理員。' },
  pending_email: { label: '待驗證信箱', message: '請先完成登記信箱驗證，驗證後重新登入即可啟用教練帳號。' },
  disabled: { label: '已停用', message: '此教練帳號已由管理員停用，如需協助請聯絡管理員。' },
  conflict: { label: '身份待確認', message: '教練身份或登入信箱與其他帳號衝突，請聯絡管理員處理。' },
} satisfies Record<CoachAccountState['status'], { label: string; message: string }>

export default function CoachAccountStatus({ account }: { account: CoachAccountState }) {
  const state = states[account.status]
  const enabled = account.status === 'enabled'
  const warning = account.status === 'disabled' || account.status === 'conflict'
  return (
    <section role="status" className={`mt-5 rounded-lg border p-4 sm:mt-8 sm:p-5 ${enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : warning ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-apple-blue/20 bg-white text-black'}`}>
      <p className={`text-xs font-black uppercase tracking-[0.16em] ${enabled ? 'text-emerald-700' : warning ? 'text-amber-700' : 'text-apple-blue'}`}>教練帳號</p>
      <h2 className="mt-1 text-lg font-black">{account.coachName} · {state.label}</h2>
      <p className="mt-2 text-sm leading-6 text-apple-gray-600">{enabled ? state.message : account.message || state.message}</p>
      {enabled && <Link href="/coach" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-bold text-white hover:bg-apple-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">進入教練工作台<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
    </section>
  )
}
