import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
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
