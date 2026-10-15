'use client'

import Image from 'next/image'
import { PlayCircle } from 'lucide-react'
import { useState } from 'react'

/** Do not give the browser a video source until the visitor chooses to play. */
export default function OnDemandVideo({ src, poster, label, className = '', sizes = '100vw' }: {
  src: string
  poster?: string
  label: string
  className?: string
  sizes?: string
}) {
  const [playingSource, setPlayingSource] = useState<string | null>(null)
  if (playingSource === src) return (
    <video key={src} src={src} controls autoPlay playsInline preload="none" aria-label={label} className={className} />
  )
  return (
    <button type="button" onClick={() => setPlayingSource(src)} aria-label={label}
      className={`relative block overflow-hidden bg-black text-white ${className}`}>
      {poster ? <Image src={poster} alt="" fill sizes={sizes} className="object-contain" /> : null}
      <span className="absolute inset-0 flex items-center justify-center bg-black/20">
        <PlayCircle className="h-16 w-16 drop-shadow-lg" aria-hidden="true" />
      </span>
    </button>
  )
}
