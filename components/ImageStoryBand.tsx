import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'

type ImageStoryBandItem = {
  title: string
  description: string
  icon: LucideIcon
}

type ImageStoryBandProps = {
  image: string
  imageAlt: string
  items: ImageStoryBandItem[]
  objectPosition?: string
}

export default function ImageStoryBand({
  image,
  imageAlt,
  items,
  objectPosition = 'center',
}: ImageStoryBandProps) {
  return (
    <section
      data-static-image-band
      aria-label={items.map((item) => item.title).join('、')}
      className="relative isolate overflow-hidden bg-black text-white"
    >
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="(max-width: 767px) 100vw, 1200px"
        className="object-cover"
        style={{ objectPosition }}
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />

      <div className="relative grid min-h-[32rem] md:min-h-[25rem] md:grid-cols-3">
        {items.map(({ title, description, icon: Icon }, index) => (
          <article
            key={title}
            className="flex min-h-[15rem] flex-col justify-end border-t border-white/25 px-6 py-8 first:border-t-0 md:min-h-0 md:border-l md:border-t-0 md:px-8 md:py-10 md:first:border-l-0"
          >
            <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-black/35">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-xs font-black tabular-nums tracking-[0.22em] text-white/65">
              {String(index + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-3 text-xl font-black leading-snug text-white sm:text-2xl">{title}</h3>
            <p className="mt-3 max-w-sm text-sm leading-7 text-white/85 sm:text-base">{description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
