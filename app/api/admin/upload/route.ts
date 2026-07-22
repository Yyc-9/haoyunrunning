import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'
import { getIsolatedTestAccount } from '@/lib/test-account'

export const runtime = 'nodejs'

const allowedTypes: Record<string, { extension: string; kind: 'image' | 'video'; maxSize: number }> = {
  'image/jpeg': { extension: 'jpg', kind: 'image', maxSize: 8 * 1024 * 1024 },
  'image/png': { extension: 'png', kind: 'image', maxSize: 8 * 1024 * 1024 },
  'image/webp': { extension: 'webp', kind: 'image', maxSize: 8 * 1024 * 1024 },
  'video/mp4': { extension: 'mp4', kind: 'video', maxSize: 50 * 1024 * 1024 },
  'video/webm': { extension: 'webm', kind: 'video', maxSize: 50 * 1024 * 1024 },
  'video/quicktime': { extension: 'mov', kind: 'video', maxSize: 50 * 1024 * 1024 },
}

const allowedFolders = new Set(['products', 'hero', 'activities', 'brand', 'pages', 'coaches'])

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) return json({ error: '媒體服務尚未設定。' }, { status: 500 })

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return json({ error: '請先登入。' }, { status: 401 })
  const [adminProfile, profileResult, testAccount] = await Promise.all([
    getAdminProfile(user),
    supabaseAdmin.from('profiles').select('role').eq('id', user.id).single(),
    getIsolatedTestAccount(user),
  ])
  const canUploadCoachMedia = ['coach', 'admin'].includes(profileResult.data?.role ?? '')
    || testAccount?.currentMode === 'coach'

  if (request.headers.get('content-type')?.includes('application/json')) {
    const payload = (await request.json().catch(() => null)) as {
      contentType?: string
      fileSize?: number
      folder?: string
    } | null
    const mediaType = allowedTypes[String(payload?.contentType ?? '')]
    const fileSize = Number(payload?.fileSize)
    const requestedFolder = String(payload?.folder ?? '')
    const folder = allowedFolders.has(requestedFolder) ? requestedFolder : 'activities'

    if (!adminProfile) return json({ error: '只有超級管理員可以上傳網站影片。' }, { status: 403 })

    if (!mediaType || mediaType.kind !== 'video') {
      return json({ error: '影片僅支援 MP4、WebM 或 MOV。' }, { status: 400 })
    }
    if (!['products', 'pages'].includes(folder)) {
      return json({ error: '影片只能上傳至商城商品或網站頁面。' }, { status: 400 })
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > mediaType.maxSize) {
      return json({ error: '影片大小必須小於 50 MB。' }, { status: 400 })
    }

    const path = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${mediaType.extension}`
    const { data: signedUpload, error } = await supabaseAdmin.storage.from('site-media').createSignedUploadUrl(path)
    if (error || !signedUpload?.token) {
      return json({ error: error?.message || '無法建立影片上傳憑證。' }, { status: 500 })
    }

    const { data: publicAsset } = supabaseAdmin.storage.from('site-media').getPublicUrl(path)
    return json({
      url: publicAsset.publicUrl,
      path,
      token: signedUpload.token,
      message: '影片上傳憑證已建立。',
    })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  const requestedFolder = String(formData?.get('folder') ?? '')
  const folder = allowedFolders.has(requestedFolder) ? requestedFolder : 'activities'

  if (folder === 'coaches' ? !canUploadCoachMedia : !adminProfile) {
    return json({ error: folder === 'coaches' ? '目前帳號沒有教練媒體上傳權限。' : '只有超級管理員可以上傳網站媒體。' }, { status: 403 })
  }

  if (!(file instanceof File)) {
    return json({ error: '請選擇要上傳的圖片。' }, { status: 400 })
  }

  const mediaType = allowedTypes[file.type]
  if (!mediaType || mediaType.kind !== 'image') {
    return json({ error: '圖片僅支援 JPG、PNG 或 WebP。' }, { status: 400 })
  }

  const maxImageSize = folder === 'coaches' ? 15 * 1024 * 1024 : mediaType.maxSize
  if (file.size <= 0 || file.size > maxImageSize) {
    return json({ error: `圖片大小必須小於 ${folder === 'coaches' ? 15 : 8} MB。` }, { status: 400 })
  }

  const storageFolder = testAccount && folder === 'coaches' ? `test-accounts/${user.id}` : folder
  const path = `${storageFolder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${mediaType.extension}`
  const bytes = Buffer.from(await file.arrayBuffer())
  const { error } = await supabaseAdmin.storage.from('site-media').upload(path, bytes, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })

  if (error) return json({ error: error.message || '圖片上傳失敗。' }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('site-media').getPublicUrl(path)
  return json({ url: data.publicUrl, path, message: '圖片已上傳。' })
}
