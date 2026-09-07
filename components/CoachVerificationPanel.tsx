'use client'

type CoachVerificationPanelProps = {
  coachName: string
  status?: 'pending' | 'pending_email' | 'enabled' | 'disabled' | 'conflict'
  message?: string
}

/**
 * Kept as a compatibility export for pages that still import this component.
 * Coach access is now managed by the server-side email allowlist; this panel
 * intentionally contains no credential/code input or activation request.
 */
export default function CoachVerificationPanel({ coachName, status = 'pending', message }: CoachVerificationPanelProps) {
  if (status === 'enabled') return null
  return (
    <section className="border-t border-black/10 py-4 sm:py-8">
      <div className="rounded-lg border border-apple-blue/20 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-apple-blue">教練帳號</p>
        <h2 className="mt-1 text-lg font-black text-black">{coachName} · 待啟用</h2>
        <p className="mt-2 text-sm leading-6 text-apple-gray-600">{message || '管理員已登記這個信箱；完成信箱驗證並重新登入後，系統會自動啟用教練工作台。'}</p>
      </div>
    </section>
  )
}
