import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: '學員名單以已確認入帳的任課班級為準；請由管理員處理報名與班級設定。' }, { status: 410 })
}
