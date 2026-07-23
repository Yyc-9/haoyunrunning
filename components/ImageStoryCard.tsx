import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

type ImageStoryCardProps = {
  image: string
  imageAlt: string
  title: string
  description: string
  icon: LucideIcon
  objectPosition?: string
  compact?: boolean
}

export default function ImageStoryCard({
  image,
  imageAlt,
  title,
  description,
  icon: Icon,
  objectPosition = 'center',
  compact = false,
}: ImageStoryCardProps) {
  return (
    <article
      data-static-image-card
      className={clsx(
        'relative isolate flex overflow-hidden rounded-3xl border border-white/15 bg-black text-white shadow-sm',
        compact ? 'min-h-[18rem] sm:min-h-[20rem]' : 'min-h-[21rem] sm:min-h-[24rem]',
      )}
    >
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="(max-width: 767px) 100vw, 33vw"
        className="object-cover"
        style={{ objectPosition }}
      />
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative flex w-full flex-col justify-end p-6 sm:p-7">
        <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-black/35 backdrop-blur-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="text-xl font-black leading-snug text-white sm:text-2xl">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-white/88 sm:text-base">{description}</p>
      </div>
    </article>
  )
}
