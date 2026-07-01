interface EnrollmentStepProps {
  number: number
  title: string
  description: string
}

export default function EnrollmentStep({ number, title, description }: EnrollmentStepProps) {
  return (
    <div className="relative pb-8 pl-10 md:pl-16">
      {/* 竖線 */}
      <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-apple-blue/20 md:left-6" />

      {/* 圓形步骤號 */}
      <div className="absolute -left-1.5 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-apple-blue text-xs font-bold text-white md:h-12 md:w-12 md:text-base">
        {number}
      </div>

      {/* 內容 */}
      <div>
        <h3 className="font-bold text-apple-gray-900 md:text-lg">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
      </div>
    </div>
  )
}
