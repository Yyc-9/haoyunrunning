import { Zap } from 'lucide-react'

interface TrainingItemCardProps {
  title: string
  description: string
}

export default function TrainingItemCard({ title, description }: TrainingItemCardProps) {
  return (
    <div className="apple-card p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-apple-blue/10">
          <Zap className="h-5 w-5 text-apple-blue" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-apple-gray-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
        </div>
      </div>
    </div>
  )
}
