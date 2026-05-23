import { ShieldCheck } from 'lucide-react'

type PaymentNoticeProps = {
  title: string
  notices: readonly string[]
}

export default function PaymentNotice({ title, notices }: PaymentNoticeProps) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 md:p-8">
      <div className="mb-4 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6" />
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      <div className="space-y-3">
        {notices.map((notice) => (
          <p key={notice} className="text-sm leading-6">
            {notice}
          </p>
        ))}
      </div>
    </section>
  )
}
