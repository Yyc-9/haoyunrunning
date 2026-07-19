const youtubeIdPattern = /^[A-Za-z0-9_-]{6,20}$/

export function getYouTubeVideoId(value: string) {
  const input = value.trim()
  if (!input) return ''

  try {
    const url = new URL(input)
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase()
    let candidate = ''

    if (hostname === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] ?? ''
    } else if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      candidate = url.searchParams.get('v') ?? ''
      if (!candidate) {
        const parts = url.pathname.split('/').filter(Boolean)
        if (['embed', 'shorts', 'live'].includes(parts[0] ?? '')) {
          candidate = parts[1] ?? ''
        }
      }
    }

    return youtubeIdPattern.test(candidate) ? candidate : ''
  } catch {
    return ''
  }
}

export function getYouTubeEmbedUrl(value: string) {
  const videoId = getYouTubeVideoId(value)
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : ''
}

export function isYouTubeVideoUrl(value: string) {
  return Boolean(getYouTubeVideoId(value))
}
