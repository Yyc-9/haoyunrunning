import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: '教練會在課程確認入帳後依報名班級自動關聯，不需手動綁定。' }, { status: 410 })
}
