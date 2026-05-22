import { CheckCircle2 } from 'lucide-react'

interface BenefitItemProps {
  text: string
}

export default function BenefitItem({ text }: BenefitItemProps) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-apple-blue" />
      <p className="text-sm leading-6 text-apple-gray-700">{text}</p>
    </div>
  )
}
