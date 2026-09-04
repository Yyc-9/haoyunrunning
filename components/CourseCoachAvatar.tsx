import Image from 'next/image'
import { UsersRound } from 'lucide-react'
import { getCourseCoachAvatarPresentation } from '@/lib/course-coach-avatar'

type CourseCoachAvatarProps = {
  src?: string
  name: string
  size?: number
  focusX?: number
  focusY?: number
}

export default function CourseCoachAvatar({ src, name, size = 96, focusX = 50, focusY = 50 }: CourseCoachAvatarProps) {
  const presentation = getCourseCoachAvatarPresentation(src ?? '', size, focusX, focusY)

  return (
    <div className="relative shrink-0 overflow-hidden rounded-full bg-apple-gray-100 ring-1 ring-black/10" style={{ width: size, height: size }}>
      {src ? (
        <div className="absolute" style={presentation.frameStyle}>
          <Image
            src={src}
            alt={`${name}課程頭像`}
            fill
            sizes={presentation.sizes}
            quality={90}
            className="object-cover"
            style={{ objectPosition: presentation.objectPosition }}
          />
        </div>
      ) : (
        <UsersRound aria-hidden="true" className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-apple-gray-400" />
      )}
    </div>
  )
}
