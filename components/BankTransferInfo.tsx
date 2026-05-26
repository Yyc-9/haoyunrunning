import { Building2, CircleDollarSign, Landmark, MessageSquareText, UserRound } from 'lucide-react'
import { bankTransferDetails } from '@/lib/payment'

type BankTransferLabels = {
  title: string
  description: string
  accountName: string
  bankName: string
  bankCode: string
  accountNumber: string
  amountNote: string
  paymentMemo: string
  footer: string
}

type BankTransferInfoProps = {
  labels: BankTransferLabels
}

export default function BankTransferInfo({ labels }: BankTransferInfoProps) {
  const rows = [
    { label: labels.accountName, value: bankTransferDetails.accountName, icon: UserRound },
    { label: labels.bankName, value: bankTransferDetails.bankName, icon: Landmark },
    { label: labels.bankCode, value: bankTransferDetails.bankCode, icon: Building2 },
    { label: labels.accountNumber, value: bankTransferDetails.accountNumber, icon: CircleDollarSign },
    { label: labels.amountNote, value: bankTransferDetails.amountNote, icon: CircleDollarSign },
    { label: labels.paymentMemo, value: bankTransferDetails.paymentMemo, icon: MessageSquareText },
  ]

  return (
    <section className="rounded-3xl border border-apple-blue/20 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">Bank transfer</p>
        <h3 className="mt-1 text-2xl font-black text-apple-gray-900">{labels.title}</h3>
        <p className="mt-2 text-sm leading-6 text-apple-gray-600">{labels.description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const Icon = row.icon

          return (
            <div key={row.label} className="rounded-2xl border border-black/10 bg-apple-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-apple-gray-500">
                <Icon className="h-4 w-4 text-apple-blue" />
                {row.label}
              </div>
              <p className="break-words text-sm font-bold leading-6 text-apple-gray-900">{row.value}</p>
            </div>
          )
        })}
      </div>

      <p className="mt-4 rounded-2xl bg-apple-blue/10 px-4 py-3 text-sm leading-6 text-apple-gray-700">{labels.footer}</p>
    </section>
  )
}
