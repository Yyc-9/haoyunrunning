import { NextResponse } from 'next/server'
import { getPublicSiteContent } from '@/lib/public-site-content-server'

export const dynamic = 'force-dynamic'
const headers = {
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
}

export async function GET() {
  try {
    return NextResponse.json(await getPublicSiteContent(), { headers })
  } catch (error) {
    console.error('Load published site content failed:', error)
    return NextResponse.json({ error: '網站內容暫時無法更新，請稍後重試。' }, { status: 503, headers })
  }
}
