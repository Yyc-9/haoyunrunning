import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * 商城尚未啟用線上付款，因此不接受信用卡 webhook。
 * 課程報名的銀行匯款核對不經過此路由。
 */
export async function POST() {
  return NextResponse.json(
    { error: '商城目前僅提供跑班自取，未開放線上付款。' },
    { status: 410 }
  )
}
