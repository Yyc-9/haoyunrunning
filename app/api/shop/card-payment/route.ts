import { NextResponse } from 'next/server'

/**
 * 商城目前只提供跑班自取。
 * 保留路由以便舊客戶收到明確結果，但不建立任何線上付款工作階段。
 */
export async function POST() {
  return NextResponse.json(
    { error: '商城目前僅提供跑班自取，未開放線上付款。' },
    { status: 410 }
  )
}
