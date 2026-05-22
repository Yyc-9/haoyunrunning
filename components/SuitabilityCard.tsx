import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface SuitabilityCardProps {
  type: 'suitable' | 'notSuitable'
  title: string
  items: string[]
}

export default function SuitabilityCard({ type, title, items }: SuitabilityCardProps) {
  const isPositive = type === 'suitable'
  const Icon = isPositive ? ThumbsUp : ThumbsDown
  const bgColor = isPositive ? 'bg-green-50' : 'bg-orange-50'
  const borderColor = isPositive ? 'border-green-100' : 'border-orange-100'
  const textColor = isPositive ? 'text-green-700' : 'text-orange-700'
  const iconColor = isPositive ? 'text-green-600' : 'text-orange-600'

  return (
    <div className={`apple-card rounded-3xl border p-6 md:p-8 ${bgColor} ${borderColor}`}>
      <div className="mb-5 flex items-center gap-3">
        <Icon className={`h-6 w-6 ${iconColor}`} />
        <h3 className={`text-xl font-bold ${textColor}`}>{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${iconColor}`} />
            <span className={`text-sm leading-6 ${textColor}`}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
