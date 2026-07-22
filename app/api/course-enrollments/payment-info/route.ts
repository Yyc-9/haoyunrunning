import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCourseSeason } from '@/lib/course-seasons-server'
import { verifyCourseQuoteToken } from '@/lib/course-pricing-token'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user?.email) {
    return NextResponse.json({ error: '請先登入後再查看匯款資料。' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    courseSlug?: string
    quoteToken?: string
  }
  const courseSlug = cleanText(body.courseSlug, 120)
  const quoteToken = cleanText(body.quoteToken, 12_000)
  const season = await getCurrentCourseSeason({ forEnrollment: true })
  if (!season || !season.courseOfferingIds[courseSlug]) {
    return NextResponse.json({ error: '目前無法提供這個課程的匯款資料。' }, { status: 404 })
  }

  const email = user.email.trim().toLowerCase()
  const quote = quoteToken ? verifyCourseQuoteToken(quoteToken) : null
  const hasValidQuote = Boolean(
    quote
      && quote.email === email
      && quote.courseSlug === courseSlug
      && quote.seasonId === season.id
      && new Date(quote.quote.lockedUntil).getTime() > Date.now()
  )

  let hasEnrollment = false
  if (!hasValidQuote) {
    const { data, error } = await supabaseAdmin
      .from('signup_leads')
      .select('id')
      .eq('source', 'course_payment')
      .eq('season_id', season.id)
      .eq('course_slug', courseSlug)
      .eq('email', email)
      .in('status', ['pending_transfer', 'pending_review', 'approved', 'rejected'])
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: '匯款資料權限核對失敗。' }, { status: 500 })
    }
    hasEnrollment = Boolean(data)
  }

  if (!hasValidQuote && !hasEnrollment) {
    return NextResponse.json({ error: '完成課程資料與費用確認後，才可查看匯款資料。' }, { status: 403 })
  }

  try {
    const image = await readFile(join(process.cwd(), 'private/course-registration/payment-info.jpg'))
    return new NextResponse(new Uint8Array(image), {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': 'inline; filename="payment-info.jpg"',
        'Content-Type': 'image/jpeg',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: '匯款資料圖片目前無法讀取。' }, { status: 500 })
  }
}
