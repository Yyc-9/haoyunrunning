'use client'

import { useState } from 'react'
import { useAuth } from '@/app/providers'
import AuthModal from '@/components/AuthModal'
import AdminBankReconciliation from '@/components/admin/AdminBankReconciliation'
import { isFinanceViewer } from '@/lib/finance-viewers'

export default function FinancePage() {
  const { user, isLoading } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-32 sm:px-6">
      <h1 className="mb-3 text-2xl font-black">銀行對帳 · 財務查閱</h1>
      <p className="mb-6 text-sm text-apple-gray-500">此入口僅提供銀行對帳資料查閱。請使用獲授權的信箱登入，再輸入財務密碼。</p>
      {isLoading ? <p role="status">正在確認登入狀態…</p> : !user ? (
        <button className="apple-button-primary" onClick={() => setLoginOpen(true)}>登入財務帳號</button>
      ) : isFinanceViewer(user.email) || user.role === 'admin' ? (
        <AdminBankReconciliation key={user.id} paymentAccounts={[]} readOnly />
      ) : <p role="alert">目前帳號沒有銀行對帳查閱權限。請從「我的帳戶」登出，再使用獲授權的帳號登入。</p>}
      <AuthModal isOpen={loginOpen && !user} onClose={() => setLoginOpen(false)} />
    </main>
  )
}
