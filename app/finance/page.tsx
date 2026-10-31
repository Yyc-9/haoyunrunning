'use client'

import { useState } from 'react'
import { useAuth } from '@/app/providers'
import AuthModal from '@/components/AuthModal'
import AdminBankReconciliation from '@/components/admin/AdminBankReconciliation'
import { isFinanceViewer } from '@/lib/finance-viewers'

export default function FinancePage() {
  const { user, isLoading } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [workspace, setWorkspace] = useState<'course' | 'shop'>('course')

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-32 sm:px-6 [&_.apple-card]:!transform-none">
      <h1 className="mb-3 text-2xl font-black">財務對帳</h1>
      <p className="mb-6 text-sm text-apple-gray-500">登入並輸入財務密碼後，可分別核對課程報名與商城匯款。</p>
      {isLoading ? <p role="status">正在確認登入狀態…</p> : !user ? (
        <button className="apple-button-primary" onClick={() => setLoginOpen(true)}>登入財務帳號</button>
      ) : isFinanceViewer(user.email) || user.role === 'admin' ? (
        <>
          <div className="finance-entries" role="tablist" aria-label="對帳入口">
            <button role="tab" aria-selected={workspace === 'course'} onClick={() => setWorkspace('course')}><strong>課程對帳</strong><small>報名費用、銀行明細與繳費紀錄</small></button>
            <button role="tab" aria-selected={workspace === 'shop'} onClick={() => setWorkspace('shop')}><strong>商城對帳</strong><small>商品訂單、匯款資料與入帳確認</small></button>
          </div>
          <AdminBankReconciliation key={user.id} paymentAccounts={[]} workspace={workspace} />
        </>
      ) : <p role="alert">目前帳號沒有銀行對帳查閱權限。請從「我的帳戶」登出，再使用獲授權的帳號登入。</p>}
      <AuthModal isOpen={loginOpen && !user} onClose={() => setLoginOpen(false)} />
    </main>
  )
}
