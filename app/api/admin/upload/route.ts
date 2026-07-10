import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const allowedTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const allowedFolders = new Set(['products', 'hero', 'activities'])

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) return json({ error: '圖片服務尚未設定。' }, { status: 500 })

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user || !(await getAdminProfile(user))) {
    return json({ error: '只有超級管理員可以上傳網站圖片。' }, { status: 403 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  const requestedFolder = String(formData?.get('folder') ?? '')
  const folder = allowedFolders.has(requestedFolder) ? requestedFolder : 'activities'

  if (!(file instanceof File)) {
    return json({ error: '請選擇要上傳的圖片。' }, { status: 400 })
  }

  const extension = allowedTypes[file.type]
  if (!extension) {
    return json({ error: '圖片僅支援 JPG、PNG 或 WebP。' }, { status: 400 })
  }

  if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
    return json({ error: '圖片大小必須小於 8 MB。' }, { status: 400 })
  }

  const path = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`
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
