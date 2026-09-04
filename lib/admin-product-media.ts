import { supabase } from '@/lib/supabase'

export async function uploadProductMedia(file: File, mediaKind: 'image' | 'video') {
  if (!supabase) throw new Error('媒體服務尚未設定。')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('請重新登入管理員帳號。')

  if (mediaKind === 'video') {
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: file.type, fileSize: file.size, folder: 'products' }),
    })
    const signed = (await response.json().catch(() => ({}))) as { url?: string; path?: string; token?: string; error?: string }
    if (!response.ok || !signed.url || !signed.path || !signed.token) throw new Error(signed.error || '無法建立影片上傳憑證。')
    const { error } = await supabase.storage.from('site-media').uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type, cacheControl: '31536000',
    })
    if (error) throw new Error(error.message || '影片上傳失敗。')
    return signed.url
  }

  const body = new FormData()
  body.set('file', file)
  body.set('folder', 'products')
  const response = await fetch('/api/admin/upload', {
    method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body,
  })
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!response.ok || !payload.url) throw new Error(payload.error || '圖片上傳失敗。')
  return payload.url
}
