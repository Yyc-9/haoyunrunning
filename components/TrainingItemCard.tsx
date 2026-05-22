import { Zap } from 'lucide-react'

interface TrainingItemCardProps {
  title: string
}

export default function TrainingItemCard({ title }: TrainingItemCardProps) {
  return (
    <div className="apple-card p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-apple-blue/10">
          <Zap className="h-5 w-5 text-apple-blue" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-apple-gray-900">{title}</h3>
        </div>
      </div>
    </div>
  )
}
