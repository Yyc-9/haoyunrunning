import { NextResponse } from 'next/server'
import { enabledSocialProviders } from '@/lib/auth-providers'

/** Public provider availability only. No client secrets or Auth settings leave this endpoint. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json({ providers: [] }, { status: 503 })
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key }, next: { revalidate: 60 }, signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error('Auth settings unavailable')
    const settings = await response.json()
    return NextResponse.json({ providers: enabledSocialProviders(settings.external ?? {}) }, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  } catch {
    return NextResponse.json({ error: '登入方式暫時無法讀取。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
