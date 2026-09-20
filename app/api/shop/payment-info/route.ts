import { getPaymentDisplay, paymentDisplayImage } from '@/lib/payment-display-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get('format') === 'json') return NextResponse.json((await getPaymentDisplay()).info, { headers: { 'Cache-Control': 'private, no-store' } })
    const image = await paymentDisplayImage()
    return new NextResponse(image.bytes, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': `inline; filename="${image.filename}"`,
        'Content-Type': image.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: '匯款資料圖片目前無法讀取。' }, { status: 500 })
  }
}
