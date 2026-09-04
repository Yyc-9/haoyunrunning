type AvatarFrame = { x: number; y: number; zoom: number }

// Only the original bundled portraits need this framing. Uploaded, pre-cropped
// portraits must not inherit a coach-specific zoom a second time.
const legacyAvatarFrames: Record<string, AvatarFrame> = {
  'bianbian.jpg': { x: 50, y: 34, zoom: 2.35 },
  'chen-sheng-qi.jpg': { x: 50, y: 42, zoom: 2.15 },
  'lai-xin-hong.jpg': { x: 50, y: 48, zoom: 2.15 },
  'liu-cheng-en.jpg': { x: 50, y: 36, zoom: 2.7 },
  'luo-min-yao.jpg': { x: 50, y: 50, zoom: 1 },
  'luo-pei-ci.jpg': { x: 50, y: 28, zoom: 2.15 },
  'wu-pei-ci.jpg': { x: 50, y: 48, zoom: 1.8 },
  'wu-wei-qiao.jpg': { x: 50, y: 47, zoom: 2.1 },
  'xiao-he.jpg': { x: 50, y: 50, zoom: 2.3 },
  'yang-sheng-hao.jpg': { x: 50, y: 39, zoom: 2.7 },
  'yong-xin.jpg': { x: 50, y: 42, zoom: 2.75 },
  'zheng-yi-qun.jpg': { x: 50, y: 20, zoom: 2 },
  'zhong-li-chen.jpg': { x: 50, y: 45, zoom: 2.15 },
  'zhou-xian-feng.jpg': { x: 50, y: 47, zoom: 2.05 },
}

const legacyUploadedAvatarFrames: Record<string, AvatarFrame> = {
  'https://vmnbthmssiizbsvzeahz.supabase.co/storage/v1/object/public/site-media/coaches/2026-07-25/b2ee4282-cd7b-41bb-9163-b2e3c3fb9b8e.webp': legacyAvatarFrames['luo-pei-ci.jpg'],
}

export function getCourseCoachAvatarPresentation(src: string, size = 96, focusX = 50, focusY = 50) {
  const legacyFrame = src.startsWith('/coaches/2026/avatars/')
    ? legacyAvatarFrames[src.slice('/coaches/2026/avatars/'.length)]
    : legacyUploadedAvatarFrames[src]
  const zoom = legacyFrame?.zoom ?? 1

  return {
    frameStyle: legacyFrame ? {
      width: `${zoom * 100}%`,
      height: `${zoom * 100}%`,
      left: `${50 - zoom * legacyFrame.x}%`,
      top: `${50 - zoom * legacyFrame.y}%`,
    } : { width: '100%', height: '100%', left: '0%', top: '0%' },
    objectPosition: legacyFrame ? '50% 50%' : `${focusX}% ${focusY}%`,
    // sizes describes the enlarged image, not just its visible circular window.
    sizes: `${Math.ceil(size * zoom)}px`,
  }
}
